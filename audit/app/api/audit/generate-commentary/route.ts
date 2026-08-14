import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ANTHROPIC_MODEL } from '@/lib/config'
import { resolveOrganicStats } from '@/lib/organic-stats'
import { extractCompetitorRanking } from '@/lib/llm-visibility'
import { resolveRelevantPagesConcentration } from '@/lib/relevant-pages'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Diagnostic tracing (see supabase/schema.sql's commentary_gen_* migration
  // block) for the readiness/freshness investigation: commentary_readiness_at
  // only records when the readiness poll observed pagespeed_fetched_at as
  // non-null, not what this handler's own separate fresh read (a different
  // HTTP invocation, moments later) actually saw. Captured unconditionally,
  // before anything can fail, so a slow/failed generation still leaves a trace.
  const genInvokedAt = new Date().toISOString()

  const { prospect_id } = await req.json()
  console.log('[commentary] starting for prospect_id:', prospect_id)

  // Wraps the whole handler so rescan_locked_at always clears on the way out,
  // whichever return statement fires - success, a missing prospect/cache, an
  // Anthropic error, or a JSON parse failure. rescan/route.ts is what sets this
  // lock; this is what releases it, not a timer.
  try {
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

  // Trace what this handler's own fresh read actually saw, separate from
  // recordReadinessOutcome's commentary_readiness_at (set by the poll, a
  // different invocation entirely) and separate from whatever's in the DB
  // by the time anyone queries it later. Awaited (not fire-and-forget) so
  // this write is guaranteed to land before the function can terminate -
  // an un-awaited write here would undermine the one thing this
  // instrumentation exists to guarantee. Wrapped so a failure here can
  // never break the real generation that follows.
  try {
    const { error: traceError } = await supabaseAdmin
      .from('audit_data_cache')
      .update({
        commentary_gen_invoked_at: genInvokedAt,
        commentary_gen_saw_pagespeed_at: cache.pagespeed_fetched_at ?? null,
        commentary_gen_saw_tbt: cache.pagespeed_mobile?.tbt ?? null,
        commentary_gen_saw_speed_index: cache.pagespeed_mobile?.speed_index ?? null,
      })
      .eq('prospect_id', prospect_id)
    if (traceError) console.error('[commentary] trace write failed (non-fatal):', JSON.stringify(traceError))
  } catch (traceErr: any) {
    console.error('[commentary] trace write threw (non-fatal):', traceErr.message)
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

  const { keywordCount: organicKeywords, monthlyTraffic } = resolveOrganicStats(dfsOverview, dfsKeywords)

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

  // Round scores to integers so commentary matches the rings exactly
  const mobileScore = ps?.performance_score != null ? Math.round(ps.performance_score) : null
  const desktopScore = psDesktop?.performance_score != null ? Math.round(psDesktop.performance_score) : null
  const seoScore = ps?.seo_score != null ? Math.round(ps.seo_score) : null
  const a11yScore = ps?.accessibility_score != null ? Math.round(ps.accessibility_score) : null

  // Hook-specific context for per-store variation
  const scoreEntries: [string, number | null][] = [
    ['mobile performance', mobileScore],
    ['SEO', seoScore],
    ['accessibility', a11yScore],
  ]
  const validScores = scoreEntries.filter(([, v]) => v != null) as [string, number][]
  const worstScoreEntry = validScores.length > 0 ? validScores.sort((a, b) => a[1] - b[1])[0] : null
  const worstScoreName = worstScoreEntry?.[0] ?? null
  const worstScoreValue = worstScoreEntry?.[1] ?? null
  const brandNameLower = (prospect.brand_name ?? '').toLowerCase()
  const topNonBrandedKw = [...dfsKeywords]
    .filter((k: any) => !(k.keyword_data?.keyword ?? '').toLowerCase().includes(brandNameLower))
    .sort((a: any, b: any) => (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0))
    [0]?.keyword_data?.keyword ?? null

  const userPrompt = `Generate commentary for ${prospect.brand_name} (${prospect.store_url}), a ${prospect.niche} store.

IMPORTANT: Use the exact score numbers provided below. Do not change, round, or estimate them differently. Every score you mention in commentary must match these numbers exactly.

PERFORMANCE DATA:
Mobile Score: ${mobileScore ?? 'N/A'}/100
LCP: ${lcpS}s (${lcpStatus})
FCP: ${fcpS}s
TBT: ${tbt}ms
Speed Index: ${speedIndex}s
Desktop Score: ${desktopScore ?? 'N/A'}/100
SEO Score: ${seoScore ?? 'N/A'}/100
Accessibility Score: ${a11yScore ?? 'N/A'}/100

CRO DATA:
${cro?.summary?.passed ?? 'N/A'}/20 checks passed
Critical issues: ${failedHighChecks.length > 0 ? failedHighChecks.join(', ') : 'None'}
Warnings: ${failedMedChecks.length > 0 ? failedMedChecks.join(', ') : 'None'}
Passed: ${passedChecks.slice(0, 8).join(', ')}${passedChecks.length > 8 ? '...' : ''}

SEO DATA:
Organic Keywords: ${organicKeywords.toLocaleString()} (benchmark: 200+ for stores this size)
Est Monthly Traffic (a VISITOR COUNT - never write a $ before this number): ${monthlyTraffic.toLocaleString()} visitors/month
Est Traffic Value (a DOLLAR figure - what that traffic would cost to buy via paid ads): $${Math.round(monthlyTraffic * 1.2).toLocaleString()}
Top Competitors: ${competitorDomains}
Top Competitor Traffic Gap: ${topCompetitorDomain ? `${topCompetitorDomain} gets ~${topCompetitorTrafficRaw.toLocaleString()} visits/mo, gap of ${trafficGap.toLocaleString()}` : 'N/A'}
Content Gap Opportunities: ${topGapKeywords}
Close Keywords (pos 6-15, high volume): ${closeKeywords.length > 0 ? closeKeywords.join(', ') : 'None'}
Keyword Movement: ${keywordTrends.length > 0 ? `${gaining} gaining, ${stable} stable, ${losing} losing` : 'Trend data not available'}
Referring Domains: ${backlinksUnavailable ? 'null (backlinks subscription inactive - do not comment on backlink count)' : (dfsOverview?.metrics?.referring_domains ?? 0).toLocaleString()}

HOOK DATA (use this to write a hook unique to this specific store):
Store name: ${prospect.brand_name}
Niche: ${prospect.niche}
Worst score: ${worstScoreName && worstScoreValue != null ? `${worstScoreName} (${worstScoreValue}/100)` : 'N/A'}
Top non-branded keyword: ${topNonBrandedKw ?? 'N/A'}
CRO critical failures: ${failedHighChecks.length} items${failedHighChecks.length > 0 ? ` (${failedHighChecks.slice(0, 2).join(', ')})` : ''}
Monthly traffic: ${monthlyTraffic.toLocaleString()} visitors

Generate exactly these 8 keys as JSON:
{
  "performance": "3-5 sentences about their speed scores in plain English. Reference their actual LCP and what it costs them in conversions. Specific, not generic. You MUST use the exact score integers above, e.g. if mobile is 43 write 43, not 39 or 45.",
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
  ],
  "score_descriptions": {
    "mobile": "One sentence about mobile performance score - what it means for shoppers, not the score number.",
    "desktop": "One sentence about desktop performance score.",
    "seo": "One sentence about Lighthouse SEO score.",
    "accessibility": "One sentence about accessibility score.",
    "cro": "One sentence about X/20 CRO checks - what it means for conversions.",
    "overall": "One sentence overall store health summary."
  },
  "hook_headline": {
    "line1": "Short affirming line about what this business does well, max 6 words.",
    "line2": "The turn - what is holding them back (store/site/conversion), max 6 words.",
    "subtext": "One or two plain-English sentences, max 32 words total, explaining that this audit looks at the store the way a real shopper does and shows what is quietly costing them and what fixing it is worth. Tailor lightly to the niche."
  }
}

Rules for hook_headline:
- line1 and line2 must each be max 6 words. Punchy, confident, founder-to-founder tone.
- THIS HOOK MUST BE UNIQUE TO ${prospect.brand_name}. Two different stores must produce two different hooks.
- BANNED STRUCTURE: Never write "Your [product] sell themselves. Your store gets in the way." This exact phrasing and sentence pattern is banned entirely. Do not use it or anything structurally identical.
- line1 = the specific strength of THIS business, grounded in the HOOK DATA above (their niche, what they have going for them, their top keyword).
- line2 = their specific bottleneck from the data: ${worstScoreName ? `their ${worstScoreName} score (${worstScoreValue}/100) is the weakest signal` : 'what is quietly costing them orders'}.
- Vary sentence structure and angle. Not every hook starts with "Your". Different stores need different shapes.
- No em dashes. No jargon. Write what a founder would actually say.
- subtext max 32 words total. Reference the niche (${prospect.niche}) lightly - not generic.
- Format variety examples (never copy these words - use them to see that shapes differ):
  "People find you. Then your checkout loses them." [traffic + CRO angle]
  "Great product. A store that hides it." [product + visibility angle]
  "You rank for the right terms. Speed kills the sale." [SEO + performance angle]
  "The market wants what you sell. The store says no." [demand + friction angle]

Rules for score_descriptions:
- Each value must be ONE sentence only, maximum 14 words
- Tailor to the actual score - if mobile is 23, say critical, if 87 say nearly there
- No em dashes - use commas or hyphens only. Never use em dashes anywhere in your response.
- No jargon, plain language a store owner reads instantly
- Describe what it means for shoppers or sales, not the score number itself

Rules for seo_findings:
- Generate between 3 and 6 findings
- Each finding must be based on the actual data provided, not generic advice
- Never use em dashes - use commas or hyphens only
- Write in plain English a store owner understands
- Be specific: reference actual numbers from the data
- Severity: CRITICAL for traffic declining or major visibility gap, OPPORTUNITY for untapped keywords or quick wins, WARNING for things at risk or below benchmark
- IMPORTANT: Never title a finding "Zero Organic Visibility" or similar if organicKeywords > 0. If the store ranks for any keywords, frame the finding around the gap vs benchmark instead - for example "Below Average Keyword Footprint" or "Limited Search Visibility". Only use zero-based language if organicKeywords is literally 0.
- IMPORTANT: Est Monthly Traffic is a count of visitors, not money. Never write a dollar sign in front of it (e.g. never "$0 monthly traffic" or "$1,200 monthly visitors"). Only Est Traffic Value is a dollar amount.

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
        model: ANTHROPIC_MODEL,
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

    // Extract score_descriptions non-fatally
    let scoreDescriptions: any = null
    try {
      if (parsed.score_descriptions && typeof parsed.score_descriptions === 'object' && !Array.isArray(parsed.score_descriptions)) {
        scoreDescriptions = parsed.score_descriptions
      }
    } catch {
      console.error('[commentary] score_descriptions extraction failed (non-fatal)')
    }

    // Extract hook_headline non-fatally
    let hookHeadline: any = null
    try {
      if (parsed.hook_headline && typeof parsed.hook_headline === 'object' && parsed.hook_headline.line1) {
        hookHeadline = parsed.hook_headline
      }
    } catch {
      console.error('[commentary] hook_headline extraction failed (non-fatal)')
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
        score_descriptions: scoreDescriptions,
        hook_headline: hookHeadline,
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

      // AI Search Visibility - heavily weighted per explicit product decision
      // (see prioritySystemPrompt rule below), reuses the same extraction/
      // ranking logic the AI Visibility report section itself uses
      // (extractCompetitorRanking) so this can't independently diverge from
      // what the prospect actually sees on their own report. Omitted from
      // the prompt entirely (not "N/A") when there's no data yet or every
      // provider call failed - an absent block degrades gracefully, an
      // "N/A" string risks the model treating it as a bad result.
      const llmResponded: any[] = (cache.llm_visibility_results ?? []).filter((r: any) => r.response_text && !r.error)
      let aiVisibilitySection = ''
      if (llmResponded.length > 0) {
        const llmFoundCount = llmResponded.filter((r: any) => r.found).length
        const llmRanking = extractCompetitorRanking(llmResponded, prospect.brand_name, prospect.store_url)
        const namedInstead = llmFoundCount < llmResponded.length && llmRanking.length > 0
          ? ` Named instead: ${llmRanking.slice(0, 3).map((r: any) => r.name).join(', ')}.`
          : ''
        aiVisibilitySection = `\nAI Search Visibility: ${llmFoundCount} of ${llmResponded.length} AI assistants (ChatGPT, Claude, Perplexity) mentioned this business when asked a real customer question.${namedInstead}`
      }

      // Relevant Pages concentration - context only (see prioritySystemPrompt
      // rule below), one line, not the raw page list.
      const relevantPagesConcentration = resolveRelevantPagesConcentration(cache.dataforseo_relevant_pages)
      const relevantPagesSection = relevantPagesConcentration
        ? `\nTraffic concentration: ${Math.round(relevantPagesConcentration.topPage.sharePct)}% of organic visibility sits on one page.`
        : ''

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
- Tone: direct, calm, specific
- If AI Search Visibility data is present and shows this business was mentioned by few or none of the AI assistants asked, treat that as generally the top-priority finding. It is current, concrete, and highly relevant given how much attention AI-assisted search is getting right now. Rank it first unless something else in the data is genuinely more urgent, such as a critically broken mobile experience.
- If traffic concentration data is present, treat it as background context only. Weave it into another priority if relevant rather than making it its own standalone item.`

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
Accessibility: ${ps?.accessibility_score ?? 'N/A'}/100${aiVisibilitySection}${relevantPagesSection}

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
          model: ANTHROPIC_MODEL,
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
  } finally {
    try {
      await supabaseAdmin.from('prospects').update({ rescan_locked_at: null }).eq('id', prospect_id)
    } catch (e: any) {
      console.error('[commentary] failed to clear rescan lock (non-fatal):', e.message)
    }
  }
}
