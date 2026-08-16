import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // status/lost_reason are the retired pre-2026-08-14 fields - see
  // lib/outreach-stage.ts. Not read or written here any more; historical
  // rows keep whatever the migration backfill left in them.
  const { id, stage, notes, follow_up_due_at, deal_value, declined_reason } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const now = new Date().toISOString()
  const updates: Record<string, any> = { updated_at: now }

  if (stage !== undefined) {
    updates.stage = stage
    // Set email_sent_at on first transition to first_email_sent
    if (stage === 'first_email_sent') {
      const { data: current } = await supabaseAdmin
        .from('outreach_log')
        .select('email_sent_at')
        .eq('id', id)
        .single()
      if (!current?.email_sent_at) updates.email_sent_at = now
    }
    if (stage === 'won' && deal_value !== undefined) updates.deal_value = deal_value
    if (stage === 'declined' && declined_reason !== undefined) updates.declined_reason = declined_reason
  }

  if (notes !== undefined) updates.notes = notes
  if (follow_up_due_at !== undefined) updates.follow_up_due_at = follow_up_due_at || null
  if (deal_value !== undefined) updates.deal_value = deal_value
  if (declined_reason !== undefined) updates.declined_reason = declined_reason

  const { data: row, error } = await supabaseAdmin
    .from('outreach_log')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, row })
}
