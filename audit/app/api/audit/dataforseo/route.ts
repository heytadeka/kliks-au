import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60
export const preferredRegion = 'syd1'

// Required new columns in audit_data_cache (add in Supabase dashboard before testing):
//   dataforseo_keyword_trends  JSONB
//   backlinks_summary          JSONB

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

async function dfsPost(path: string, body: any[]) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const url = `${DATAFORSEO_BASE}${path}`
  console.log('[dataforseo] POST', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    console.error('[dataforseo] HTTP error', res.status, JSON.stringify(json))
    throw new Error(`DataForSEO error: ${res.status}`)
  }
  const taskStatus = json?.tasks?.[0]?.status_code
  if (taskStatus && taskStatus !== 20000) {
    console.error('[dataforseo] task error', taskStatus, json?.tasks?.[0]?.status_message)
  }
  return json
}

const JUNK_DOMAINS = [
  // Social & big platforms
  'facebook', 'youtube', 'instagram', 'twitter', 'pinterest', 'tiktok', 'reddit', 'linkedin',
  // Marketplaces
  'amazon', 'ebay', 'etsy', 'google',
  // Reference
  'wikipedia',
  // Review & directory sites
  'yelp', 'tripadvisor', 'eatability', 'dimmi', 'opentable', 'broadsheet', 'timeout', 'truelocal', 'yellowpages', 'whitepages',
  // Food delivery
  'ubereats', 'doordash', 'menulog', 'zomato',
  // Travel & accommodation
  'booking', 'airbnb', 'expedia',
  // Classifieds & jobs
  'gumtree', 'seek', 'indeed', 'glassdoor',
  // Health & government
  'healthdirect',
  // News & media
  'abc.net', 'smh.com', 'theage.com', 'news.com',
  // Comparison sites
  'choice.com', 'canstar', 'finder.com', 'comparethemarket',
]

function isJunk(domain: string) {
  const d = domain.toLowerCase()
  return JUNK_DOMAINS.some(junk => d.includes(junk))
}


export async function POST(req: NextRequest) {
  const { prospect_id, store_url, niche } = await req.json()
  const domain = store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  console.log('[dataforseo] prospect_id:', prospect_id, 'domain:', domain, 'niche:', niche?.slice(0, 60))

  let overview = null
  let keywords: any[] = []
  let competitors: any[] = []
  let serpFeatures = null
  let contentGap: any[] = []
  let keywordTrends: any[] | null = null
  const backlinksSummary: any = null // disabled - requires separate DataForSEO subscription

  // ── Phase 1: overview + keywords + competitors in parallel ──
  const [overviewRes, keywordsRes, competitorsRes] = await Promise.allSettled([
    dfsPost('/dataforseo_labs/google/domain_rank_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }]),
    dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 50, order_by: ['ranked_serp_element.serp_item.rank_group,asc'] }]),
    dfsPost('/dataforseo_labs/google/competitors_domain/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 10 }]),
  ])

  if (overviewRes.status === 'fulfilled') {
    overview = overviewRes.value?.tasks?.[0]?.result?.[0] ?? null
    console.log('[dataforseo] overview:', overview ? 'ok' : 'null')
  } else {
    console.error('[dataforseo] overview failed:', (overviewRes as PromiseRejectedResult).reason?.message)
  }

  if (keywordsRes.status === 'fulfilled') {
    keywords = keywordsRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log('[dataforseo] keywords count:', keywords.length)
  } else {
    console.error('[dataforseo] keywords failed:', (keywordsRes as PromiseRejectedResult).reason?.message)
  }

  if (competitorsRes.status === 'fulfilled') {
    const raw: any[] = competitorsRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
    raw.forEach((c: any) => {
      const etv = c.full_domain_metrics?.organic?.etv ?? 0
      console.log(`[dataforseo] competitor candidate: ${c.domain} etv=${Math.round(etv)}`)
    })
    competitors = raw.filter((c: any) => {
      const d = (c.domain ?? '').toLowerCase()
      const etv = c.full_domain_metrics?.organic?.etv ?? 0
      return !isJunk(d) && etv <= 50_000_000 && d !== domain.toLowerCase()
    }).slice(0, 5)
    console.log('[dataforseo] competitors after filter:', competitors.map((c: any) => c.domain))
  } else {
    console.error('[dataforseo] competitors failed:', (competitorsRes as PromiseRejectedResult).reason?.message)
  }

  // ── UPGRADE 4: Niche-based SERP competitor discovery if < 3 clean competitors ──
  if (competitors.length < 3 && niche && niche.length >= 15) {
    try {
      console.log('[dataforseo] < 3 competitors, trying niche SERP search:', niche.slice(0, 60))
      const serpRes = await dfsPost('/serp/google/organic/live/advanced', [{
        keyword: niche,
        location_code: 2036,
        language_code: 'en',
        device: 'desktop',
        os: 'windows',
      }])
      const serpItems: any[] = serpRes?.tasks?.[0]?.result?.[0]?.items ?? []
      const existingDomains = new Set(competitors.map((c: any) => (c.domain ?? '').toLowerCase()))
      existingDomains.add(domain.toLowerCase())
      const supplementary: any[] = []
      for (const item of serpItems) {
        if (competitors.length + supplementary.length >= 5) break
        if (item.type !== 'organic') continue
        const d = (item.domain ?? '').toLowerCase()
        if (!d || isJunk(d) || existingDomains.has(d)) continue
        existingDomains.add(d)
        supplementary.push({ domain: item.domain, niche_source: true })
      }
      if (supplementary.length > 0) {
        competitors = [...competitors, ...supplementary]
        console.log('[dataforseo] after niche SERP, total competitors:', competitors.map((c: any) => c.domain))
      }
    } catch (e: any) {
      console.error('[dataforseo] niche SERP search failed:', e.message)
    }
  }

  // ── FIX 1: Bulk traffic estimation + relative size filter ──
  const competitorDomainsForTraffic: string[] = competitors.map((c: any) => c.domain).filter(Boolean)
  if (competitorDomainsForTraffic.length > 0) {
    try {
      const btRes = await dfsPost('/dataforseo_labs/google/bulk_traffic_estimation/live', [{
        targets: competitorDomainsForTraffic,
        location_code: 2036,
        language_code: 'en',
        item_types: ['organic'],
      }])
      const btItems: any[] = btRes?.tasks?.[0]?.result?.[0]?.items ?? []
      const trafficMap = new Map<string, number>()
      for (const item of btItems) {
        trafficMap.set((item.target ?? '').toLowerCase(), item.metrics?.organic?.etv ?? 0)
      }
      // Augment each competitor with fetched traffic
      competitors = competitors.map((c: any) => {
        const etv = trafficMap.get((c.domain ?? '').toLowerCase()) ?? null
        return etv != null ? { ...c, estimated_traffic: etv } : c
      })
      // Relative size filter: remove if traffic > 1,000,000 AND > 50x prospect traffic.
      // Using both conditions keeps small niche competitors (traffic=0 from bulk estimate)
      // while still removing Bunnings-scale outliers regardless of prospect size.
      const prospectEtv = overview?.metrics?.organic?.etv ?? 0
      competitors = competitors.filter((c: any) => {
        const cEtv = c.estimated_traffic ?? 0
        if (cEtv > 1_000_000 && (prospectEtv === 0 || cEtv > prospectEtv * 50)) {
          console.log(`[dataforseo] removing oversized competitor: ${c.domain} (traffic: ${Math.round(cEtv)}${prospectEtv > 0 ? `, ${Math.round(cEtv / prospectEtv)}x prospect` : ''})`)
          return false
        }
        return true
      })
      console.log('[dataforseo] competitors after size filter:', competitors.map((c: any) => c.domain))
    } catch (e: any) {
      console.error('[dataforseo] bulk traffic estimation failed:', e.message)
    }
  }

  // ── FIX 2: Sort niche-discovered competitors first for better content gap analysis ──
  competitors.sort((a: any, b: any) => {
    if (a.niche_source && !b.niche_source) return -1
    if (!a.niche_source && b.niche_source) return 1
    return 0
  })

  const topCompetitor = competitors[0]?.domain ?? null

  // Date for historical keywords: 3 months ago
  const dateFrom = new Date()
  dateFrom.setMonth(dateFrom.getMonth() - 3)
  const dateFromStr = dateFrom.toISOString().split('T')[0]

  // ── Phase 2: all dependent calls in parallel ──
  const phase2Calls: Promise<any>[] = [
    // 0: Historical keyword positions (UPGRADE 2)
    keywords.length > 0
      ? dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{
          target: domain,
          location_code: 2036,
          language_code: 'en',
          limit: 50,
          order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
          historical_serp_mode: true,
          date_from: dateFromStr,
        }])
      : Promise.resolve(null),
    // 1: Domain intersection with top competitor
    topCompetitor
      ? dfsPost('/dataforseo_labs/google/domain_intersection/live', [{ target1: domain, target2: topCompetitor, location_code: 2036, language_code: 'en', limit: 10 }])
      : Promise.resolve(null),
    // 2: Content gap via keywords_for_site on top competitor
    topCompetitor
      ? dfsPost('/dataforseo_labs/google/keywords_for_site/live', [{ target: topCompetitor, location_code: 2036, language_code: 'en', limit: 10 }])
      : Promise.resolve(null),
  ]

  const phase2Results = await Promise.allSettled(phase2Calls)
  const [histRes, intersectRes, contentGapRes] = phase2Results

  // Process historical keywords → build trend deltas
  if (histRes.status === 'fulfilled' && histRes.value) {
    try {
      const histItems: any[] = histRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
      console.log('[dataforseo] historical keywords count:', histItems.length)
      const histMap = new Map<string, number>()
      for (const item of histItems) {
        const kw = item.keyword_data?.keyword
        const pos = item.ranked_serp_element?.serp_item?.rank_group
        if (kw && pos != null) histMap.set(kw, pos)
      }
      keywordTrends = keywords.map((item: any) => {
        const kw = item.keyword_data?.keyword
        const currentPos = item.ranked_serp_element?.serp_item?.rank_group ?? null
        const prevPos = kw ? (histMap.get(kw) ?? null) : null
        // delta > 0 = gained positions (lower number is better), delta < 0 = lost positions
        const delta = (prevPos != null && currentPos != null) ? prevPos - currentPos : null
        return { keyword: kw, current_pos: currentPos, prev_pos: prevPos, delta }
      })
      console.log('[dataforseo] trends computed:', keywordTrends.length)
    } catch (e: any) {
      console.error('[dataforseo] trends processing failed:', e.message)
    }
  } else if (histRes.status === 'rejected') {
    console.log('[dataforseo] historical keywords not available (plan/endpoint):', (histRes as PromiseRejectedResult).reason?.message)
  }

  // Process domain intersection
  if (intersectRes.status === 'fulfilled' && intersectRes.value) {
    serpFeatures = intersectRes.value?.tasks?.[0]?.result?.[0] ?? null
    console.log('[dataforseo] serp features:', serpFeatures ? 'ok' : 'null')
  }

  // Process content gap
  if (contentGapRes.status === 'fulfilled' && contentGapRes.value) {
    contentGap = contentGapRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log('[dataforseo] content gap count:', contentGap.length)
  }

  // Backlinks disabled - requires separate DataForSEO subscription (returns 40204)
  // backlinksSummary remains null

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      dataforseo_overview: overview,
      dataforseo_keywords: keywords,
      dataforseo_gaps: null,
      dataforseo_competitors: competitors.length > 0 ? competitors : [],
      dataforseo_serp_features: serpFeatures,
      dataforseo_content_gap: contentGap.length > 0 ? contentGap : null,
      // New columns - must be added to audit_data_cache in Supabase dashboard:
      //   dataforseo_keyword_trends  JSONB
      //   backlinks_summary          JSONB
      dataforseo_keyword_trends: keywordTrends && keywordTrends.length > 0 ? keywordTrends : null,
      backlinks_summary: backlinksSummary,
    }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo] Supabase write success')

  return NextResponse.json({
    success: true,
    keywords: keywords.length,
    competitors: competitors.length,
    contentGap: contentGap.length,
    trends: keywordTrends?.length ?? 0,
    backlinks: backlinksSummary?.rank ?? null,
  })
}
