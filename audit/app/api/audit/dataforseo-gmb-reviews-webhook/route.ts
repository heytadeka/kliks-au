import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWebhookSecret, getProspectIdFromPostback, parsePostbackBody } from '@/lib/dataforseo-postback'

export const maxDuration = 30

// Receives DataForSEO's postback once the reviews task_post call completes
// (high priority, so typically within about a minute - see
// dataforseo-gmb-tasks/route.ts for why place_id is resolved once there and
// reused, rather than this route re-resolving its own identifier). Must
// respond well within DataForSEO's 10s postback deadline, so this only
// parses and stores - nothing else happens inline.
//
// Phase 4 hook point: once real review data lands here, this is where a
// separate, additive AI commentary call for the Google Business section
// gets triggered (waitUntil, non-blocking) - reviews are the long-pole
// item in this bundle, so by the time this fires, gmb_qa (synchronous,
// arrives earlier) is already sitting in audit_data_cache ready to read
// into the same prompt. Not built yet - Phase 2 is fetch-and-store only.
export async function POST(req: NextRequest) {
  const prospect_id = getProspectIdFromPostback(req)
  console.log('[dataforseo-gmb-reviews-webhook] hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })
  if (!verifyWebhookSecret(req)) {
    console.warn('[dataforseo-gmb-reviews-webhook] secret mismatch, rejecting')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let items: any[] | null = null
  try {
    const json = await parsePostbackBody(req)
    const task = json?.tasks?.[0]
    console.log('[dataforseo-gmb-reviews-webhook] task status:', task?.status_code, task?.status_message)
    items = task?.result?.[0]?.items ?? []
    console.log('[dataforseo-gmb-reviews-webhook] items:', items?.length ?? 0)
  } catch (e: any) {
    console.error('[dataforseo-gmb-reviews-webhook] failed to parse postback body:', e.message)
  }

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .update({
      gmb_reviews: items,
      gmb_reviews_status: items != null ? 'ready' : 'failed',
      gmb_reviews_fetched_at: new Date().toISOString(),
    })
    .eq('prospect_id', prospect_id)

  if (dbError) console.error('[dataforseo-gmb-reviews-webhook] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-gmb-reviews-webhook] stored, count:', items?.length ?? 0)

  // Phase 4: trigger the separate GBP-commentary generation here once built.

  return NextResponse.json({ success: true })
}
