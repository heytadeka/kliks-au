import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { slug, email } = await req.json()

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!prospect) {
    return NextResponse.json({ success: false, message: 'This audit link is not active.' })
  }

  const normalised = email.trim().toLowerCase()
  const storedEmail = prospect.prospect_email.trim().toLowerCase()

  if (normalised !== storedEmail) {
    return NextResponse.json({ success: false, message: 'That email doesn\'t match our records. Check your inbox for the link.' })
  }

  // Update access tracking
  const newAccessCount = (prospect.access_count ?? 0) + 1
  const nowIso = new Date().toISOString()
  await supabaseAdmin
    .from('prospects')
    .update({ last_accessed_at: nowIso, access_count: newAccessCount })
    .eq('id', prospect.id)

  // Sync open data to outreach_log (non-fatal)
  try {
    const { data: outreachRow } = await supabaseAdmin
      .from('outreach_log')
      .select('first_opened_at, status')
      .eq('prospect_id', prospect.id)
      .single()
    if (outreachRow) {
      const outreachUpdate: Record<string, any> = {
        open_count: newAccessCount,
        last_opened_at: nowIso,
        updated_at: nowIso,
      }
      if (!outreachRow.first_opened_at) outreachUpdate.first_opened_at = nowIso
      if (outreachRow.status === 'email_sent') outreachUpdate.status = 'opened'
      await supabaseAdmin.from('outreach_log').update(outreachUpdate).eq('prospect_id', prospect.id)
    }
  } catch (e: any) {
    console.error('[gate] outreach_log sync failed (non-fatal):', e.message)
  }

  const response = NextResponse.json({
    success: true,
    redirect: `/audit/${slug}/report`,
  })

  response.cookies.set(`audit_${slug}_auth`, 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return response
}
