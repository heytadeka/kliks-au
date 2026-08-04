import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const READY_POLL_INTERVAL_MS = 3_000
const READY_MAX_WAIT_MS = 50_000 // leaves headroom inside this route's own 60s budget

// Commentary reads pagespeed_mobile/desktop, cro_checklist, and the dataforseo_*
// fields dataforseo-core writes together in one upsert - so dataforseo_overview
// alone is a reliable proxy for that whole write having landed. pagespeed_fetched_at
// and crawled_at are set unconditionally by their own routes, on both success and
// failure, so they're a clean "job finished" signal even when the underlying scan
// came back empty. dataforseo-core has no equivalent timestamp column; the max-wait
// fallback below still bounds a genuine permanent failure there.
// Returns whether the data actually became ready. A prospect whose inputs
// are still incomplete after READY_MAX_WAIT_MS is a slow scan, not a signal
// to generate commentary from nulls - firing anyway produces exactly the
// confidently-wrong client-facing text this whole readiness check exists to
// prevent (a real score landing moments later than a description that says
// "unavailable"). The caller must not fire generate-commentary when this
// returns false.
async function waitForCommentaryData(prospect_id: string): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < READY_MAX_WAIT_MS) {
    const { data: cache } = await supabaseAdmin
      .from('audit_data_cache')
      .select('pagespeed_fetched_at, crawled_at, dataforseo_overview')
      .eq('prospect_id', prospect_id)
      .single()

    if (cache?.pagespeed_fetched_at && cache?.crawled_at && cache?.dataforseo_overview != null) {
      console.log('[dataforseo-enrichment] data ready after', Date.now() - start, 'ms')
      return true
    }
    await new Promise(resolve => setTimeout(resolve, READY_POLL_INTERVAL_MS))
  }
  console.warn('[dataforseo-enrichment] readiness wait hit', READY_MAX_WAIT_MS, 'ms cap without all inputs landing - skipping commentary rather than generating it from incomplete data. Re-run the data scan once the slow job finishes to pick this up.')

  // generate-commentary is what normally clears rescan_locked_at (see its own
  // try/finally). It's never being called on this path, so release the lock
  // here instead - otherwise a rescan on this prospect would be blocked for
  // up to RESCAN_LOCK_TIMEOUT_MS in rescan/route.ts for no reason, since
  // nothing is actually still running.
  try {
    await supabaseAdmin.from('prospects').update({ rescan_locked_at: null }).eq('id', prospect_id)
  } catch (e: any) {
    console.error('[dataforseo-enrichment] failed to clear rescan lock after timeout (non-fatal):', e.message)
  }
  return false
}

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[dataforseo-enrichment] route hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  // ── Fire generate-commentary once its source data is actually ready (non-blocking) ──
  // GMB is its own dataforseo-gmb route with a 30s timeout and its own 60s budget.
  // Commentary does not use gmb_data, so no ordering dependency with the GMB route.
  // Previously this waited a fixed 35s, sized for dataforseo-core's typical duration,
  // with no allowance for pagespeed (which has its own 60s timeout) or a slow
  // dataforseo-core run. That let commentary read null pagespeed data and describe
  // real, still-in-flight scores as "unavailable" text that never got regenerated.
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }
  waitUntil(
    waitForCommentaryData(prospect_id).then(ready => {
      if (!ready) return // inputs never became ready - see waitForCommentaryData, do not fire into nulls
      return fetch(`${base}/api/audit/generate-commentary`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({ prospect_id }),
      })
        .then(r => console.log('[dataforseo-enrichment] commentary triggered, status:', r.status))
        .catch((e: any) => console.error('[dataforseo-enrichment] commentary trigger failed:', e.message))
    })
  )

  return NextResponse.json({ success: true })
}
