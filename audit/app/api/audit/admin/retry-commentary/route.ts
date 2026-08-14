import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { isDataReadyForCommentary } from '@/lib/commentary-status'

export const maxDuration = 60

// Manual backstop for the admin UI's "stalled" state (see
// getCommentaryReadinessState in lib/commentary-status.ts): when
// dataforseo-enrichment's readiness poll times out, it gives up for good and
// never fires generate-commentary - even if the slow input (PageSpeed, most
// often) lands moments later. Rather than re-running the whole rescan fan-out
// again, this checks the same readiness condition on demand and fires
// generate-commentary directly if it's now true, since the real-world case
// that motivated this (see git history's freshness investigation) had the
// data land just a few seconds after the poll gave up.
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prospect_id } = await req.json()
  if (!prospect_id) return NextResponse.json({ success: false, error: 'Missing prospect_id' }, { status: 400 })

  const { data: cache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('pagespeed_fetched_at, crawled_at, dataforseo_overview')
    .eq('prospect_id', prospect_id)
    .single()

  if (!isDataReadyForCommentary(cache)) {
    return NextResponse.json({ success: false, error: "Scan data isn't ready yet - wait a bit and try again." })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const res = await fetch(`${base}/api/audit/generate-commentary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! },
    body: JSON.stringify({ prospect_id }),
  })

  if (!res.ok) {
    return NextResponse.json({ success: false, error: `Commentary generation failed (status ${res.status})` })
  }

  return NextResponse.json({ success: true })
}
