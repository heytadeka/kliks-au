import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[commentary] starting for prospect_id:', prospect_id)

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', prospect_id)
    .single()

  if (!prospect) {
    console.error('[commentary] prospect not found:', prospect_id)
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  const { data: cache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('*')
    .eq('prospect_id', prospect_id)
    .single()

  if (!cache) {
    console.error('[commentary] no cache data for prospect_id:', prospect_id)
    return NextResponse.json({ error: 'No cache data found' }, { status: 404 })
  }

  // Build data summary for the prompt
  const ps = cache.pagespeed_mobile
  const psDesktop = cache.pagespeed_desktop
  const cro = cache.cro_checklist
  const dfsOverview = cache.dataforseo_overview
  const dfsCompetitors: any[] = cache.dataforseo_competitors ?? []
  const dfsContentGap: any[] = cache.dataforseo_content_gap ?? []

  const lcpS = ps?.lcp ? (ps.lcp / 1000).toFixed(2) : 'N/A'
  const lcpStatus = ps?.lcp
    ? ps.lcp / 1000 <= 2.5 ? 'good' : ps.lcp / 1000 <= 4 ? 'needs work' : 'poor'
    : 'N/A'
  const fcpS = ps?.fcp ? (ps.fcp / 1000).toFixed(2) : 'N/A'
  const tbt = ps?.tbt ? Math.round(ps.tbt) : 'N/A'
  const speedIndex = ps?.speed_index ? (ps.speed_index / 1000).toFixed(2) : 'N/A'

  const failedHighChecks = cro?.results?.filter((c: any) => !c.passed && c.importance === 'high').map((c: any) => c.label) ?? []
  const failedMedChecks = cro?.results?.filter((c: any) => !c.passed && c.importance === 'medium').map((c: any) => c.label) ?? []
  const passedChecks = cro?.results?.filter((c: any) => c.passed).map((c: any) => c.label) ?? []

  const organicKeywords = dfsOverview?.metrics?.organic?.count ?? 0
  const monthlyTraffic = dfsOverview?.metrics?.organic?.etv ?? 0

  const competitorDomains = dfsCompetitors.length > 0
    ? dfsCompetitors.slice(0, 5).map((c: any) => c.domain).filter(Boolean).join(', ')
    : 'None found'

  const topGapKeywords = dfsContentGap.length > 0
    ? dfsContentGap.slice(0, 5).map((g: any) => {
        const kw = g.keyword_data?.keyword ?? g.keyword ?? 'unknown'
        const vol = (g.keyword_data?.keyword_info?.search_volume ?? 0).toLocaleString()
        return `${kw} (${vol}/mo)`
      }).join(', ')
    : 'None available'

  const userPrompt = `Generate commentary for ${prospect.brand_name} (${prospect.store_url}), a ${prospect.niche} store.

PERFORMANCE DATA:
Mobile Score: ${ps?.performance_score ?? 'N/A'}/100
LCP: ${lcpS}s (${lcpStatus})
FCP: ${fcpS}s
TBT: ${tbt}ms
Speed Index: ${speedIndex}s
Desktop Score: ${psDesktop?.performance_score ?? 'N/A'}/100

CRO DATA:
${cro?.summary?.passed ?? 'N/A'}/20 checks passed
Critical issues: ${failedHighChecks.length > 0 ? failedHighChecks.join(', ') : 'None'}
Warnings: ${failedMedChecks.length > 0 ? failedMedChecks.join(', ') : 'None'}
Passed: ${passedChecks.slice(0, 8).join(', ')}${passedChecks.length > 8 ? '...' : ''}

SEO DATA:
Organic Keywords: ${organicKeywords.toLocaleString()}
Est Monthly Traffic: ${monthlyTraffic.toLocaleString()}
Est Traffic Value: $${(monthlyTraffic * 1.2).toLocaleString()}
Top Competitors: ${competitorDomains}
Content Gap Opportunities: ${topGapKeywords}

Generate exactly these 5 sections as JSON:
{
  "performance": "3-5 sentences about their speed scores in plain English. Reference their actual LCP and what it costs them in conversions. Specific, not generic.",
  "cro": "3-5 sentences about their CRO score and what the critical issues mean for their revenue. Focus on the 2-3 most important failed checks.",
  "seo": "3-5 sentences about their organic search presence. If numbers are low, say so directly and explain what that means for paid ad dependency.",
  "opportunity": "3-5 sentences identifying the single highest leverage move for this specific store. Be direct and specific. This is the most important section.",
  "closing": "2-3 sentences. Not a pitch. What should they do with what they just read. End with something that makes them want to book a call."
}

Respond with only valid JSON. No markdown. No explanation.`

  const systemPrompt = `You are Adam Nagy, founder of Kliks Digital, a boutique Shopify growth agency. You are writing personalised commentary for a prospect's growth audit report. Your tone is founder-to-founder: direct, calm, honest, slightly opinionated, experience-driven. You have managed over $10M in paid ad spend across DTC brands and run your own Shopify stores. Write like a founder texting a mate who runs a business - not like an agency or consultant. Never use em dashes. Use commas or hyphens instead. No bullet points in prose sections. Keep each section concise - 3 to 5 sentences maximum. Be specific to their actual data, not generic.`

  try {
    console.log('[commentary] calling Anthropic API for', prospect.brand_name)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[commentary] Anthropic API error:', res.status, errText)
      return NextResponse.json({ success: false, error: `Anthropic API error: ${res.status}` }, { status: 500 })
    }

    const apiData = await res.json()
    const rawText: string = apiData.content?.[0]?.text ?? ''
    console.log('[commentary] raw response length:', rawText.length)

    let parsed: any
    try {
      const cleaned = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[commentary] JSON parse error, raw:', rawText.slice(0, 300))
      return NextResponse.json({ success: false, error: 'Failed to parse AI response as JSON' }, { status: 500 })
    }

    const { error: dbError } = await supabaseAdmin
      .from('audit_content')
      .update({
        ai_performance_commentary: parsed.performance ?? null,
        ai_cro_commentary: parsed.cro ?? null,
        ai_seo_commentary: parsed.seo ?? null,
        ai_opportunity_commentary: parsed.opportunity ?? null,
        ai_closing_commentary: parsed.closing ?? null,
      })
      .eq('prospect_id', prospect_id)

    if (dbError) {
      console.error('[commentary] Supabase write error:', JSON.stringify(dbError))
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
    }

    console.log('[commentary] saved successfully for prospect_id:', prospect_id)
    return NextResponse.json({ success: true, sections: Object.keys(parsed) })

  } catch (err: any) {
    console.error('[commentary] unexpected error:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
