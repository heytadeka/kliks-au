import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prospect_id } = body
  console.log('[dataforseo-enrichment] route hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  // Fetch prospect record
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('store_url, brand_name, location')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { store_url, brand_name: brandNameRaw, location } = prospect
  const domain = store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  console.log('[dataforseo-enrichment] prospect_id:', prospect_id, 'domain:', domain)

  let gmbData: Record<string, any> = { found: false }

  // Combine brand + location for a precise GMB search (avoids matching same-name brands in other countries)
  const gmbKeyword = location ? `${brandNameRaw} ${location}` : (brandNameRaw ?? domain)
  console.log('[dataforseo-enrichment] gmb keyword:', gmbKeyword)

  // ── GMB lookup with 10s hard timeout (non-blocking on failure) ──
  try {
    const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
    const gmbController = new AbortController()
    const gmbTimeout = setTimeout(() => gmbController.abort(), 10_000)
    const gmbFetch = await fetch(`${DATAFORSEO_BASE}/business_data/google/my_business_info/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword: gmbKeyword, location_code: 2036, language_code: 'en' }]),
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
    gmb: gmbData.found,
  })
}
