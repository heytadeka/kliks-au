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
async function waitForCommentaryData(prospect_id: string): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < READY_MAX_WAIT_MS) {
    const { data: cache } = await supabaseAdmin
      .from('audit_data_cache')
      .select('pagespeed_fetched_at, crawled_at, dataforseo_overview')
      .eq('prospect_id', prospect_id)
      .single()

    if (cache?.pagespeed_fetched_at && cache?.crawled_at && cache?.dataforseo_overview != null) {
      console.log('[dataforseo-enrichment] data ready after', Date.now() - start, 'ms')
      return
    }
    await new Promise(resolve => setTimeout(resolve, READY_POLL_INTERVAL_MS))
  }
  console.warn('[dataforseo-enrichment] readiness wait hit', READY_MAX_WAIT_MS, 'ms cap, firing commentary with whatever is available')
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
    waitForCommentaryData(prospect_id).then(() =>
      fetch(`${base}/api/audit/generate-commentary`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({ prospect_id }),
      })
        .then(r => console.log('[dataforseo-enrichment] commentary triggered, status:', r.status))
        .catch((e: any) => console.error('[dataforseo-enrichment] commentary trigger failed:', e.message))
    )
  )

  return NextResponse.json({ success: true })
}
