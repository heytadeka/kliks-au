import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60

// How long a lock is honoured before being treated as stale and taken over.
// Generously longer than the pipeline's realistic worst case (dataforseo-
// enrichment's own readiness poll caps at 50s, plus commentary's two
// sequential Anthropic calls) so a genuinely still-running scan is never
// pre-empted, but a lock orphaned by a crashed invocation can't block this
// prospect forever either.
const RESCAN_LOCK_TIMEOUT_MS = 120_000

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

  if (prospect.rescan_locked_at) {
    const lockedAgoMs = Date.now() - new Date(prospect.rescan_locked_at).getTime()
    if (lockedAgoMs < RESCAN_LOCK_TIMEOUT_MS) {
      const secondsAgo = Math.max(1, Math.round(lockedAgoMs / 1000))
      return NextResponse.json({
        success: false,
        error: `A rescan is already in progress for this prospect (started ${secondsAgo}s ago). Wait for it to finish before starting another.`,
      }, { status: 409 })
    }
    console.warn('[rescan] found a lock older than the timeout for prospect_id:', prospect_id, '- treating as orphaned and taking over')
  }

  await supabaseAdmin
    .from('prospects')
    .update({ rescan_locked_at: new Date().toISOString() })
    .eq('id', prospect_id)

  // Reset cache
  await supabaseAdmin
    .from('audit_data_cache')
    .update({ crawled_at: null })
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
  waitUntil(fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, niche: prospect.niche, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, brand_name: prospect.brand_name, store_url: prospect.store_url }) }))

  return NextResponse.json({ success: true })
}
