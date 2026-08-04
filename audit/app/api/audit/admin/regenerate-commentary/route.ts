import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'
import { checkRescanLock, setRescanLock } from '@/lib/rescan-lock'

export const maxDuration = 60

// Recovery path for a prospect whose commentary generation was skipped by
// the readiness-timeout fix (dataforseo-enrichment's poll gave up before
// pagespeed/crawl/dataforseo-core all landed). If that data has since
// finished writing - the common case, since the underlying jobs keep
// running even after the poll stops watching them - this fires commentary
// directly: no DataForSEO/PageSpeed re-fetch, just the two Anthropic calls.
// If the data genuinely still isn't there, this does not fall back to a
// full rescan on its own - it says so, and a full rescan is a separate,
// explicit action from here.
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id } = await req.json()
  if (!prospect_id) return NextResponse.json({ error: 'prospect_id required' }, { status: 400 })

  const { data: prospect } = await supabaseAdmin.from('prospects').select('id').eq('id', prospect_id).single()
  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  // Same lock rescan/route.ts uses - a commentary-only regen is still real
  // work against this prospect's row, and must not be allowed to overlap
  // with a rescan (or another regen) already in flight.
  const lock = await checkRescanLock(prospect_id)
  if (lock.locked) {
    return NextResponse.json({
      success: false,
      error: `A scan is already in progress for this prospect (started ${lock.secondsAgo}s ago). Wait for it to finish before trying again.`,
    }, { status: 409 })
  }

  // One-shot check, not a poll - confirms the data is actually there rather
  // than assuming it must be by now. Same three fields, same definition of
  // "ready" as dataforseo-enrichment's own poll.
  const { data: cache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('pagespeed_fetched_at, crawled_at, dataforseo_overview')
    .eq('prospect_id', prospect_id)
    .single()

  const dataReady = !!(cache?.pagespeed_fetched_at && cache?.crawled_at && cache?.dataforseo_overview != null)
  if (!dataReady) {
    return NextResponse.json({
      success: false,
      dataReady: false,
      error: 'The underlying scan data for this prospect is not fully ready yet. Run a full rescan instead.',
    }, { status: 409 })
  }

  await setRescanLock(prospect_id)

  // Keep the persisted readiness signal current - this prospect is no
  // longer sitting in a "timed out" state once this fires. ms is cleared
  // rather than left at the stale figure from the original timeout, since
  // this wasn't a timed wait.
  await supabaseAdmin
    .from('audit_data_cache')
    .update({
      commentary_readiness_status: 'ready',
      commentary_readiness_ms: null,
      commentary_readiness_at: new Date().toISOString(),
    })
    .eq('prospect_id', prospect_id)

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }

  console.log('[regenerate-commentary] firing commentary directly for prospect_id:', prospect_id, '(data already present, no rescan needed)')
  waitUntil(
    fetch(`${base}/api/audit/generate-commentary`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ prospect_id }),
    })
      .then(r => console.log('[regenerate-commentary] commentary triggered, status:', r.status))
      .catch((e: any) => console.error('[regenerate-commentary] commentary trigger failed:', e.message))
  )

  return NextResponse.json({ success: true })
}
