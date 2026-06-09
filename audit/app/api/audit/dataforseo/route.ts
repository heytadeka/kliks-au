import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60
export const preferredRegion = 'syd1'

// Required new columns in audit_data_cache (add in Supabase dashboard before testing):
//   dataforseo_keyword_trends  JSONB
//   backlinks_summary          JSONB

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

function getLocationCode(location: string | null | undefined): number {
  if (!location) return 2036 // Default: Australia
  const l = location.toLowerCase()
  if (l.includes('sydney') || l.includes('nsw') || l.includes('new south wales')) return 21167
  if (l.includes('melbourne') || l.includes('vic') || l.includes('victoria')) return 21182
  if (l.includes('brisbane') || l.includes('qld') || l.includes('queensland')) return 21139
  if (l.includes('perth') || l.includes('wa') || l.includes('western australia')) return 21188
  if (l.includes('adelaide') || l.includes('sa') || l.includes('south australia')) return 21136
  if (l.includes('canberra') || l.includes('act')) return 21124
  if (l.includes('hobart') || l.includes('tas') || l.includes('tasmania')) return 21172
  if (l.includes('darwin') || l.includes('nt') || l.includes('northern territory')) return 21128
  return 2036 // Fallback: Australia
}

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
  'happycow', 'urbanspoon', 'goodfood', 'concrete-playground', 'localsearch', 'storetodoor',
  // Food delivery
  'ubereats', 'doordash', 'menulog', 'zomato', 'deliveroo',
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

  // ── Phase 1: overview + keywords + brand name in parallel ──
  const [overviewRes, keywordsRes, prospectRes] = await Promise.allSettled([
    dfsPost('/dataforseo_labs/google/domain_rank_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }]),
    dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 50, order_by: ['ranked_serp_element.serp_item.rank_group,asc'] }]),
    supabaseAdmin.from('prospects').select('brand_name, location').eq('id', prospect_id).single(),
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

  // Resolve brand name + location from prospect record
  const prospectData = prospectRes.status === 'fulfilled' ? prospectRes.value?.data : null
  const brandNameRaw: string = prospectData?.brand_name ?? domain
  const locationCode = getLocationCode(prospectData?.location ?? null)
  console.log('[dataforseo] location:', prospectData?.location ?? 'none', '→ code:', locationCode)
  const brandNameClean = brandNameRaw
    .toLowerCase()
    .replace(/\.com\.au$/, '')
    .replace(/\.com$/, '')
    .replace(/\.au$/, '')
    .trim()
  console.log('[dataforseo] brand name for filtering:', brandNameClean)

  // ── SERP Competitors (primary competitor discovery) ──
  const topKwStrings = [...keywords]
    .sort((a: any, b: any) => (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0))
    .map((item: any) => item.keyword_data?.keyword)
    .filter((kw: string | undefined): kw is string => !!kw && !kw.toLowerCase().includes(brandNameClean))
    .slice(0, 10)

  console.log('[dataforseo] non-branded keywords for SERP competitors:', topKwStrings.length)

  if (topKwStrings.length >= 3) {
    try {
      console.log('[dataforseo] SERP competitors using', topKwStrings.length, 'keywords')
      const serpCompRes = await dfsPost('/dataforseo_labs/google/serp_competitors/live', [{
        keywords: topKwStrings,
        // location_code not supported by this endpoint — omitted intentionally
        language_code: 'en',
        limit: 10,
      }])
      const serpCompItems: any[] = serpCompRes?.tasks?.[0]?.result?.[0]?.items ?? []
      console.log('[dataforseo] serp competitors raw count:', serpCompItems.length)
      if (serpCompItems[0]) {
        const s = serpCompItems[0]
        console.log('[dataforseo] serp competitor sample fields:', JSON.stringify({
          domain: s.domain, avg_position: s.avg_position, visibility: s.visibility,
          keywords_count: s.keywords_count, intersections: s.intersections, etv: s.etv,
        }))
      }
      competitors = serpCompItems
        .filter((item: any) => {
          const d = (item.domain ?? '').toLowerCase()
          const kwCount = item.keywords_count ?? item.intersections ?? 0
          return d !== domain.toLowerCase() && !isJunk(d) && kwCount >= 2
        })
        .sort((a: any, b: any) => (b.etv ?? 0) - (a.etv ?? 0))
        .slice(0, 6)
        .map((item: any) => ({
          domain: item.domain,
          intersections: item.keywords_count ?? item.intersections ?? null,
          estimated_traffic: item.etv ?? null,
          avg_position: item.avg_position ?? null,
          visibility: item.visibility ?? null,
          full_domain_metrics: null,
          serp_source: true,
        }))
      if (competitors[0]) {
        console.log('[dataforseo] serp competitor mapped sample:', JSON.stringify(competitors[0]))
      }
      console.log('[dataforseo] serp competitors after filter:', competitors.map((c: any) => c.domain))
    } catch (e: any) {
      console.error('[dataforseo] serp competitors failed:', e.message)
    }
  } else {
    console.log('[dataforseo] insufficient non-branded keywords (' + topKwStrings.length + '), skipping SERP competitors')
  }

  // ── Niche-based SERP fallback if < 3 clean competitors ──
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
        location_code: 2036, // country-level only — city codes not supported by this endpoint
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

  // Sort: serp_source items first (by traffic desc), niche fallback items last
  competitors.sort((a: any, b: any) => {
    if (a.serp_source && !b.serp_source) return -1
    if (!a.serp_source && b.serp_source) return 1
    return (b.estimated_traffic ?? 0) - (a.estimated_traffic ?? 0)
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

  // ── Volume enrichment for content gap keywords ──
  // keywords_for_site returns items with search_volume = 0; fetch real AU volumes separately.
  if (contentGap.length > 0) {
    try {
      const kwStrings: string[] = contentGap
        .map((item: any) => item.keyword_data?.keyword ?? item.keyword)
        .filter(Boolean)
        .slice(0, 100)
      if (kwStrings.length > 0) {
        console.log('[dataforseo] enriching content gap volumes for', kwStrings.length, 'keywords')
        const volRes = await dfsPost('/keywords_data/google_ads/search_volume/live', [{
          keywords: kwStrings,
          location_code: 2036,
          language_code: 'en',
        }])
        const volItems: any[] = volRes?.tasks?.[0]?.result ?? []
        const volMap = new Map<string, { search_volume: number; competition: number | null; cpc: number | null }>()
        for (const item of volItems) {
          if (item.keyword) {
            volMap.set(item.keyword.toLowerCase(), {
              search_volume: item.search_volume ?? 0,
              competition: item.competition ?? null,
              cpc: item.cpc ?? null,
            })
          }
        }
        contentGap = contentGap.map((item: any) => {
          const kw = (item.keyword_data?.keyword ?? item.keyword ?? '').toLowerCase()
          const enriched = volMap.get(kw)
          if (!enriched) return item
          return {
            ...item,
            keyword_data: {
              ...(item.keyword_data ?? {}),
              keyword_info: {
                ...(item.keyword_data?.keyword_info ?? {}),
                search_volume: enriched.search_volume,
                competition: enriched.competition,
                cpc: enriched.cpc,
              },
            },
          }
        })
        console.log('[dataforseo] content gap volume enrichment done:', volMap.size, 'matched of', kwStrings.length)
      }
    } catch (e: any) {
      console.error('[dataforseo] content gap volume enrichment failed (non-blocking):', e.message)
    }
  }

  // Backlinks disabled - requires separate DataForSEO subscription (returns 40204)
  // backlinksSummary remains null

  // ── GMB lookup (non-blocking) ──
  let gmbData: Record<string, any> = { found: false }
  try {
    const gmbRes = await dfsPost('/business_data/google/my_business_info/live', [{
      keyword: brandNameRaw,
      location_name: 'Australia',
      language_code: 'en',
    }])
    const gmbResult = gmbRes?.tasks?.[0]?.result?.[0]?.items?.[0] ?? null
    if (gmbResult) {
      gmbData = {
        found: true,
        rating: gmbResult.rating?.value ?? null,
        review_count: gmbResult.rating?.votes_count ?? null,
        category: gmbResult.category ?? null,
        address: gmbResult.address ?? null,
        phone: gmbResult.phone ?? null,
        is_claimed: gmbResult.is_claimed ?? null,
        place_id: gmbResult.place_id ?? null,
      }
    }
    console.log('[dataforseo] gmb:', gmbData.found ? `found (${gmbData.rating}★, ${gmbData.review_count} reviews)` : 'not found')
  } catch (e: any) {
    console.error('[dataforseo] gmb lookup failed (non-fatal):', e.message)
  }

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
      dataforseo_keyword_trends: keywordTrends && keywordTrends.length > 0 ? keywordTrends : null,
      backlinks_summary: backlinksSummary,
      gmb_data: gmbData,
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
