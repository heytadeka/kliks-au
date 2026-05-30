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
  await supabaseAdmin
    .from('prospects')
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (prospect.access_count ?? 0) + 1,
    })
    .eq('id', prospect.id)

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
