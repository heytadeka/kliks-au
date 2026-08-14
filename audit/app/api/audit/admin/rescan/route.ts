import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60

// How long a lock is honoured before being treated as stale and taken over.
// Generously longer than the pipeline's realistic worst case (dataforseo-
// enrichment's own readiness poll caps at COMMENTARY_READY_MAX_WAIT_MS, see
// lib/commentary-status.ts - currently 52s, plus commentary's own up-to-60s
// maxDuration) so a genuinely still-running scan is never pre-empted, but a
// lock orphaned by a crashed invocation can't block this prospect forever
// either. Kept well above that ~112s worst case, not just barely above it -
// this is the same margin philosophy that made the atomic-lock fix (see git
// history) actually safe, and it has to be re-checked any time either of
// those two inputs changes.
const RESCAN_LOCK_TIMEOUT_MS = 180_000

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prospect_id } = await req.json()

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  // Atomic conditional lock acquisition - a single UPDATE...WHERE, not the
  // previous SELECT-then-check-then-UPDATE. That separation left a real
  // window: two near-simultaneous rescan requests (double-click, a retry)
  // could both read rescan_locked_at as clear before either committed its
  // own update, and both proceed to fire independent fan-outs. Confirmed as
  // the root cause of a real production mismatch on bakealicious-by-gabriela
  // (commentary_readiness_at landing 2.3s before pagespeed_fetched_at - too
  // small to be the original 19-55s stale-data bug, consistent with a second
  // overlapping PageSpeed write landing just after the first commentary
  // generation had already read its data).
  //
  // Postgres only lets one of two concurrent UPDATE...WHERE statements
  // against the same row actually match when the WHERE clause depends on
  // that row's own current state - whichever commits first changes
  // rescan_locked_at, so the second statement's WHERE condition no longer
  // matches and it affects zero rows instead of racing ahead. Checking the
  // returned row (not a separate read) is what makes this safe.
  const staleThreshold = new Date(Date.now() - RESCAN_LOCK_TIMEOUT_MS).toISOString()
  const { data: lockedRows, error: lockError } = await supabaseAdmin
    .from('prospects')
    .update({ rescan_locked_at: new Date().toISOString() })
    .eq('id', prospect_id)
    .or(`rescan_locked_at.is.null,rescan_locked_at.lt.${staleThreshold}`)
    .select('id')

  if (lockError) {
    console.error('[rescan] lock acquisition failed:', JSON.stringify(lockError))
    return NextResponse.json({ success: false, error: 'Failed to acquire rescan lock' }, { status: 500 })
  }

  if (!lockedRows || lockedRows.length === 0) {
    // Someone else holds a live lock right now. secondsAgo is derived from
    // our own earlier read above purely for a human-readable message - in a
    // genuine race that read could be a few milliseconds stale, which is
    // fine here since it's not what gated the decision above.
    const lockedAgoMs = prospect.rescan_locked_at ? Date.now() - new Date(prospect.rescan_locked_at).getTime() : null
    const secondsAgo = lockedAgoMs != null ? Math.max(1, Math.round(lockedAgoMs / 1000)) : null
    return NextResponse.json({
      success: false,
      error: secondsAgo != null
        ? `A rescan is already in progress for this prospect (started ${secondsAgo}s ago). Wait for it to finish before starting another.`
        : `A rescan is already in progress for this prospect. Wait for it to finish before starting another.`,
    }, { status: 409 })
  }

  // Reset the readiness-gate fields the enrichment poll checks for presence
  // (see dataforseo-enrichment/route.ts's waitForCommentaryData). Previously
  // only crawled_at was cleared here - pagespeed_fetched_at and
  // dataforseo_overview kept their prior-scan values, so the poll's
  // "non-null" check was satisfied almost immediately by stale leftover
  // data (crawl finishes fastest, ~15-20s) instead of by this rescan's own
  // fresh writes. Confirmed via commentary_readiness_at landing 19-55s
  // before pagespeed_fetched_at on 12 real prospects - commentary was
  // generated from stale PageSpeed numbers that got silently overwritten
  // moments later, while the score cards (reading the cache live) showed
  // the new numbers. Clearing all three restores the same guarantee a
  // first-time create already has: non-null genuinely means fresh.
  await supabaseAdmin
    .from('audit_data_cache')
    .update({ crawled_at: null, pagespeed_fetched_at: null, dataforseo_overview: null })
    .eq('prospect_id', prospect_id)

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const h = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }

  // Fire all background jobs independently.
  // dataforseo-core: overview, keywords, SERP competitors, content gap (~25-30s)
  // dataforseo-enrichment: polls audit_data_cache until pagespeed/crawl/dataforseo-core
  // have all written, then fires commentary - see that route for details.
  // dataforseo-gmb: dedicated GMB route with 30s timeout and its own 60s budget
  // dataforseo-gmb-qa / dataforseo-gmb-tasks: Google Business reviews/Q&A/updates -
  //   see create/route.ts's fan-out comment, same routes, same reasoning
  // dataforseo-llm-visibility: synchronous, same shape as dataforseo-gmb-qa - see
  //   create/route.ts's fan-out comment
  // Each route fetches the prospect record itself — only prospect_id needed in the payload.
  // generate-commentary clears rescan_locked_at when it finishes, success or failure -
  // that's what actually releases this lock, not a timer here.
  console.log('[rescan] firing background jobs for prospect_id:', prospect_id, 'base:', base)
  waitUntil(fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/crawl`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-core`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-enrichment`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb-qa`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb-tasks`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-llm-visibility`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, niche: prospect.niche, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, brand_name: prospect.brand_name, store_url: prospect.store_url }) }))

  return NextResponse.json({ success: true })
}
