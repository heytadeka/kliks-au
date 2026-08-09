import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normaliseDomain } from '@/lib/domain-normalise'
import { detectLocalTarget } from '@/lib/local-target'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

async function dfsPost(path: string, body: any[]) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const url = `${DATAFORSEO_BASE}${path}`
  console.log('[dataforseo-core] POST', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    console.error('[dataforseo-core] HTTP error', res.status, JSON.stringify(json))
    throw new Error(`DataForSEO error: ${res.status}`)
  }
  const taskStatus = json?.tasks?.[0]?.status_code
  if (taskStatus && taskStatus !== 20000) {
    console.error('[dataforseo-core] task error', taskStatus, json?.tasks?.[0]?.status_message)
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

// AU_CITY_MAP / detectLocalTarget extracted to lib/local-target.ts so the
// LLM Visibility Check's query builder can reuse the exact same city
// detection instead of a second copy.

// Returns true if the domain clearly signals a different AU city than the prospect's
function isOtherCityDomain(domain: string, cityTerm: string): boolean {
  const d = domain.toLowerCase()
  const cityNames = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'hobart', 'darwin']
  return cityNames.filter(c => c !== cityTerm).some(c => d.includes(c))
}

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  // Fetch prospect record
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('store_url, brand_name, niche, location')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { store_url, brand_name: brandNameRaw_db, niche, location } = prospect
  const domain = store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  // Same normalisation as the domain derivation above (protocol, www, trailing
  // slash), plus stripping any path/query/fragment down to the bare host -
  // used for every self-exclusion and dedup comparison below. The prior
  // version only stripped www., so a competitor domain returned by DataForSEO
  // in a slightly different string shape than store_url's own normalisation
  // could silently fail the equality check and let the prospect's own domain
  // through as a "competitor." Extracted to lib/domain-normalise.ts so other
  // call sites (LLM-visibility mention detection) share the same function.
  const normalise = normaliseDomain
  const normalisedDomain = normalise(domain)

  console.log('[dataforseo-core] prospect_id:', prospect_id, 'domain:', domain, 'niche:', niche?.slice(0, 60))

  let overview = null
  let keywords: any[] = []
  let keywordsTotalCount: number | null = null
  let competitors: any[] = []
  let serpFeatures = null
  let contentGap: any[] = []

  // ── Phase 1: overview + keywords in parallel ──
  const [overviewRes, keywordsRes] = await Promise.allSettled([
    dfsPost('/dataforseo_labs/google/domain_rank_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }]),
    dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 50, order_by: ['ranked_serp_element.serp_item.rank_group,asc'] }]),
  ])

  if (overviewRes.status === 'fulfilled') {
    overview = overviewRes.value?.tasks?.[0]?.result?.[0] ?? null
    console.log('[dataforseo-core] overview:', overview ? 'ok' : 'null')
  } else {
    console.error('[dataforseo-core] overview failed:', (overviewRes as PromiseRejectedResult).reason?.message)
  }

  if (keywordsRes.status === 'fulfilled') {
    const keywordsResult0 = keywordsRes.value?.tasks?.[0]?.result?.[0]
    keywords = keywordsResult0?.items ?? []
    keywordsTotalCount = keywordsResult0?.total_count ?? null
    console.log('[dataforseo-core] keywords count:', keywords.length, 'total_count:', keywordsTotalCount)
  } else {
    console.error('[dataforseo-core] keywords failed:', (keywordsRes as PromiseRejectedResult).reason?.message)
  }

  // Brand name
  const brandNameRaw: string = brandNameRaw_db ?? domain
  const brandNameClean = brandNameRaw
    .toLowerCase()
    .replace(/\.com\.au$/, '')
    .replace(/\.com$/, '')
    .replace(/\.au$/, '')
    .trim()
  console.log('[dataforseo-core] brand name for filtering:', brandNameClean)

  // ── Local target detection (location field, falling back to niche text) ──
  const { isLocal, cityTerm, localCode } = detectLocalTarget(niche, location)
  console.log('[dataforseo-core] location focus:', isLocal ? `local (${cityTerm})` : 'national', '- niche:', niche?.slice(0, 40) ?? 'none', '- location:', location ?? 'none')

  // ── SERP Competitors (primary competitor discovery) ──
  // When local, city-containing keywords go first so SERP competitors are geographically biased
  const topKwStrings = [...keywords]
    .sort((a: any, b: any) => {
      if (isLocal && cityTerm) {
        const aCity = (a.keyword_data?.keyword ?? '').toLowerCase().includes(cityTerm) ? 1 : 0
        const bCity = (b.keyword_data?.keyword ?? '').toLowerCase().includes(cityTerm) ? 1 : 0
        if (aCity !== bCity) return bCity - aCity
      }
      return (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0)
    })
    .map((item: any) => item.keyword_data?.keyword)
    .filter((kw: string | undefined): kw is string => !!kw && !kw.toLowerCase().includes(brandNameClean))
    .slice(0, 10)

  console.log('[dataforseo-core] non-branded keywords for SERP competitors:', topKwStrings.length)

  if (topKwStrings.length >= 3) {
    try {
      console.log('[dataforseo-core] SERP competitors using', topKwStrings.length, 'keywords, location_code:', isLocal ? localCode : 2036)
      const serpCompRes = await dfsPost('/dataforseo_labs/google/serp_competitors/live', [{
        keywords: topKwStrings,
        location_code: isLocal ? localCode : 2036,
        language_code: 'en',
      }])
      const serpCompItems: any[] = serpCompRes?.tasks?.[0]?.result?.[0]?.items ?? []
      console.log('[dataforseo-core] serp competitors raw count:', serpCompItems.length)
      if (serpCompItems[0]) {
        const s = serpCompItems[0]
        console.log('[dataforseo-core] serp competitor sample fields:', JSON.stringify({
          domain: s.domain, avg_position: s.avg_position, visibility: s.visibility,
          keywords_count: s.keywords_count, intersections: s.intersections, etv: s.etv,
        }))
      }
      competitors = serpCompItems
        .filter((item: any) => {
          const d = normalise(item.domain ?? '')
          const kwCount = item.keywords_count ?? item.intersections ?? 0
          return d !== normalisedDomain && !isJunk(d) && kwCount >= 2
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
        console.log('[dataforseo-core] serp competitor mapped sample:', JSON.stringify(competitors[0]))
      }
      console.log('[dataforseo-core] serp competitors after filter:', competitors.map((c: any) => c.domain))
    } catch (e: any) {
      console.error('[dataforseo-core] serp competitors failed:', e.message)
    }
  } else {
    console.log('[dataforseo-core] insufficient non-branded keywords (' + topKwStrings.length + '), skipping SERP competitors')
  }

  // ── Niche-based SERP fallback if < 3 clean competitors ──
  if (competitors.length < 3 && niche && niche.length >= 15) {
    try {
      console.log('[dataforseo-core] < 3 competitors, trying niche SERP search:', niche.slice(0, 60))
      const serpRes = await dfsPost('/serp/google/organic/live/advanced', [{
        keyword: niche,
        location_code: isLocal ? localCode : 2036,
        language_code: 'en',
        device: 'desktop',
        os: 'windows',
      }])
      const serpItems: any[] = serpRes?.tasks?.[0]?.result?.[0]?.items ?? []
      const existingDomains = new Set(competitors.map((c: any) => normalise(c.domain ?? '')))
      existingDomains.add(normalisedDomain)
      const supplementary: any[] = []
      for (const item of serpItems) {
        if (competitors.length + supplementary.length >= 5) break
        if (item.type !== 'organic') continue
        const dn = normalise(item.domain ?? '')
        if (!dn || isJunk(dn) || existingDomains.has(dn)) continue
        existingDomains.add(dn)
        supplementary.push({ domain: item.domain, niche_source: true })
      }
      if (supplementary.length > 0) {
        competitors = [...competitors, ...supplementary]
        console.log('[dataforseo-core] after niche SERP, total competitors:', competitors.map((c: any) => c.domain))
      }
    } catch (e: any) {
      console.error('[dataforseo-core] niche SERP search failed:', e.message)
    }
  }

  // ── Bulk traffic estimation ──
  const competitorDomainsForTraffic: string[] = competitors.map((c: any) => c.domain).filter(Boolean)
  if (competitorDomainsForTraffic.length > 0) {
    try {
      const btRes = await dfsPost('/dataforseo_labs/google/bulk_traffic_estimation/live', [{
        targets: competitorDomainsForTraffic,
        location_code: 2036, // country-level only, city codes not supported by this endpoint
        language_code: 'en',
        item_types: ['organic'],
      }])
      const btItems: any[] = btRes?.tasks?.[0]?.result?.[0]?.items ?? []
      const trafficMap = new Map<string, number>()
      for (const item of btItems) {
        trafficMap.set((item.target ?? '').toLowerCase(), item.metrics?.organic?.etv ?? 0)
      }
      competitors = competitors.map((c: any) => {
        const etv = trafficMap.get((c.domain ?? '').toLowerCase()) ?? null
        return etv != null ? { ...c, estimated_traffic: etv } : c
      })
      // Relative size filter: remove if traffic > 1,000,000 AND > 50x prospect traffic
      const prospectEtv = overview?.metrics?.organic?.etv ?? 0
      competitors = competitors.filter((c: any) => {
        const cEtv = c.estimated_traffic ?? 0
        if (cEtv > 1_000_000 && (prospectEtv === 0 || cEtv > prospectEtv * 50)) {
          console.log(`[dataforseo-core] removing oversized competitor: ${c.domain} (traffic: ${Math.round(cEtv)}${prospectEtv > 0 ? `, ${Math.round(cEtv / prospectEtv)}x prospect` : ''})`)
          return false
        }
        return true
      })
      console.log('[dataforseo-core] competitors after size filter:', competitors.map((c: any) => c.domain))
    } catch (e: any) {
      console.error('[dataforseo-core] bulk traffic estimation failed:', e.message)
    }
  }

  // ── Local city filter: drop other-city competitors for local stores ──
  if (isLocal && cityTerm) {
    const beforeCount = competitors.length
    competitors = competitors.filter((c: any) => !isOtherCityDomain(c.domain ?? '', cityTerm))
    if (competitors.length < beforeCount) {
      console.log(`[dataforseo-core] dropped ${beforeCount - competitors.length} other-city competitor(s)`)
    }
  }
  console.log('[dataforseo-core] competitors after local filter:', competitors.map((c: any) => c.domain))

  // Sort: serp_source items first (by traffic desc), niche fallback items last
  competitors.sort((a: any, b: any) => {
    if (a.serp_source && !b.serp_source) return -1
    if (!a.serp_source && b.serp_source) return 1
    return (b.estimated_traffic ?? 0) - (a.estimated_traffic ?? 0)
  })

  const topCompetitor = competitors[0]?.domain ?? null

  // ── Phase 2: domain intersection + content gap in parallel ──
  const [intersectRes, contentGapRes] = await Promise.allSettled([
    topCompetitor
      ? dfsPost('/dataforseo_labs/google/domain_intersection/live', [{ target1: domain, target2: topCompetitor, location_code: 2036, language_code: 'en', limit: 10 }])
      : Promise.resolve(null),
    topCompetitor
      ? dfsPost('/dataforseo_labs/google/keywords_for_site/live', [{ target: topCompetitor, location_code: 2036, language_code: 'en', limit: 10 }])
      : Promise.resolve(null),
  ])

  if (intersectRes.status === 'fulfilled' && intersectRes.value) {
    serpFeatures = intersectRes.value?.tasks?.[0]?.result?.[0] ?? null
    console.log('[dataforseo-core] serp features:', serpFeatures ? 'ok' : 'null')
  }

  if (contentGapRes.status === 'fulfilled' && contentGapRes.value) {
    contentGap = contentGapRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log('[dataforseo-core] content gap count:', contentGap.length)
  }

  // ── Volume enrichment for content gap keywords ──
  if (contentGap.length > 0) {
    try {
      const kwStrings: string[] = contentGap
        .map((item: any) => item.keyword_data?.keyword ?? item.keyword)
        .filter(Boolean)
        .slice(0, 100)
      if (kwStrings.length > 0) {
        console.log('[dataforseo-core] enriching content gap volumes for', kwStrings.length, 'keywords')
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
        console.log('[dataforseo-core] content gap volume enrichment done:', volMap.size, 'matched of', kwStrings.length)
      }
    } catch (e: any) {
      console.error('[dataforseo-core] content gap volume enrichment failed (non-blocking):', e.message)
    }
  }

  // ── Merge keywords_total_count into the overview object ──
  // Stored alongside the existing domain_rank_overview metrics rather than a new
  // column, since it's just one extra number and every reader of dataforseo_overview
  // already treats it as a loosely-typed object.
  const overviewToStore = keywordsTotalCount != null
    ? { ...(overview ?? {}), keywords_total_count: keywordsTotalCount }
    : overview

  // ── Write core data to cache ──
  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      dataforseo_overview: overviewToStore,
      dataforseo_keywords: keywords,
      dataforseo_gaps: null,
      dataforseo_competitors: competitors.length > 0 ? competitors : [],
      dataforseo_serp_features: serpFeatures,
      dataforseo_content_gap: contentGap.length > 0 ? contentGap : null,
      backlinks_summary: null, // disabled - requires separate DataForSEO subscription
    }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo-core] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-core] Supabase write success')

  return NextResponse.json({
    success: true,
    keywords: keywords.length,
    competitors: competitors.length,
    contentGap: contentGap.length,
  })
}
