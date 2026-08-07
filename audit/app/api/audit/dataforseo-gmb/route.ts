import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildGmbKeyword } from '@/lib/gmb-keyword'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[dataforseo-gmb] route hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('store_url, brand_name, gmb_cid')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { store_url, brand_name: brandNameRaw, gmb_cid } = prospect
  const domain = store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  const gmbKeyword = buildGmbKeyword(gmb_cid ?? null, brandNameRaw ?? null, domain)
  console.log('[dataforseo-gmb] gmb keyword:', gmbKeyword)

  let gmbData: Record<string, any> = { found: false }

  try {
    const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const res = await fetch(`${DATAFORSEO_BASE}/business_data/google/my_business_info/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword: gmbKeyword, location_name: 'Australia', language_code: 'en' }]),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const json = await res.json()
    console.log('[dataforseo-gmb] gmb raw status:', json?.tasks?.[0]?.status_code, json?.tasks?.[0]?.status_message)
    console.log('[dataforseo-gmb] gmb result count:', json?.tasks?.[0]?.result?.length ?? 0)
    const item = json?.tasks?.[0]?.result?.[0]?.items?.[0] ?? null
    if (item) {
      gmbData = {
        found: true,
        rating: item.rating?.value ?? null,
        review_count: item.rating?.votes_count ?? null,
        category: item.category ?? null,
        address: item.address ?? null,
        phone: item.phone ?? null,
        is_claimed: item.is_claimed ?? null,
        place_id: item.place_id ?? null,
      }
    }
    console.log('[dataforseo-gmb] gmb:', gmbData.found ? `found (${gmbData.rating}★, ${gmbData.review_count} reviews)` : 'not found')
  } catch (e: any) {
    const isTimeout = e.name === 'AbortError'
    console.log('[dataforseo-gmb] gmb: ' + (isTimeout ? 'timed out after 30s' : `failed - ${e.message}`))
  }

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({ prospect_id, gmb_data: gmbData }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo-gmb] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-gmb] Supabase write success, found:', gmbData.found)

  return NextResponse.json({ success: true, gmb: gmbData.found })
}
