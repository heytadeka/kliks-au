import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: cache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('pagespeed_mobile, pagespeed_desktop, cro_checklist, dataforseo_overview, meta_ads, crawled_at')
    .eq('prospect_id', prospect.id)
    .single()

  return NextResponse.json({
    pagespeed_mobile: !!cache?.pagespeed_mobile,
    pagespeed_desktop: !!cache?.pagespeed_desktop,
    cro_checklist: !!(cache?.cro_checklist as any)?.summary,
    dataforseo_overview: !!cache?.dataforseo_overview,
    meta_ads: !!cache?.meta_ads && !(cache?.meta_ads as any)?.error,
    crawled_at: cache?.crawled_at ?? null,
  })
}
