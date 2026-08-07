import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'
const PLACE_ID_WAIT_INTERVAL_MS = 2_000
const PLACE_ID_WAIT_MAX_MS = 25_000 // headroom inside this route's own 60s budget, under gmb's own 30s call timeout

// Fires the two async DataForSEO business_data task_post calls (reviews,
// GBP updates) once the GMB lookup has resolved a place_id - reusing that
// resolved identity rather than each having reviews/updates independently
// search by keyword. A generic local-business name ("Flourlane Cakes") can
// match a different business per independent search; reusing one resolved
// place_id keeps reviews and updates describing the same business the GMB
// card itself describes. If GMB comes back not-found, or hasn't landed
// within the wait window, reviews/updates are skipped entirely rather than
// falling back to their own keyword search - no reviews beats someone
// else's reviews.
//
// Both calls use postback_url (not polling) - DataForSEO POSTs the actual
// result to the given URL whenever the task completes, high-priority
// (~1 min) or not. This keeps this route's own runtime short: it fires two
// task_post requests and returns, it does not wait for their results.
async function waitForPlaceId(prospect_id: string): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < PLACE_ID_WAIT_MAX_MS) {
    const { data: cache } = await supabaseAdmin
      .from('audit_data_cache')
      .select('gmb_data')
      .eq('prospect_id', prospect_id)
      .single()

    if (cache?.gmb_data != null) {
      const gmbData = cache.gmb_data as any
      return gmbData?.found && gmbData?.place_id ? gmbData.place_id : null
    }
    await new Promise(resolve => setTimeout(resolve, PLACE_ID_WAIT_INTERVAL_MS))
  }
  console.warn('[dataforseo-gmb-tasks] gmb_data did not land within', PLACE_ID_WAIT_MAX_MS, 'ms - skipping reviews/updates')
  return null
}

async function fireTask(
  path: string,
  body: Record<string, any>,
): Promise<{ taskId: string | null; ok: boolean }> {
  try {
    const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
    const res = await fetch(`${DATAFORSEO_BASE}${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([body]),
    })
    const json = await res.json()
    const task = json?.tasks?.[0]
    console.log(`[dataforseo-gmb-tasks] ${path} status:`, task?.status_code, task?.status_message, 'id:', task?.id)
    return { taskId: task?.id ?? null, ok: !!task?.id }
  } catch (e: any) {
    console.error(`[dataforseo-gmb-tasks] ${path} failed:`, e.message)
    return { taskId: null, ok: false }
  }
}

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[dataforseo-gmb-tasks] route hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  const placeId = await waitForPlaceId(prospect_id)

  if (!placeId) {
    await supabaseAdmin
      .from('audit_data_cache')
      .upsert({
        prospect_id,
        gmb_reviews_status: 'no_place_id',
        gmb_updates_status: 'no_place_id',
      }, { onConflict: 'prospect_id' })
    return NextResponse.json({ success: true, fired: false, reason: 'no_place_id' })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const secret = process.env.DATAFORSEO_WEBHOOK_SECRET
  const reviewsPostback = `${base}/api/audit/dataforseo-gmb-reviews-webhook?prospect_id=${prospect_id}&secret=${secret}`
  const updatesPostback = `${base}/api/audit/dataforseo-gmb-updates-webhook?prospect_id=${prospect_id}&secret=${secret}`

  const [reviews, updates] = await Promise.all([
    fireTask('/business_data/google/reviews/task_post', {
      keyword: `place_id:${placeId}`,
      location_name: 'Australia',
      language_code: 'en',
      depth: 100,
      sort_by: 'newest',
      priority: 2,
      postback_url: reviewsPostback,
      postback_data: 'regular',
    }),
    fireTask('/business_data/google/my_business_updates/task_post', {
      keyword: `place_id:${placeId}`,
      location_name: 'Australia',
      language_code: 'en',
      priority: 2,
      postback_url: updatesPostback,
      postback_data: 'regular',
    }),
  ])

  await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      gmb_reviews_status: reviews.ok ? 'pending' : 'failed',
      gmb_reviews_task_id: reviews.taskId,
      gmb_updates_status: updates.ok ? 'pending' : 'failed',
      gmb_updates_task_id: updates.taskId,
    }, { onConflict: 'prospect_id' })

  return NextResponse.json({ success: true, fired: true, reviews: reviews.ok, updates: updates.ok })
}
