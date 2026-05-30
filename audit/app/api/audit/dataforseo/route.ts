import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

async function dfsPost(path: string, body: any[]) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const res = await fetch(`${DATAFORSEO_BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`DataForSEO error: ${res.status}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  const { prospect_id, store_url } = await req.json()
  const domain = store_url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  let overview = null
  let keywords: any[] = []
  let gaps = null

  try {
    const res = await dfsPost('/dataforseo_labs/google/domain_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }])
    overview = res?.tasks?.[0]?.result?.[0] ?? null
  } catch {}

  try {
    const res = await dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 10, order_by: ['keyword_data.keyword_info.search_volume,desc'] }])
    keywords = res?.tasks?.[0]?.result?.[0]?.items ?? []
  } catch {}

  try {
    const res = await dfsPost('/dataforseo_labs/google/domain_rank_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }])
    gaps = res?.tasks?.[0]?.result?.[0] ?? null
  } catch {}

  await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      dataforseo_overview: overview,
      dataforseo_keywords: keywords,
      dataforseo_gaps: gaps,
    }, { onConflict: 'prospect_id' })

  return NextResponse.json({ success: true, overview, keywords, gaps })
}
