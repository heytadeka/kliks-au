import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

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
  const apiBase = `${base}/audit/api/audit`
  const headers = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }

  Promise.all([
    fetch(`${apiBase}/pagespeed`, { method: 'POST', headers, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }),
    fetch(`${apiBase}/crawl`, { method: 'POST', headers, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }),
    fetch(`${apiBase}/dataforseo`, { method: 'POST', headers, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }),
    fetch(`${apiBase}/keyword-planner`, { method: 'POST', headers, body: JSON.stringify({ prospect_id, niche: prospect.niche, store_url: prospect.store_url }) }),
    fetch(`${apiBase}/meta-ads`, { method: 'POST', headers, body: JSON.stringify({ prospect_id, brand_name: prospect.brand_name, store_url: prospect.store_url }) }),
  ]).catch(() => {})

  return NextResponse.json({ success: true })
}
