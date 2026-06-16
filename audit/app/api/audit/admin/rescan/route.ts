import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prospect_id } = await req.json()

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  // Reset cache
  await supabaseAdmin
    .from('audit_data_cache')
    .update({ crawled_at: null })
    .eq('prospect_id', prospect_id)

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const h = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }

  // Fire all background jobs independently.
  // dataforseo-core: overview, keywords, SERP competitors, content gap (~25-30s)
  // dataforseo-enrichment: fires commentary after a 35s delay (buffer for core to finish)
  // dataforseo-gmb: dedicated GMB route with 30s timeout and its own 60s budget
  // Each route fetches the prospect record itself — only prospect_id needed in the payload.
  console.log('[rescan] firing background jobs for prospect_id:', prospect_id, 'base:', base)
  waitUntil(fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/crawl`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-core`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-enrichment`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id }) }))
  waitUntil(fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, niche: prospect.niche, store_url: prospect.store_url }) }))
  waitUntil(fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, brand_name: prospect.brand_name, store_url: prospect.store_url }) }))

  return NextResponse.json({ success: true })
}
