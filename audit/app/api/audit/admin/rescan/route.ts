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

  // Chain: data jobs first, then commentary. waitUntil keeps function alive until done.
  console.log('[rescan] firing background jobs for prospect_id:', prospect_id, 'base:', base)
  console.log('[rescan] pagespeed URL:', `${base}/api/audit/pagespeed`)
  console.log('[rescan] dataforseo URL:', `${base}/api/audit/dataforseo`)
  waitUntil(
    Promise.allSettled([
      fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }),
      fetch(`${base}/api/audit/crawl`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }),
      fetch(`${base}/api/audit/dataforseo`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, store_url: prospect.store_url }) }),
      fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, niche: prospect.niche, store_url: prospect.store_url }) }),
      fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id, brand_name: prospect.brand_name, store_url: prospect.store_url }) }),
    ]).then(() =>
      fetch(`${base}/api/audit/generate-commentary`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ prospect_id }),
      })
    ).catch((e: any) => console.error('[rescan] background jobs failed:', e.message))
  )

  return NextResponse.json({ success: true })
}
