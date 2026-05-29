import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

  try {
    const [overviewRes, keywordsRes, gapsRes] = await Promise.all([
      dfsPost('/dataforseo_labs/google/domain_overview/live', [{ target: domain, location_code: 2036, language_code: 'en' }]),
      dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{ target: domain, location_code: 2036, language_code: 'en', limit: 10, order_by: ['keyword_data.keyword_info.search_volume,desc'] }]),
      dfsPost('/dataforseo_labs/google/keyword_gap/live', [{ targets: [domain], location_code: 2036, language_code: 'en', limit: 10 }]),
    ])

    const overview = overviewRes?.tasks?.[0]?.result?.[0] ?? null
    const keywords = keywordsRes?.tasks?.[0]?.result?.[0]?.items ?? []
    const gaps = gapsRes?.tasks?.[0]?.result?.[0]?.items ?? []

    await supabaseAdmin
      .from('audit_data_cache')
      .upsert({
        prospect_id,
        dataforseo_overview: overview,
        dataforseo_keywords: keywords,
        dataforseo_gaps: gaps,
      }, { onConflict: 'prospect_id' })

    return NextResponse.json({ success: true, overview, keywords, gaps })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
