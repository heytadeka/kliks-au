import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

async function dfsPost(path: string, body: any[]) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const url = `${DATAFORSEO_BASE}${path}`
  console.log('[dataforseo] POST', url, JSON.stringify(body))
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

export async function POST(req: NextRequest) {
  const { prospect_id, store_url } = await req.json()
  // Strip protocol, www, and trailing slash - DataForSEO requires bare domain
  const domain = store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  console.log('[dataforseo] prospect_id:', prospect_id, 'domain:', domain)

  let overview = null
  let keywords: any[] = []
  let competitors: any[] = []
  let serpFeatures = null
  let contentGap: any[] = []

  // domain_overview/live not available on this plan - use domain_rank_overview/live instead
  try {
    const res = await dfsPost('/dataforseo_labs/google/domain_rank_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }])
    overview = res?.tasks?.[0]?.result?.[0] ?? null
    console.log('[dataforseo] overview result:', overview ? 'ok' : 'null')
  } catch (e: any) { console.error('[dataforseo] overview failed:', e.message) }

  try {
    const res = await dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 10, order_by: ['keyword_data.keyword_info.search_volume,desc'] }])
    keywords = res?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log('[dataforseo] keywords count:', keywords.length)
  } catch (e: any) { console.error('[dataforseo] keywords failed:', e.message) }

  const JUNK_DOMAINS = ['facebook', 'youtube', 'instagram', 'twitter', 'pinterest', 'amazon', 'ebay', 'etsy', 'google', 'tiktok', 'reddit', 'wikipedia']

  try {
    const res = await dfsPost('/dataforseo_labs/google/competitors_domain/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 10 }])
    const raw: any[] = res?.tasks?.[0]?.result?.[0]?.items ?? []
    competitors = raw.filter((c: any) => {
      const d = (c.domain ?? '').toLowerCase()
      return !JUNK_DOMAINS.some(junk => d.includes(junk))
    }).slice(0, 5)
    console.log('[dataforseo] competitors count (filtered):', competitors.length)
  } catch (e: any) { console.error('[dataforseo] competitors failed:', e.message) }

  const topCompetitor = competitors[0]?.domain ?? null

  if (topCompetitor) {
    try {
      const res = await dfsPost('/dataforseo_labs/google/domain_intersection/live', [{ target1: domain, target2: topCompetitor, location_code: 2036, language_code: 'en', limit: 10 }])
      serpFeatures = res?.tasks?.[0]?.result?.[0] ?? null
      console.log('[dataforseo] serp features result:', serpFeatures ? 'ok' : 'null')
    } catch (e: any) { console.error('[dataforseo] serp features failed:', e.message) }

    try {
      const res = await dfsPost('/dataforseo_labs/google/keyword_gap/live', [{ targets: [domain, topCompetitor], location_code: 2036, language_code: 'en', limit: 10 }])
      contentGap = res?.tasks?.[0]?.result?.[0]?.items ?? []
      console.log('[dataforseo] content gap count:', contentGap.length)
    } catch (e: any) { console.error('[dataforseo] content gap failed:', e.message) }
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
    }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo] Supabase write success')

  return NextResponse.json({ success: true, overview, keywords, competitors: competitors.length, contentGap: contentGap.length })
}
