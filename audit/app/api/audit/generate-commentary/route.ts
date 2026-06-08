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
  const dfsKeywords: any[] = cache.dataforseo_keywords ?? []

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

  const overviewCount = dfsOverview?.metrics?.organic?.count ?? 0
  const keywordsArrayCount = Array.isArray(dfsKeywords) ? dfsKeywords.length : 0
  const organicKeywords = Math.max(overviewCount, keywordsArrayCount)
  const monthlyTraffic = dfsOverview?.metrics?.organic?.etv ?? 0

  const backlinksUnavailable = !cache.backlinks_summary || Object.keys(cache.backlinks_summary ?? {}).length === 0

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

  // Extra SEO context for seo_findings generation
  const keywordTrends: any[] = cache.dataforseo_keyword_trends ?? []
  const closeKeywords = dfsKeywords
    .filter((k: any) => {
      const pos = k.ranked_serp_element?.serp_item?.rank_group
      const vol = k.keyword_data?.keyword_info?.search_volume ?? 0
      return pos >= 6 && pos <= 15 && vol >= 100
    })
    .slice(0, 5)
    .map((k: any) => {
      const kw = k.keyword_data?.keyword ?? 'unknown'
      const pos = k.ranked_serp_element?.serp_item?.rank_group
      const vol = (k.keyword_data?.keyword_info?.search_volume ?? 0).toLocaleString()
      return `${kw} (pos ${pos}, ${vol}/mo)`
    })
  const trendMap = new Map<string, number>()
  for (const t of keywordTrends) {
    if (t.keyword && t.delta != null) trendMap.set(t.keyword, t.delta)
  }
  let gaining = 0, stable = 0, losing = 0
  for (const kw of dfsKeywords) {
    const kwStr = kw.keyword_data?.keyword ?? ''
    const delta = trendMap.get(kwStr)
    if (delta == null) { stable++; continue }
    if (delta > 0) gaining++
    else if (delta < 0) losing++
    else stable++
  }
  const topCompetitorDomain = dfsCompetitors[0]?.domain ?? null
  const topCompetitorTrafficRaw = dfsCompetitors[0]?.estimated_traffic ?? dfsCompetitors[0]?.full_domain_metrics?.organic?.etv ?? 0
  const trafficGap = topCompetitorTrafficRaw > monthlyTraffic ? Math.round(topCompetitorTrafficRaw - monthlyTraffic) : 0

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
Organic Keywords: ${organicKeywords.toLocaleString()} (benchmark: 200+ for stores this size)
Est Monthly Traffic: ${monthlyTraffic.toLocaleString()}
Est Traffic Value: $${Math.round(monthlyTraffic * 1.2).toLocaleString()}
Top Competitors: ${competitorDomains}
Top Competitor Traffic Gap: ${topCompetitorDomain ? `${topCompetitorDomain} gets ~${topCompetitorTrafficRaw.toLocaleString()} visits/mo, gap of ${trafficGap.toLocaleString()}` : 'N/A'}
Content Gap Opportunities: ${topGapKeywords}
Close Keywords (pos 6-15, high volume): ${closeKeywords.length > 0 ? closeKeywords.join(', ') : 'None'}
Keyword Movement: ${keywordTrends.length > 0 ? `${gaining} gaining, ${stable} stable, ${losing} losing` : 'Trend data not available'}
Referring Domains: ${backlinksUnavailable ? 'null (backlinks subscription inactive - do not comment on backlink count)' : (dfsOverview?.metrics?.referring_domains ?? 0).toLocaleString()}

Generate exactly these 6 keys as JSON:
{
  "performance": "3-5 sentences about their speed scores in plain English. Reference their actual LCP and what it costs them in conversions. Specific, not generic.",
  "cro": "3-5 sentences about their CRO score and what the critical issues mean for their revenue. Focus on the 2-3 most important failed checks.",
  "seo": "3-5 sentences about their organic search presence. If numbers are low, say so directly and explain what that means for paid ad dependency.",
  "opportunity": "3-5 sentences identifying the single highest leverage move for this specific store. Be direct and specific. This is the most important section.",
  "closing": "2-3 sentences. Not a pitch. What should they do with what they just read. End with something that makes them want to book a call.",
  "seo_findings": [
    {
      "title": "Short finding name, 3-6 words",
      "severity": "CRITICAL or OPPORTUNITY or WARNING",
      "detail": "One sentence with specific data, e.g. you rank for only 50 keywords while similar stores average 200+",
      "fix": "One specific action sentence, e.g. publish 3 collection pages targeting your highest-volume unranked keywords"
    }
  ]
}

Rules for seo_findings:
- Generate between 3 and 6 findings
- Each finding must be based on the actual data provided, not generic advice
- Never use em dashes - use commas or hyphens only
- Write in plain English a store owner understands
- Be specific: reference actual numbers from the data
- Severity: CRITICAL for traffic declining or major visibility gap, OPPORTUNITY for untapped keywords or quick wins, WARNING for things at risk or below benchmark
- IMPORTANT: Never title a finding "Zero Organic Visibility" or similar if organicKeywords > 0. If the store ranks for any keywords, frame the finding around the gap vs benchmark instead - for example "Below Average Keyword Footprint" or "Limited Search Visibility". Only use zero-based language if organicKeywords is literally 0.

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
        max_tokens: 3000,
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

    // Extract seo_findings non-fatally
    let seoFindings: any[] | null = null
    try {
      if (Array.isArray(parsed.seo_findings) && parsed.seo_findings.length > 0) {
        seoFindings = parsed.seo_findings
      }
    } catch {
      console.error('[commentary] seo_findings extraction failed (non-fatal)')
    }

    const { error: dbError } = await supabaseAdmin
      .from('audit_content')
      .update({
        ai_performance_commentary: parsed.performance ?? null,
        ai_cro_commentary: parsed.cro ?? null,
        ai_seo_commentary: parsed.seo ?? null,
        ai_opportunity_commentary: parsed.opportunity ?? null,
        ai_closing_commentary: parsed.closing ?? null,
        seo_findings: seoFindings,
      })
      .eq('prospect_id', prospect_id)

    if (dbError) {
      console.error('[commentary] Supabase write error:', JSON.stringify(dbError))
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
    }

    console.log('[commentary] saved successfully for prospect_id:', prospect_id)

    // ── Priority action list (second Anthropic call) ──
    // Required Supabase column: ALTER TABLE audit_content ADD COLUMN ai_priority_list JSONB;
    try {
      const topCompetitor = dfsCompetitors[0]?.domain ?? 'N/A'
      const topCompetitorTraffic = dfsCompetitors[0]?.estimated_traffic ?? dfsCompetitors[0]?.full_domain_metrics?.organic?.etv ?? 0
      const moneyKeywords = dfsContentGap.slice(0, 3).map((g: any) => {
        const kw = g.keyword_data?.keyword ?? g.keyword ?? 'unknown'
        const vol = (g.keyword_data?.keyword_info?.search_volume ?? 0).toLocaleString()
        return `${kw} (${vol}/mo)`
      })
      if (moneyKeywords.length === 0) {
        // Fall back to ranked keywords not in top 5
        dfsKeywords.filter((k: any) => {
          const pos = k.ranked_serp_element?.serp_item?.rank_group
          return pos >= 6 && pos <= 15
        }).slice(0, 3).forEach((k: any) => {
          const kw = k.keyword_data?.keyword ?? 'unknown'
          const vol = (k.keyword_data?.keyword_info?.search_volume ?? 0).toLocaleString()
          moneyKeywords.push(`${kw} (${vol}/mo)`)
        })
      }
      const failedCroTop3 = (cro?.results ?? [])
        .filter((c: any) => !c.passed && c.importance === 'high')
        .slice(0, 3)
        .map((c: any) => c.label)

      const prioritySystemPrompt = `You are Adam Nagy, founder of Kliks Digital, a Shopify growth agency. You have just analysed a Shopify store and have real data. Your job is to produce a brutally honest, specific priority action list for this store owner.

Rules:
- Exactly 3 priorities, no more, no less
- Each priority must reference their actual data
- Lead with the highest revenue impact item first
- Be specific: name the actual keyword, actual score, actual number - not generic advice
- Each priority has: a title (max 6 words), an impact statement (what fixing it is worth in $ or % or visitors), and a next step (one sentence, what to do this week)
- Sound like a founder giving honest advice, not an agency pitch
- Never use em dashes
- Never use bullet points in the next step
- Tone: direct, calm, specific`

      const priorityUserPrompt = `Store: ${prospect.brand_name}
Mobile Performance: ${ps?.performance_score ?? 'N/A'}/100
LCP: ${ps?.lcp ? (ps.lcp / 1000).toFixed(2) : 'N/A'}s (target: 2.5s)
TBT: ${ps?.tbt ? Math.round(ps.tbt) : 'N/A'}ms (target: 200ms)
CRO Score: ${cro?.summary?.passed ?? 'N/A'}/${cro?.summary?.total ?? 20} checks passed
Top CRO failures: ${failedCroTop3.length > 0 ? failedCroTop3.join(', ') : 'None'}
Organic keywords: ${organicKeywords.toLocaleString()}
Monthly traffic: ${monthlyTraffic.toLocaleString()}
Top competitor: ${topCompetitor} with ${topCompetitorTraffic.toLocaleString()} monthly visits
Keyword gaps (top 3): ${moneyKeywords.length > 0 ? moneyKeywords.join(', ') : 'None available'}
SEO score: ${ps?.seo_score ?? 'N/A'}/100
Accessibility: ${ps?.accessibility_score ?? 'N/A'}/100

Generate exactly 3 priorities as JSON only, no other text:
{
  "priorities": [
    {
      "number": 1,
      "title": "short punchy title",
      "impact": "specific impact statement with numbers",
      "next_step": "one specific action to take this week"
    }
  ]
}`

      console.log('[commentary] calling Anthropic for priority list:', prospect.brand_name)
      const priorityRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: prioritySystemPrompt,
          messages: [{ role: 'user', content: priorityUserPrompt }],
        }),
      })

      if (priorityRes.ok) {
        const priorityApiData = await priorityRes.json()
        const priorityRaw: string = priorityApiData.content?.[0]?.text ?? ''
        const priorityCleaned = priorityRaw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
        const priorityParsed = JSON.parse(priorityCleaned)

        await supabaseAdmin
          .from('audit_content')
          .update({ ai_priority_list: priorityParsed })
          .eq('prospect_id', prospect_id)

        console.log('[commentary] priority list saved for prospect_id:', prospect_id)
      } else {
        console.error('[commentary] priority list API error:', priorityRes.status)
      }
    } catch (priorityErr: any) {
      console.error('[commentary] priority list generation failed (non-fatal):', priorityErr.message)
    }

    return NextResponse.json({ success: true, sections: Object.keys(parsed) })

  } catch (err: any) {
    console.error('[commentary] unexpected error:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
