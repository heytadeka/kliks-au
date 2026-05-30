import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { prospect_id, niche, store_url: _store_url } = await req.json()

  const requiredVars = [
    'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'
  ]
  const missing = requiredVars.filter(v => !process.env[v])

  if (missing.length > 0) {
    await supabaseAdmin.from('audit_data_cache').upsert({
      prospect_id, google_ads_planner: { error: 'not_configured', missing }
    }, { onConflict: 'prospect_id' })
    return NextResponse.json({ success: false, error: 'not_configured' })
  }

  try {
    const { GoogleAdsApi } = await import('google-ads-api')
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    })

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    })

    const seedKeywords = niche.split('/').map((k: string) => k.trim()).slice(0, 3)

    const ideas = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      keyword_seed: { keywords: seedKeywords },
      geo_target_constants: ['geoTargetConstants/2036'],
      language: 'languageConstants/1000',
      page_size: 20,
      include_adult_keywords: false,
      keyword_plan_network: 'GOOGLE_SEARCH',
    } as any)

    const keyword_ideas = (ideas.results ?? []).map((r: any) => ({
      keyword: r.text,
      avg_monthly_searches: r.keyword_idea_metrics?.avg_monthly_searches ?? 0,
      competition: r.keyword_idea_metrics?.competition ?? 'UNKNOWN',
      competition_index: r.keyword_idea_metrics?.competition_index ?? 0,
      low_top_of_page_bid: (r.keyword_idea_metrics?.low_top_of_page_bid_micros ?? 0) / 1_000_000,
      high_top_of_page_bid: (r.keyword_idea_metrics?.high_top_of_page_bid_micros ?? 0) / 1_000_000,
    })).sort((a: any, b: any) => b.avg_monthly_searches - a.avg_monthly_searches)

    const result = { keyword_ideas, category_volumes: [], fetched_at: new Date().toISOString() }

    await supabaseAdmin.from('audit_data_cache').upsert({
      prospect_id, google_ads_planner: result
    }, { onConflict: 'prospect_id' })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    await supabaseAdmin.from('audit_data_cache').upsert({
      prospect_id, google_ads_planner: { error: err.message }
    }, { onConflict: 'prospect_id' })
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
