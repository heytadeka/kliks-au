import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link, location } = body

  // Guard: check for duplicate slug before inserting
  const { data: existing } = await supabaseAdmin
    .from('prospects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({
      success: false,
      error: 'A prospect with this slug already exists. Use a different slug or edit the existing audit.',
    }, { status: 409 })
  }

  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from('prospects')
    .insert({ brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link: cta_link || '/book', location: location || null })
    .select()
    .single()

  if (prospectError) return NextResponse.json({ error: prospectError.message }, { status: 400 })

  await supabaseAdmin.from('audit_content').insert({ prospect_id: prospect.id })
  await supabaseAdmin.from('audit_data_cache').insert({ prospect_id: prospect.id })

  // Auto-create outreach_log row (non-fatal)
  try {
    const domain = store_url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
    await supabaseAdmin.from('outreach_log').insert({
      prospect_id: prospect.id,
      domain,
      brand_name,
      prospect_name,
      prospect_email,
      audit_slug: slug,
      status: 'audit_created',
    })
  } catch (e: any) {
    console.error('[create] outreach_log insert failed (non-fatal):', e.message)
  }

  // Phase 2: fire all jobs in background without awaiting - return to browser immediately
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const h = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }
  const pid = prospect.id

  // Chain: data jobs first, then commentary. waitUntil keeps function alive until done.
  console.log('[create] firing background jobs for prospect_id:', pid, 'base:', base)
  waitUntil(
    Promise.allSettled([
      fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, store_url }) }),
      fetch(`${base}/api/audit/crawl`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, store_url }) }),
      fetch(`${base}/api/audit/dataforseo`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, store_url, niche }) }),
      fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, niche, store_url }) }),
      fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, brand_name, store_url }) }),
    ]).then(() =>
      fetch(`${base}/api/audit/generate-commentary`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ prospect_id: pid }),
      })
    ).catch((e: any) => console.error('[create] background jobs failed:', e.message))
  )

  return NextResponse.json({ success: true, prospect_id: prospect.id, slug: prospect.slug, brand_name })
}
