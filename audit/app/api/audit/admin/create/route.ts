import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link } = body

  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from('prospects')
    .insert({ brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link: cta_link || '/book' })
    .select()
    .single()

  if (prospectError) return NextResponse.json({ error: prospectError.message }, { status: 400 })

  await supabaseAdmin.from('audit_content').insert({ prospect_id: prospect.id })
  await supabaseAdmin.from('audit_data_cache').insert({ prospect_id: prospect.id })

  // Fire data collection jobs in parallel
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const headers = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }

  await Promise.allSettled([
    fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, store_url }) }),
    fetch(`${base}/api/audit/crawl`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, store_url }) }),
    fetch(`${base}/api/audit/dataforseo`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, store_url }) }),
    fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, niche, store_url }) }),
    fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, brand_name, store_url }) }),
  ])

  // Generate AI commentary after data is collected
  try {
    await fetch(`${base}/api/audit/generate-commentary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! },
      body: JSON.stringify({ prospect_id: prospect.id }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (e: any) {
    console.error('[create] commentary generation failed:', e.message)
  }

  return NextResponse.json({ success: true, prospect_id: prospect.id, slug: prospect.slug, brand_name })
}
