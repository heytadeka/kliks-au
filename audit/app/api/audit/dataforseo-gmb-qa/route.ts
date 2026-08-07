import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildGmbKeyword } from '@/lib/gmb-keyword'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

// Synchronous (questions_and_answers/live), same shape as dataforseo-gmb -
// own timeout, own budget, fires independently in the create fan-out, not
// gated on readiness. Resolves its own identifier the same way the GMB
// lookup does (gmb_cid if present, else brand name) rather than waiting on
// gmb_data - unlike reviews/updates, a Q&A mismatch is low-stakes (worst
// case: questions for a same-named business elsewhere, not conflated with
// this store's own rating/review data the way reviews would be).
//
// DataForSEO's exact response field names for Q&A items aren't confirmed
// against their docs (repeated 404s on the reference page during Phase 1
// research) - items are stored close to raw shape rather than remapped
// into a guessed custom schema, same principle as dfsKeywords/dfsCompetitors
// elsewhere in this app. Confirm the real shape once a live payload lands.
export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[dataforseo-gmb-qa] route hit — prospect_id:', prospect_id ?? 'missing')

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
  console.log('[dataforseo-gmb-qa] gmb keyword:', gmbKeyword)

  let qaItems: any[] | null = null

  try {
    const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const res = await fetch(`${DATAFORSEO_BASE}/business_data/google/questions_and_answers/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword: gmbKeyword, location_name: 'Australia', language_code: 'en', depth: 20 }]),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const json = await res.json()
    console.log('[dataforseo-gmb-qa] raw status:', json?.tasks?.[0]?.status_code, json?.tasks?.[0]?.status_message)
    qaItems = json?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log('[dataforseo-gmb-qa] items:', qaItems?.length ?? 0)
  } catch (e: any) {
    const isTimeout = e.name === 'AbortError'
    console.log('[dataforseo-gmb-qa]: ' + (isTimeout ? 'timed out after 30s' : `failed - ${e.message}`))
  }

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      gmb_qa: qaItems,
      gmb_qa_fetched_at: new Date().toISOString(),
    }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo-gmb-qa] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-gmb-qa] Supabase write success, count:', qaItems?.length ?? 0)

  return NextResponse.json({ success: true, count: qaItems?.length ?? 0 })
}
