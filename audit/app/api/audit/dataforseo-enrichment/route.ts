import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

async function dfsPost(path: string, body: any[]) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const url = `${DATAFORSEO_BASE}${path}`
  console.log('[dataforseo-enrichment] POST', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    console.error('[dataforseo-enrichment] HTTP error', res.status, JSON.stringify(json))
    throw new Error(`DataForSEO error: ${res.status}`)
  }
  const taskStatus = json?.tasks?.[0]?.status_code
  if (taskStatus && taskStatus !== 20000) {
    console.error('[dataforseo-enrichment] task error', taskStatus, json?.tasks?.[0]?.status_message)
  }
  return json
}

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  // Fetch prospect record
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('store_url, brand_name')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { store_url, brand_name: brandNameRaw } = prospect
  const domain = store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  console.log('[dataforseo-enrichment] prospect_id:', prospect_id, 'domain:', domain)

  let keywordTrends: any[] | null = null
  let gmbData: Record<string, any> = { found: false }

  // Date for historical: 3 months ago
  const dateFrom = new Date()
  dateFrom.setMonth(dateFrom.getMonth() - 3)
  const dateFromStr = dateFrom.toISOString().split('T')[0]

  // ── Phase 1 (parallel): current keywords + historical keywords ──
  // GMB is NOT included here — it can hang indefinitely and has its own timeout below
  const [currentKwRes, histRes] = await Promise.allSettled([
    dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{
      target: domain,
      location_code: 2036,
      language_code: 'en',
      limit: 50,
      order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
    }]),
    dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{
      target: domain,
      location_code: 2036,
      language_code: 'en',
      limit: 50,
      order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
      historical_serp_mode: true,
      date_from: dateFromStr,
    }]),
  ])

  // Process keyword trends
  let keywords: any[] = []
  if (currentKwRes.status === 'fulfilled') {
    keywords = currentKwRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log('[dataforseo-enrichment] current keywords count:', keywords.length)
  } else {
    console.error('[dataforseo-enrichment] current keywords failed:', (currentKwRes as PromiseRejectedResult).reason?.message)
  }

  if (histRes.status === 'fulfilled' && histRes.value) {
    try {
      const histItems: any[] = histRes.value?.tasks?.[0]?.result?.[0]?.items ?? []
      console.log('[dataforseo-enrichment] historical keywords count:', histItems.length)
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
      console.log('[dataforseo-enrichment] trends computed:', keywordTrends.length)
    } catch (e: any) {
      console.error('[dataforseo-enrichment] trends processing failed:', e.message)
    }
  } else if (histRes.status === 'rejected') {
    console.log('[dataforseo-enrichment] historical keywords not available (plan/endpoint):', (histRes as PromiseRejectedResult).reason?.message)
  }

  // ── GMB lookup with 10s hard timeout (non-blocking on failure) ──
  try {
    const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
    const gmbController = new AbortController()
    const gmbTimeout = setTimeout(() => gmbController.abort(), 10_000)
    const gmbFetch = await fetch(`${DATAFORSEO_BASE}/business_data/google/my_business_info/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword: brandNameRaw ?? domain, location_name: 'Australia', language_code: 'en' }]),
      signal: gmbController.signal,
    })
    clearTimeout(gmbTimeout)
    const gmbJson = await gmbFetch.json()
    const gmbResult = gmbJson?.tasks?.[0]?.result?.[0]?.items?.[0] ?? null
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
    console.log('[dataforseo-enrichment] gmb:', gmbData.found ? `found (${gmbData.rating}★, ${gmbData.review_count} reviews)` : 'not found')
  } catch (e: any) {
    const isTimeout = e.name === 'AbortError'
    console.log('[dataforseo-enrichment] gmb: ' + (isTimeout ? 'timed out after 10s, skipping' : `failed - ${e.message}`))
    // gmbData stays { found: false } — continue to write + commentary regardless
  }

  // ── Write enrichment data to cache ──
  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      dataforseo_keyword_trends: keywordTrends && keywordTrends.length > 0 ? keywordTrends : null,
      gmb_data: gmbData,
    }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo-enrichment] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-enrichment] Supabase write success')

  // ── Fire generate-commentary in background (non-blocking) ──
  // Core data is written by dataforseo-core (~25-30s); this route writes at ~15-20s.
  // Commentary reads the merged cache after both writes are complete.
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }
  waitUntil(
    fetch(`${base}/api/audit/generate-commentary`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ prospect_id }),
    })
      .then(r => console.log('[dataforseo-enrichment] commentary triggered, status:', r.status))
      .catch((e: any) => console.error('[dataforseo-enrichment] commentary trigger failed:', e.message))
  )

  return NextResponse.json({
    success: true,
    trends: keywordTrends?.length ?? 0,
    gmb: gmbData.found,
  })
}
