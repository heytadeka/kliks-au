import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link,
    section_ads_headline, section_ads_body, section_strategy_headline, section_strategy_body,
    section_seo_headline, section_seo_body, section_opportunity_headline, section_opportunity_body,
    section_closing_body,
  } = body

  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from('prospects')
    .insert({ brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link: cta_link || '/book' })
    .select()
    .single()

  if (prospectError) return NextResponse.json({ error: prospectError.message }, { status: 400 })

  await supabaseAdmin.from('audit_content').insert({
    prospect_id: prospect.id,
    section_ads_headline, section_ads_body, section_strategy_headline, section_strategy_body,
    section_seo_headline, section_seo_body, section_opportunity_headline, section_opportunity_body,
    section_closing_body,
  })

  await supabaseAdmin.from('audit_data_cache').insert({ prospect_id: prospect.id })

  // Fire background jobs
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const headers = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }

  Promise.all([
    fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, store_url }) }),
    fetch(`${base}/api/audit/crawl`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, store_url }) }),
    fetch(`${base}/api/audit/dataforseo`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, store_url }) }),
    fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, niche, store_url }) }),
    fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers, body: JSON.stringify({ prospect_id: prospect.id, brand_name, store_url }) }),
  ]).catch(() => {})

  return NextResponse.json({ success: true, prospect_id: prospect.id, slug: prospect.slug, brand_name })
}
