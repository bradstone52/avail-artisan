import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ─── Document Extraction ───────────────────────────────────────────────────────
// Process documents one at a time, with a hard cap per file to stay within limits

async function extractDocumentText(underwritingId: string): Promise<string> {
  const admin = getAdminClient()
  const { data: docs } = await admin
    .from('underwriting_documents')
    .select('*')
    .eq('underwriting_id', underwritingId)

  if (!docs || docs.length === 0) return ''

  const lovableKey = Deno.env.get('LOVABLE_API_KEY')!
  const extractedParts: string[] = []

  for (const doc of docs) {
    try {
      const { data: fileData, error: dlError } = await admin.storage
        .from('underwriting-docs')
        .download(doc.storage_path)

      if (dlError || !fileData) {
        extractedParts.push(`[${doc.document_type}: ${doc.file_name} - download failed]`)
        continue
      }

      const fileName = doc.file_name.toLowerCase()

      // Plain text files — just read directly
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await fileData.text()
        extractedParts.push(`=== ${doc.document_type.toUpperCase()}: ${doc.file_name} ===\n${text.substring(0, 12000)}`)
        continue
      }

      // Binary files — cap at 8MB to avoid OOM, then send to Gemini Flash (faster/cheaper)
      const arrayBuffer = await fileData.arrayBuffer()
      if (arrayBuffer.byteLength > 8 * 1024 * 1024) {
        extractedParts.push(`[${doc.document_type}: ${doc.file_name} - file exceeds 8MB limit, skipped]`)
        continue
      }

      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
      }
      const base64 = btoa(binary)

      let mimeType = 'application/pdf'
      if (fileName.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      else if (fileName.endsWith('.xls')) mimeType = 'application/vnd.ms-excel'
      else if (fileName.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      // Use Gemini Flash for extraction (faster, less resource-heavy)
      const geminiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          temperature: 0.0,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract ALL structured data from this ${doc.document_type} document into plain text. For rent rolls: list every tenant row (tenant name, unit, SF, start date, expiry, rent/SF, monthly rent, lease type). For financials: list all income and expense line items with amounts. Be complete and concise.`,
              },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          }],
        }),
      })

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json()
        const extracted = geminiData.choices?.[0]?.message?.content || ''
        extractedParts.push(`=== ${doc.document_type.toUpperCase()}: ${doc.file_name} ===\n${extracted}`)
      } else {
        const errText = await geminiRes.text()
        console.error(`Gemini extraction failed for ${doc.file_name}:`, errText)
        extractedParts.push(`[${doc.document_type}: ${doc.file_name} - extraction failed: ${errText.substring(0, 200)}]`)
      }
    } catch (err) {
      console.error(`Error processing ${doc.file_name}:`, err)
      extractedParts.push(`[${doc.document_type}: ${doc.file_name} - error: ${String(err)}]`)
    }
  }

  return extractedParts.join('\n\n')
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

function buildPhase1Prompt(ctx: Record<string, unknown>, documentContent: string) {
  const hasDocuments = documentContent.trim().length > 0
  return {
    system: `You are an expert commercial real estate underwriting analyst specializing in Calgary industrial properties. Extract and structure tenant and lease data precisely from provided documents. Always use actual data from documents — never fabricate or estimate when real data is available. Return ONLY valid JSON with no markdown fences.`,
    user: `We are underwriting an industrial property in ${ctx.submarket} Calgary.
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf ? ctx.building_size_sf + ' SF' : 'Unknown'}

${hasDocuments ? `UPLOADED DOCUMENTS:\n${documentContent}\n\nExtract ALL tenant data from the above documents. Use real figures from the rent roll and leases.` : 'No documents uploaded — create a placeholder single-tenant structure based on building size.'}

Return ONLY a JSON object (no markdown, no commentary):
{"tenants_table":[{"tenant_name":"","unit":"","square_feet":0,"lease_start_date":"","lease_expiry_date":"","base_rent_psf":0,"base_rent_monthly":0,"lease_type":"NNN","rent_escalations":"","options_to_renew":"","notable_clauses":""}],"summary_metrics":{"total_occupied_sf":0,"total_vacant_sf":0,"occupancy_rate":0,"vacancy_rate":0,"walt_years":0},"rollover_schedule":[{"year":2025,"sf_expiring":0,"pct_building":0}],"red_flags":[""]}
All numbers are plain numbers. Occupancy/vacancy as percentages (e.g. 95.2). WALT in decimal years.`,
  }
}

function buildPhase2Prompt(ctx: Record<string, unknown>, phase1Data: unknown, documentContent: string) {
  const tenantSummary = phase1Data ? JSON.stringify((phase1Data as Record<string, unknown>).summary_metrics) : 'Not yet analyzed'
  const hasDocuments = documentContent.trim().length > 0
  return {
    system: `You are a commercial real estate financial analyst. Build accurate income statements from actual operating documents when provided. Use Calgary-specific benchmarks for estimates. Return ONLY valid JSON with no markdown fences.`,
    user: `Industrial property in ${ctx.submarket} Calgary: ${ctx.property_name}, ${ctx.address}
Building: ${ctx.building_size_sf ? ctx.building_size_sf + ' SF' : 'Unknown'}
Tenancy: ${tenantSummary}
Ask Price: ${ctx.proposed_ask_price ? '$' + ctx.proposed_ask_price : 'Not set'}

${hasDocuments ? `FINANCIAL DOCUMENTS:\n${documentContent}\n\nUse actual figures from these documents.` : ''}

Return ONLY JSON:
{"income_statements":{"year1":{"gross_potential_income":0,"vacancy_credit_loss":0,"effective_gross_income":0,"property_taxes":0,"insurance":0,"management_fee":0,"maintenance_repairs":0,"utilities":0,"other_opex":0,"total_operating_expenses":0,"net_operating_income":0},"year2":{"gross_potential_income":0,"vacancy_credit_loss":0,"effective_gross_income":0,"property_taxes":0,"insurance":0,"management_fee":0,"maintenance_repairs":0,"utilities":0,"other_opex":0,"total_operating_expenses":0,"net_operating_income":0}},"ratios":{"year1_opex_ratio":0,"year2_opex_ratio":0,"noi_trend":""},"health_bullets":[""],"unusual_items":[""],"dd_questions":[""]}`,
  }
}

function buildPhase3Prompt(ctx: Record<string, unknown>, phase1Data: unknown) {
  const tenants = phase1Data ? JSON.stringify((phase1Data as Record<string, unknown>).tenants_table) : '[]'
  return {
    system: `You specialize in Calgary industrial market analysis. Provide concise market context grounded in current Calgary industrial fundamentals. Return ONLY valid JSON.`,
    user: `Industrial property: ${ctx.building_size_sf || 'unknown'} SF in ${ctx.submarket} Calgary.
Property: ${ctx.property_name}, ${ctx.address}, Year Built: ${ctx.year_built || 'Unknown'}
Tenants: ${tenants}

Analyze: vacancy, rent direction, demand drivers, new supply in ${ctx.submarket}. Compare in-place rents to market.

Return ONLY JSON:
{"market_summary_text":"","market_rent_range":{"low":0,"high":0,"notes":""},"tenant_rent_comparison":[{"tenant_name":"","in_place_psf":0,"market_psf":0,"position":"below_market"}],"positioning_options":[{"label":"","description":""}]}`,
  }
}

function buildPhase4Prompt(ctx: Record<string, unknown>, phase2Data: unknown) {
  const noi = phase2Data ? (phase2Data as Record<string, Record<string, Record<string, number>>>).income_statements?.year1?.net_operating_income : null
  return {
    system: `You are a conservative CRE analyst. Propose valuation ranges for Calgary industrial assets using current market cap rates. Return ONLY valid JSON.`,
    user: `Calgary industrial property in ${ctx.submarket}: ${ctx.property_name}, ${ctx.building_size_sf || 'Unknown'} SF, Year Built: ${ctx.year_built || 'Unknown'}
NOI: ${noi ? '$' + noi : 'TBD'}, Ask Price: ${ctx.proposed_ask_price ? '$' + ctx.proposed_ask_price : 'Not set'}

Build valuation scenarios for cap rates 5.0%–8.0% in 0.25% increments.

Return ONLY JSON:
{"valuation_table":[{"cap_rate":0,"value_current_noi":0,"value_stabilized_noi":0}],"likely_cap_band":{"low":0,"high":0,"rationale":""},"value_band":{"low":0,"high":0},"pricing_commentary":""}`,
  }
}

function buildPhase5Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 500) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 300) : 'N/A'
  return {
    system: `You write concise risk and upside lists for CRE investment memos. Be specific to Calgary industrial. Return ONLY valid JSON.`,
    user: `Risks and opportunities for: ${ctx.property_name} in ${ctx.submarket}, ${ctx.building_size_sf || 'Unknown'} SF, Year Built: ${ctx.year_built || 'Unknown'}
Tenancy: ${p1}
Market: ${p3}

Provide 4-7 risks and 4-7 opportunities.
Return ONLY JSON: {"risks":[""],"opportunities":[""]}`,
  }
}

function buildPhase6Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 600) : 'N/A'
  const p2 = allPhaseData[2] ? JSON.stringify(allPhaseData[2]).substring(0, 600) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 400) : 'N/A'
  const p4 = allPhaseData[4] ? JSON.stringify(allPhaseData[4]).substring(0, 400) : 'N/A'
  const p5 = allPhaseData[5] ? JSON.stringify(allPhaseData[5]).substring(0, 400) : 'N/A'
  return {
    system: `You draft internal investment memos for a commercial brokerage. Tone: professional, concise, Calgary-specific.`,
    user: `Draft internal investment memo for:
${ctx.property_name} | ${ctx.address}, ${ctx.submarket} Calgary
${ctx.building_size_sf || 'Unknown'} SF | Built: ${ctx.year_built || 'Unknown'} | Land: ${ctx.land_size_ac || 'Unknown'} ac | Ask: ${ctx.proposed_ask_price ? '$' + Number(ctx.proposed_ask_price).toLocaleString() : 'TBD'}

Tenancy: ${p1}
Financials: ${p2}
Market: ${p3}
Valuation: ${p4}
Risks/Opps: ${p5}

Headings: ## Executive Summary, ## Property Details, ## Market Overview, ## Financial Performance, ## Investment Rationale, ## Risk Factors, ## Recommendation
Return as markdown.`,
  }
}

function buildPhase7Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 500) : 'N/A'
  const p2 = allPhaseData[2] ? JSON.stringify(allPhaseData[2]).substring(0, 400) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 400) : 'N/A'
  return {
    system: `You draft marketing copy for industrial offering memorandums. Tone: confident, data-driven, professional.`,
    user: `OM marketing copy for:
${ctx.property_name} | ${ctx.address}, ${ctx.submarket} Calgary | ${ctx.building_size_sf || 'Unknown'} SF | Built: ${ctx.year_built || 'Unknown'}
Ask: ${ctx.proposed_ask_price ? '$' + Number(ctx.proposed_ask_price).toLocaleString() : 'TBD'}
Tenancy: ${p1}
Financials: ${p2}
Market: ${p3}

Sections: ## Executive Summary, ## Location & Market, ## Property Features, ## Tenancy Overview, ## Financial Summary, ## Investment Highlights
1-3 paragraphs each. Return as markdown.`,
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
// Run synchronously — no EdgeRuntime.waitUntil (causes WORKER_LIMIT).
// The frontend AbortController timeout handles the wait.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { underwritingId, phase } = await req.json()
    if (!underwritingId || !phase) {
      return new Response(JSON.stringify({ error: 'underwritingId and phase are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = getAdminClient()
    const { data: underwriting, error: uwError } = await admin
      .from('underwritings')
      .select('*')
      .eq('id', underwritingId)
      .single()

    if (uwError || !underwriting) {
      return new Response(JSON.stringify({ error: 'Underwriting not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Gather existing phase data for context
    const allPhaseData: Record<number, unknown> = {}
    const { data: allPhaseRows } = await admin
      .from('underwriting_phase_data')
      .select('phase, structured_data')
      .eq('underwriting_id', underwritingId)
    for (const row of allPhaseRows || []) {
      if (row.structured_data && !(row.structured_data as Record<string, unknown>).analyzing) {
        allPhaseData[row.phase] = row.structured_data
      }
    }

    const ctx = underwriting as Record<string, unknown>

    // Extract documents for phases 1 & 2
    let documentContent = ''
    if (phase === 1 || phase === 2) {
      console.log(`Extracting documents for phase ${phase}...`)
      documentContent = await extractDocumentText(underwritingId)
      console.log(`Document extraction complete. Content length: ${documentContent.length} chars`)
    }

    let prompts: { system: string; user: string }
    switch (phase) {
      case 1: prompts = buildPhase1Prompt(ctx, documentContent); break
      case 2: prompts = buildPhase2Prompt(ctx, allPhaseData[1], documentContent); break
      case 3: prompts = buildPhase3Prompt(ctx, allPhaseData[1]); break
      case 4: prompts = buildPhase4Prompt(ctx, allPhaseData[2]); break
      case 5: prompts = buildPhase5Prompt(ctx, allPhaseData); break
      case 6: prompts = buildPhase6Prompt(ctx, allPhaseData); break
      case 7: prompts = buildPhase7Prompt(ctx, allPhaseData); break
      default: throw new Error(`Invalid phase: ${phase}`)
    }

    let rawText = ''

    if (phase === 1 || phase === 2) {
      // Gemini Pro for document analysis
      const lovableKey = Deno.env.get('LOVABLE_API_KEY')!
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          temperature: 0.1,
          max_tokens: 6000,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
        }),
      })
      if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`)
      const data = await res.json()
      rawText = data.choices?.[0]?.message?.content || ''
    } else {
      // Perplexity for market research phases
      const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')!
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'sonar-pro',
          temperature: 0.2,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
        }),
      })
      if (!res.ok) throw new Error(`Perplexity error: ${await res.text()}`)
      const data = await res.json()
      rawText = data.choices?.[0]?.message?.content || ''
    }

    // Parse JSON for phases 1-5
    let structuredData: unknown = null
    if (phase <= 5) {
      try {
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        structuredData = JSON.parse(cleaned)
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { structuredData = JSON.parse(jsonMatch[0]) }
          catch { structuredData = { raw_text: rawText, parse_error: true } }
        } else {
          structuredData = { raw_text: rawText, parse_error: true }
        }
      }
    } else {
      structuredData = { text: rawText }
    }

    // Save final result
    await admin
      .from('underwriting_phase_data')
      .upsert({
        underwriting_id: underwritingId,
        phase,
        raw_perplexity_response: rawText,
        structured_data: structuredData,
      }, { onConflict: 'underwriting_id,phase' })

    // Update phase_completion on parent record
    const currentCompletion = (underwriting.phase_completion as Record<string, boolean>) || {}
    currentCompletion[`phase_${phase}`] = true
    await admin
      .from('underwritings')
      .update({ phase_completion: currentCompletion, status: 'in_progress' })
      .eq('id', underwritingId)

    console.log(`Phase ${phase} analysis complete for ${underwritingId}`)

    return new Response(
      JSON.stringify({ success: true, phase, structured_data: structuredData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Handler error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
