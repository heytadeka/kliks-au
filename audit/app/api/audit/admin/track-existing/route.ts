import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

// Starts outreach tracking for an audit that already exists.
// Does not create a prospect, does not touch audit_content or audit_data_cache,
// and does not fire any of the data-pull background jobs.
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id } = await req.json()
  if (!prospect_id) return NextResponse.json({ error: 'prospect_id required' }, { status: 400 })

  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from('prospects')
    .select('id, slug, brand_name, store_url, prospect_name, prospect_email')
    .eq('id', prospect_id)
    .single()

  if (prospectError || !prospect) {
    return NextResponse.json({ error: 'Audit not found.' }, { status: 404 })
  }

  const { data: existingLog } = await supabaseAdmin
    .from('outreach_log')
    .select('id')
    .eq('prospect_id', prospect_id)
    .maybeSingle()

  if (existingLog) {
    return NextResponse.json({ error: 'This audit is already being tracked in Outreach.' }, { status: 409 })
  }

  const domain = prospect.store_url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  const { data: inserted, error: insertError } = await supabaseAdmin.from('outreach_log').insert({
    prospect_id: prospect.id,
    domain,
    brand_name: prospect.brand_name,
    prospect_name: prospect.prospect_name,
    prospect_email: prospect.prospect_email,
    audit_slug: prospect.slug,
    status: 'audit_created',
  }).select('id').single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  return NextResponse.json({ success: true, id: inserted.id, slug: prospect.slug, brand_name: prospect.brand_name })
}
