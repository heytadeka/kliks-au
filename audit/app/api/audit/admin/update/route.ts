import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function PATCH(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    prospect_id,
    brand_name, store_url, prospect_name, prospect_email, niche, cta_link,
    section_ads_headline, section_ads_body, section_strategy_headline, section_strategy_body,
    section_seo_headline, section_seo_body, section_opportunity_headline, section_opportunity_body,
    section_closing_body,
  } = await req.json()

  const { error: prospectError } = await supabaseAdmin
    .from('prospects')
    .update({ brand_name, store_url, prospect_name, prospect_email, niche, cta_link })
    .eq('id', prospect_id)

  if (prospectError) return NextResponse.json({ error: prospectError.message }, { status: 400 })

  const { error: contentError } = await supabaseAdmin
    .from('audit_content')
    .update({
      section_ads_headline, section_ads_body, section_strategy_headline, section_strategy_body,
      section_seo_headline, section_seo_body, section_opportunity_headline, section_opportunity_body,
      section_closing_body,
    })
    .eq('prospect_id', prospect_id)

  if (contentError) return NextResponse.json({ error: contentError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
