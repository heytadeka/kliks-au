import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60
export const preferredRegion = 'syd1'

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

  // ── Fire generate-commentary after a 35s delay (non-blocking) ──
  // GMB is now in its own dataforseo-gmb route with a 30s timeout and its own 60s budget.
  // dataforseo-core (~25-30s) must finish writing before commentary reads the cache.
  // The 35s delay acts as a synchronisation buffer so commentary always reads fresh data.
  // Commentary does not use gmb_data, so no ordering dependency with the GMB route.
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }
  waitUntil(
    new Promise<void>(resolve => setTimeout(resolve, 35_000)).then(() =>
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
