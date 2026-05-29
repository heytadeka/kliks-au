import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { prospect_id, brand_name } = await req.json()
  const token = process.env.META_ACCESS_TOKEN

  if (!token) {
    await supabaseAdmin.from('audit_data_cache').upsert({
      prospect_id, meta_ads: { error: 'not_configured' }
    }, { onConflict: 'prospect_id' })
    return NextResponse.json({ success: false, error: 'not_configured' })
  }

  try {
    const url = `https://graph.facebook.com/v19.0/ads_archive?fields=id,ad_creation_time,ad_creative_bodies,ad_delivery_start_time,ad_snapshot_url&search_type=KEYWORD_UNORDERED&ad_reached_countries=['AU']&q=${encodeURIComponent(brand_name)}&ad_active_status=ALL&limit=50&access_token=${token}`
    const res = await fetch(url)
    const data = await res.json()
    const ads = data.data ?? []

    const active = ads.filter((a: any) => a.ad_delivery_start_time && !a.ad_delivery_stop_time)
    const formats = ads.reduce((acc: any, a: any) => {
      const bodies = a.ad_creative_bodies ?? []
      if (bodies.length > 0) acc.text = (acc.text || 0) + 1
      return acc
    }, {})

    const oldest = active.length > 0
      ? active.reduce((oldest: any, a: any) =>
          new Date(a.ad_delivery_start_time) < new Date(oldest.ad_delivery_start_time) ? a : oldest
        )
      : null

    const result = {
      total_ads: ads.length,
      active_ads: active.length,
      oldest_active_date: oldest?.ad_delivery_start_time ?? null,
      formats,
    }

    await supabaseAdmin.from('audit_data_cache').upsert({
      prospect_id, meta_ads: result
    }, { onConflict: 'prospect_id' })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
