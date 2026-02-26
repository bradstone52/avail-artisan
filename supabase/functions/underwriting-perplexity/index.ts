import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

function buildPhase1Prompt(ctx: Record<string, unknown>) {
  return {
    system: `You are an assistant helping underwrite Calgary industrial properties. Extract structured lease and tenancy data from the provided deal context. Output clean tables and concise summaries. Be consistent and conservative in interpretation.`,
    user: `We are underwriting an industrial property in ${ctx.submarket} Calgary.
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf ? ctx.building_size_sf + ' SF' : 'Unknown'}

Based on the deal context provided, create a structured tenancy analysis.

Return a JSON object with these exact keys:
{
  "tenants_table": [{ "tenant_name": "", "unit": "", "square_feet": 0, "lease_start_date": "", "lease_expiry_date": "", "base_rent_psf": 0, "base_rent_monthly": 0, "lease_type": "", "rent_escalations": "", "options_to_renew": "", "notable_clauses": "" }],
  "summary_metrics": { "total_occupied_sf": 0, "total_vacant_sf": 0, "occupancy_rate": 0, "vacancy_rate": 0, "walt_years": 0 },
  "rollover_schedule": [{ "year": 0, "sf_expiring": 0, "pct_building": 0 }],
  "red_flags": [""]
}
Keep all numbers as plain numbers, no currency symbols. If no rent roll data is available, create a placeholder single-tenant structure based on the building size.`,
  }
}

function buildPhase2Prompt(ctx: Record<string, unknown>, phase1Data: unknown) {
  const tenantSummary = phase1Data
    ? JSON.stringify((phase1Data as Record<string, unknown>).summary_metrics)
    : 'Not yet analyzed'
  return {
    system: `You are a commercial real estate underwriting assistant focusing on Calgary industrial assets. Analyze operating data, calculate NOI, and highlight unusual expenses.`,
    user: `For this industrial property in ${ctx.submarket} Calgary:
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf ? ctx.building_size_sf + ' SF' : 'Unknown'}
Tenancy Summary: ${tenantSummary}
Proposed Ask Price: ${ctx.proposed_ask_price ? '$' + ctx.proposed_ask_price : 'Not set'}

Build a 2-year income statement analysis for this Calgary industrial property.

Return a JSON object with these exact keys:
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

Return JSON with these exact keys:
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
    system: `You are a conservative CRE analyst. You propose valuation ranges, not single point values. Focus on Calgary industrial market comparable cap rates.`,
    user: `We are underwriting a Calgary industrial property in ${ctx.submarket}.
Property: ${ctx.property_name}, ${ctx.address}
Building Size: ${ctx.building_size_sf || 'Unknown'} SF, Year Built: ${ctx.year_built || 'Unknown'}
Current NOI (from financials): ${noi ? '$' + noi : 'To be determined'}
Proposed Ask Price: ${ctx.proposed_ask_price ? '$' + ctx.proposed_ask_price : 'Not set'}

Build valuation scenarios for cap rates from 5.0% to 8.0% in 0.25% increments.
Consider typical Calgary industrial cap rates for this type of asset.

Return JSON with these exact keys:
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

Provide:
- 4-7 specific risks (rollover, credit, physical, location, market, etc.)
- 4-7 specific opportunities (rent upside, lease-up, OpEx optimization, etc.)

Return JSON only:
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

Use these headings: ## Executive Summary, ## Property Details, ## Market Overview, ## Financial Performance, ## Investment Rationale, ## Risk Factors, ## Recommendation

Return as markdown text.`,
  }
}

function buildPhase7Prompt(ctx: Record<string, unknown>, allPhaseData: Record<number, unknown>) {
  const p1 = allPhaseData[1] ? JSON.stringify(allPhaseData[1]).substring(0, 500) : 'N/A'
  const p2 = allPhaseData[2] ? JSON.stringify(allPhaseData[2]).substring(0, 400) : 'N/A'
  const p3 = allPhaseData[3] ? JSON.stringify(allPhaseData[3]).substring(0, 400) : 'N/A'
  return {
    system: `You draft marketing copy for industrial offering memorandums. Tone: confident, data-driven, professional. Not hypey.`,
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { underwritingId, phase } = await req.json()
    if (!underwritingId || !phase) {
      return new Response(JSON.stringify({ error: 'underwritingId and phase are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Select prompt based on phase
    let prompts: { system: string; user: string }
    switch (phase) {
      case 1: prompts = buildPhase1Prompt(ctx); break
      case 2: prompts = buildPhase2Prompt(ctx, allPhaseData[1]); break
      case 3: prompts = buildPhase3Prompt(ctx, allPhaseData[1]); break
      case 4: prompts = buildPhase4Prompt(ctx, allPhaseData[2]); break
      case 5: prompts = buildPhase5Prompt(ctx, allPhaseData); break
      case 6: prompts = buildPhase6Prompt(ctx, allPhaseData); break
      case 7: prompts = buildPhase7Prompt(ctx, allPhaseData); break
      default:
        return new Response(JSON.stringify({ error: 'Invalid phase (1-7)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Call Perplexity API
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')
    if (!perplexityKey) {
      return new Response(JSON.stringify({ error: 'Perplexity API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
      return new Response(JSON.stringify({ error: 'Perplexity API error', details: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const perplexityData = await perplexityRes.json()
    const rawText: string = perplexityData.choices?.[0]?.message?.content || ''

    // Attempt JSON parse for phases 1-5
    let structuredData: unknown = null
    if (phase <= 5) {
      try {
        // Strip markdown fences
        const cleaned = rawText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim()
        structuredData = JSON.parse(cleaned)
      } catch {
        // Try to find JSON object/array in the text
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            structuredData = JSON.parse(jsonMatch[0])
          } catch {
            structuredData = { raw_text: rawText, parse_error: true }
          }
        } else {
          structuredData = { raw_text: rawText, parse_error: true }
        }
      }
    } else {
      // Phases 6-7: store text
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update phase_completion on underwriting
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
