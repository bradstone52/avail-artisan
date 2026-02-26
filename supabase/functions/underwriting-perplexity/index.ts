import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Document Extraction ───────────────────────────────────────────────────────

async function extractDocumentText(
  supabase: ReturnType<typeof createClient>,
  underwritingId: string
): Promise<string> {
  // Fetch all documents for this underwriting
  const { data: docs } = await supabase
    .from('underwriting_documents')
    .select('*')
    .eq('underwriting_id', underwritingId)

  if (!docs || docs.length === 0) return ''

  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Use service role for storage access
  const adminClient = createClient(supabaseUrl, serviceKey)

  const extractedParts: string[] = []

  for (const doc of docs) {
    try {
      // Download the file from storage
      const { data: fileData, error: dlError } = await adminClient.storage
        .from('underwriting-docs')
        .download(doc.storage_path)

      if (dlError || !fileData) {
        console.error(`Failed to download ${doc.file_name}:`, dlError)
        extractedParts.push(`[Document: ${doc.file_name} (${doc.document_type}) - could not be read]`)
        continue
      }

      const fileName = doc.file_name.toLowerCase()
      const isSpreadsheet = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')
      const isPdf = fileName.endsWith('.pdf')

      if (isSpreadsheet || isPdf) {
        // Convert to base64 for Gemini
        const arrayBuffer = await fileData.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)

        let mimeType = 'application/pdf'
        if (fileName.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else if (fileName.endsWith('.xls')) mimeType = 'application/vnd.ms-excel'
        else if (fileName.endsWith('.csv')) mimeType = 'text/csv'

        // Use Gemini Flash to extract text from the document
        const geminiRes = await fetch(
          `https://gateway.lovable.ai/openai/v1/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Extract ALL data from this ${doc.document_type} document. For rent rolls: include every tenant row (tenant name, unit, SF, lease dates, rent amounts). For operating statements: include all income/expense line items with amounts. For leases: include tenant name, unit, SF, start date, expiry, base rent, escalations, renewal options. Be thorough - do not summarize or omit any rows. Output as structured plain text.`,
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mimeType};base64,${base64}`,
                      },
                    },
                  ],
                },
              ],
              max_tokens: 8000,
            }),
          }
        )

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const extractedText = geminiData.choices?.[0]?.message?.content || ''
          extractedParts.push(`=== ${doc.document_type.toUpperCase()}: ${doc.file_name} ===\n${extractedText}`)
        } else {
          const errText = await geminiRes.text()
          console.error(`Gemini extraction failed for ${doc.file_name}:`, errText)
          extractedParts.push(`[Document: ${doc.file_name} - extraction failed]`)
        }
      } else {
        // For text files, read directly
        const text = await fileData.text()
        extractedParts.push(`=== ${doc.document_type.toUpperCase()}: ${doc.file_name} ===\n${text.substring(0, 10000)}`)
      }
    } catch (err) {
      console.error(`Error processing ${doc.file_name}:`, err)
      extractedParts.push(`[Document: ${doc.file_name} - processing error]`)
    }
  }

  return extractedParts.join('\n\n')
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

function buildPhase1Prompt(ctx: Record<string, unknown>, documentContent: string) {
  const hasDocuments = documentContent.trim().length > 0
  return {
    system: `You are an expert commercial real estate underwriting analyst specializing in Calgary industrial properties. Extract and structure tenant and lease data precisely from provided documents. Always use actual data from documents — never fabricate or estimate when real data is available.`,
    user: `We are underwriting an industrial property in ${ctx.submarket} Calgary.
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf ? ctx.building_size_sf + ' SF' : 'Unknown'}

${hasDocuments ? `UPLOADED DOCUMENTS:\n${documentContent}\n\nExtract ALL tenant data from the above documents. Use real figures from the rent roll and leases.` : 'No documents uploaded — create a placeholder structure based on building size.'}

Return a JSON object with these exact keys:
{
  "tenants_table": [{ "tenant_name": "", "unit": "", "square_feet": 0, "lease_start_date": "", "lease_expiry_date": "", "base_rent_psf": 0, "base_rent_monthly": 0, "lease_type": "NNN|Gross|Net|Modified Gross", "rent_escalations": "", "options_to_renew": "", "notable_clauses": "" }],
  "summary_metrics": { "total_occupied_sf": 0, "total_vacant_sf": 0, "occupancy_rate": 0, "vacancy_rate": 0, "walt_years": 0 },
  "rollover_schedule": [{ "year": 2025, "sf_expiring": 0, "pct_building": 0 }],
  "red_flags": [""]
}
Keep all numbers as plain numbers, no currency symbols. Occupancy/vacancy as percentages (e.g. 95.2 not 0.952). WALT in decimal years.`,
  }
}

function buildPhase2Prompt(ctx: Record<string, unknown>, phase1Data: unknown, documentContent: string) {
  const tenantSummary = phase1Data
    ? JSON.stringify((phase1Data as Record<string, unknown>).summary_metrics)
    : 'Not yet analyzed'
  const hasDocuments = documentContent.trim().length > 0
  return {
    system: `You are a commercial real estate financial analyst. Build accurate income statements from actual operating documents when provided. Use Calgary-specific benchmarks for any estimates.`,
    user: `For this industrial property in ${ctx.submarket} Calgary:
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf ? ctx.building_size_sf + ' SF' : 'Unknown'}
Tenancy Summary: ${tenantSummary}
Proposed Ask Price: ${ctx.proposed_ask_price ? '$' + ctx.proposed_ask_price : 'Not set'}

${hasDocuments ? `OPERATING STATEMENTS / FINANCIAL DOCUMENTS:\n${documentContent}\n\nUse actual figures from these documents where available.` : ''}

Build a 2-year income statement. Use actual data from operating statements if provided; otherwise estimate based on Calgary industrial benchmarks.

Return JSON:
{
  "income_statements": {
    "year1": { "gross_potential_income": 0, "vacancy_credit_loss": 0, "effective_gross_income": 0, "property_taxes": 0, "insurance": 0, "management_fee": 0, "maintenance_repairs": 0, "utilities": 0, "other_opex": 0, "total_operating_expenses": 0, "net_operating_income": 0 },
    "year2": { "gross_potential_income": 0, "vacancy_credit_loss": 0, "effective_gross_income": 0, "property_taxes": 0, "insurance": 0, "management_fee": 0, "maintenance_repairs": 0, "utilities": 0, "other_opex": 0, "total_operating_expenses": 0, "net_operating_income": 0 }
  },
  "ratios": { "year1_opex_ratio": 0, "year2_opex_ratio": 0, "noi_trend": "" },
  "health_bullets": [""],
  "unusual_items": [""],
  "dd_questions": [""]
}`,
  }
}

function buildPhase3Prompt(ctx: Record<string, unknown>, phase1Data: unknown) {
  const tenants = phase1Data
    ? JSON.stringify((phase1Data as Record<string, unknown>).tenants_table)
    : '[]'
  return {
    system: `You specialize in Calgary industrial market analysis (SE, NE, Balzac/Rocky View, etc.). Provide concise market context and rent positioning grounded in current Calgary industrial fundamentals.`,
    user: `We are analyzing an industrial property of ${ctx.building_size_sf || 'unknown'} SF located in ${ctx.submarket} Calgary.
Property: ${ctx.property_name}, ${ctx.address}
Year Built: ${ctx.year_built || 'Unknown'}
Current Tenants: ${tenants}

1. Briefly summarize current industrial fundamentals in the ${ctx.submarket} submarket: vacancy, rent direction, demand drivers, new supply (3-5 sentences).
2. Provide a typical market rent range for comparable industrial space (net $/sf).
3. Compare in-place rents to estimated market rents; label each as below_market, at_market, or above_market.
4. Suggest 3 positioning options.

Return JSON:
{
  "market_summary_text": "",
  "market_rent_range": { "low": 0, "high": 0, "notes": "" },
  "tenant_rent_comparison": [{ "tenant_name": "", "in_place_psf": 0, "market_psf": 0, "position": "below_market|at_market|above_market" }],
  "positioning_options": [{ "label": "", "description": "" }]
}`,
  }
}

function buildPhase4Prompt(ctx: Record<string, unknown>, phase2Data: unknown) {
  const noi = phase2Data
    ? (phase2Data as Record<string, Record<string, Record<string, number>>>).income_statements?.year1?.net_operating_income
    : null
  return {
    system: `You are a conservative CRE analyst. Propose valuation ranges for Calgary industrial assets using current market cap rates.`,
    user: `We are underwriting a Calgary industrial property in ${ctx.submarket}.
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf || 'Unknown'} SF, Year Built: ${ctx.year_built || 'Unknown'}
Current NOI (from financials): ${noi ? '$' + noi : 'To be determined'}
Proposed Ask Price: ${ctx.proposed_ask_price ? '$' + ctx.proposed_ask_price : 'Not set'}

Build valuation scenarios for cap rates from 5.0% to 8.0% in 0.25% increments.

Return JSON:
{
  "valuation_table": [{ "cap_rate": 0, "value_current_noi": 0, "value_stabilized_noi": 0 }],
  "likely_cap_band": { "low": 0, "high": 0, "rationale": "" },
  "value_band": { "low": 0, "high": 0 },
  "pricing_commentary": ""
}`,
  }
}

function buildPhase5Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 500) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 300) : 'N/A'
  return {
    system: `You write concise risk and upside lists for CRE investment memos. Be specific to Calgary industrial real estate.`,
    user: `Summarize key risks and opportunities for this Calgary industrial asset.
Property: ${ctx.property_name} in ${ctx.submarket}
Building: ${ctx.building_size_sf || 'Unknown'} SF, Year Built: ${ctx.year_built || 'Unknown'}
Tenancy summary: ${p1}
Market context: ${p3}

Provide 4-7 risks and 4-7 opportunities.

Return JSON:
{
  "risks": [""],
  "opportunities": [""]
}`,
  }
}

function buildPhase6Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 600) : 'N/A'
  const p2 = allPhaseData[2] ? JSON.stringify(allPhaseData[2]).substring(0, 600) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 400) : 'N/A'
  const p4 = allPhaseData[4] ? JSON.stringify(allPhaseData[4]).substring(0, 400) : 'N/A'
  const p5 = allPhaseData[5] ? JSON.stringify(allPhaseData[5]).substring(0, 400) : 'N/A'
  return {
    system: `You draft internal investment memos for a commercial brokerage. Tone: professional, concise, Calgary-specific. No disclaimers.`,
    user: `Draft a 1-2 page internal investment memo for this industrial property.

Property: ${ctx.property_name}
Address: ${ctx.address}, ${ctx.submarket} Calgary
Size: ${ctx.building_size_sf || 'Unknown'} SF | Year Built: ${ctx.year_built || 'Unknown'} | Land: ${ctx.land_size_ac || 'Unknown'} acres
Ask Price: ${ctx.proposed_ask_price ? '$' + Number(ctx.proposed_ask_price).toLocaleString() : 'TBD'}

Tenancy: ${p1}
Financials: ${p2}
Market: ${p3}
Valuation: ${p4}
Risks/Opportunities: ${p5}

Headings: ## Executive Summary, ## Property Details, ## Market Overview, ## Financial Performance, ## Investment Rationale, ## Risk Factors, ## Recommendation

Return as markdown text.`,
  }
}

function buildPhase7Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 500) : 'N/A'
  const p2 = allPhaseData[2] ? JSON.stringify(allPhaseData[2]).substring(0, 400) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 400) : 'N/A'
  return {
    system: `You draft marketing copy for industrial offering memorandums. Tone: confident, data-driven, professional.`,
    user: `Draft OM marketing copy for this Calgary industrial property.

Property: ${ctx.property_name}
Address: ${ctx.address}, ${ctx.submarket} Calgary
Size: ${ctx.building_size_sf || 'Unknown'} SF | Year Built: ${ctx.year_built || 'Unknown'}
Ask Price: ${ctx.proposed_ask_price ? '$' + Number(ctx.proposed_ask_price).toLocaleString() : 'TBD'}

Tenancy: ${p1}
Financials: ${p2}
Market: ${p3}

Sections: ## Executive Summary, ## Location & Market, ## Property Features, ## Tenancy Overview, ## Financial Summary, ## Investment Highlights

Keep each section 1-3 paragraphs. Return as markdown text.`,
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

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

    // Load the underwriting record
    const { data: underwriting, error: uwError } = await supabase
      .from('underwritings')
      .select('*')
      .eq('id', underwritingId)
      .single()

    if (uwError || !underwriting) {
      return new Response(JSON.stringify({ error: 'Underwriting not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load all existing phase data for context
    const { data: allPhaseRows } = await supabase
      .from('underwriting_phase_data')
      .select('phase, structured_data')
      .eq('underwriting_id', underwritingId)

    const allPhaseData: Record<number, unknown> = {}
    for (const row of allPhaseRows || []) {
      allPhaseData[row.phase] = row.structured_data
    }

    const ctx = underwriting as Record<string, unknown>

    // For document-heavy phases (1 and 2), extract document content first
    let documentContent = ''
    if (phase === 1 || phase === 2) {
      console.log(`Extracting documents for phase ${phase}...`)
      documentContent = await extractDocumentText(supabase, underwritingId)
      console.log(`Document extraction complete. Length: ${documentContent.length} chars`)
    }

    // For phases 1-5: use Gemini (can read documents + reason about structured data)
    // For phases 3-5: use Perplexity (needs real-time market data)
    // For phases 6-7: use Perplexity (narrative generation with citations)
    const useGemini = phase === 1 || phase === 2
    const usePerplexity = phase >= 3

    let prompts: { system: string; user: string }
    switch (phase) {
      case 1: prompts = buildPhase1Prompt(ctx, documentContent); break
      case 2: prompts = buildPhase2Prompt(ctx, allPhaseData[1], documentContent); break
      case 3: prompts = buildPhase3Prompt(ctx, allPhaseData[1]); break
      case 4: prompts = buildPhase4Prompt(ctx, allPhaseData[2]); break
      case 5: prompts = buildPhase5Prompt(ctx, allPhaseData); break
      case 6: prompts = buildPhase6Prompt(ctx, allPhaseData); break
      case 7: prompts = buildPhase7Prompt(ctx, allPhaseData); break
      default:
        return new Response(JSON.stringify({ error: 'Invalid phase (1-7)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    let rawText = ''

    if (useGemini) {
      // Use Lovable AI (Gemini) for document extraction phases
      const lovableKey = Deno.env.get('LOVABLE_API_KEY')
      if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured')

      const geminiRes = await fetch('https://gateway.lovable.ai/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          temperature: 0.1,
          max_tokens: 8000,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
        }),
      })

      if (!geminiRes.ok) {
        const errText = await geminiRes.text()
        console.error('Gemini error:', errText)
        throw new Error(`Gemini API error: ${errText}`)
      }

      const geminiData = await geminiRes.json()
      rawText = geminiData.choices?.[0]?.message?.content || ''
    }

    if (usePerplexity) {
      const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')
      if (!perplexityKey) throw new Error('PERPLEXITY_API_KEY not configured')

      const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          temperature: 0.2,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
        }),
      })

      if (!perplexityRes.ok) {
        const errText = await perplexityRes.text()
        console.error('Perplexity error:', errText)
        throw new Error(`Perplexity API error: ${errText}`)
      }

      const perplexityData = await perplexityRes.json()
      rawText = perplexityData.choices?.[0]?.message?.content || ''
    }

    // Parse JSON for phases 1-5
    let structuredData: unknown = null
    if (phase <= 5) {
      try {
        const cleaned = rawText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim()
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

    // Upsert phase data
    const { data: savedPhase, error: saveError } = await supabase
      .from('underwriting_phase_data')
      .upsert({
        underwriting_id: underwritingId,
        phase,
        raw_perplexity_response: rawText,
        structured_data: structuredData,
      }, { onConflict: 'underwriting_id,phase' })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      return new Response(JSON.stringify({ error: 'Failed to save phase data', details: saveError }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update phase_completion
    const currentCompletion = (underwriting.phase_completion as Record<string, boolean>) || {}
    currentCompletion[`phase_${phase}`] = true
    await supabase
      .from('underwritings')
      .update({ phase_completion: currentCompletion, status: 'in_progress' })
      .eq('id', underwritingId)

    return new Response(
      JSON.stringify({ success: true, phaseData: savedPhase, structuredData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
