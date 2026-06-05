import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, status, notes, follow_up_due_at, deal_value, lost_reason } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const now = new Date().toISOString()
  const updates: Record<string, any> = { updated_at: now }

  if (status !== undefined) {
    updates.status = status
    // Set email_sent_at on first transition to email_sent
    if (status === 'email_sent') {
      const { data: current } = await supabaseAdmin
        .from('outreach_log')
        .select('email_sent_at')
        .eq('id', id)
        .single()
      if (!current?.email_sent_at) updates.email_sent_at = now
    }
    if (status === 'won' && deal_value !== undefined) updates.deal_value = deal_value
    if (status === 'lost' && lost_reason !== undefined) updates.lost_reason = lost_reason
  }

  if (notes !== undefined) updates.notes = notes
  if (follow_up_due_at !== undefined) updates.follow_up_due_at = follow_up_due_at || null
  if (deal_value !== undefined) updates.deal_value = deal_value
  if (lost_reason !== undefined) updates.lost_reason = lost_reason

  const { data: row, error } = await supabaseAdmin
    .from('outreach_log')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, row })
}
