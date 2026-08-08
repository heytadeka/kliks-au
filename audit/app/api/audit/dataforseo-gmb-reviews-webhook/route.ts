import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { waitUntil } from '@vercel/functions'
import { verifyWebhookSecret, getProspectIdFromPostback, parsePostbackBody } from '@/lib/dataforseo-postback'

export const maxDuration = 30

// Receives DataForSEO's postback once the reviews task_post call completes
// (high priority, so typically within about a minute - see
// dataforseo-gmb-tasks/route.ts for why place_id is resolved once there and
// reused, rather than this route re-resolving its own identifier). Must
// respond well within DataForSEO's 10s postback deadline, so this only
// parses, stores, and fires the commentary trigger without waiting on it -
// nothing else happens inline.
//
// Once real review data lands, this fires the separate, additive AI
// commentary call for the Google Business section (waitUntil, non-blocking,
// never part of the commentary readiness gate). Reviews are the long-pole
// item in this bundle, so by the time this fires, gmb_qa (synchronous,
// arrives earlier) is already sitting in audit_data_cache ready to read
// into the same prompt.
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

  if (items && items.length > 0) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
    waitUntil(
      fetch(`${base}/api/audit/generate-gmb-commentary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! },
        body: JSON.stringify({ prospect_id }),
      })
        .then(r => console.log('[dataforseo-gmb-reviews-webhook] gmb commentary triggered, status:', r.status))
        .catch((e: any) => console.error('[dataforseo-gmb-reviews-webhook] gmb commentary trigger failed:', e.message))
    )
  }

  return NextResponse.json({ success: true })
}
