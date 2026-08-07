import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWebhookSecret, getProspectIdFromPostback, parsePostbackBody } from '@/lib/dataforseo-postback'

export const maxDuration = 30

// Same pattern as dataforseo-gmb-reviews-webhook - receives the postback,
// stores, responds fast. No AI commentary trigger here: GBP posting
// activity is read alongside reviews/Q&A whenever the reviews webhook
// fires that call, not a trigger point of its own.
export async function POST(req: NextRequest) {
  const prospect_id = getProspectIdFromPostback(req)
  console.log('[dataforseo-gmb-updates-webhook] hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })
  if (!verifyWebhookSecret(req)) {
    console.warn('[dataforseo-gmb-updates-webhook] secret mismatch, rejecting')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let items: any[] | null = null
  try {
    const json = await parsePostbackBody(req)
    const task = json?.tasks?.[0]
    console.log('[dataforseo-gmb-updates-webhook] task status:', task?.status_code, task?.status_message)
    items = task?.result?.[0]?.items ?? []
    console.log('[dataforseo-gmb-updates-webhook] items:', items?.length ?? 0)
  } catch (e: any) {
    console.error('[dataforseo-gmb-updates-webhook] failed to parse postback body:', e.message)
  }

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .update({
      gmb_updates: items,
      gmb_updates_status: items != null ? 'ready' : 'failed',
      gmb_updates_fetched_at: new Date().toISOString(),
    })
    .eq('prospect_id', prospect_id)

  if (dbError) console.error('[dataforseo-gmb-updates-webhook] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-gmb-updates-webhook] stored, count:', items?.length ?? 0)

  return NextResponse.json({ success: true })
}
