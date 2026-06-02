import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

// Accepts pre-fetched CrUX data from the browser and merges it into pagespeed_mobile.
// Called client-side from the admin UI so the PSI API call runs in the browser,
// not from Vercel's US servers which are blocked by AU-hosted stores.

function extractCrux(loadingExperience: any) {
  if (!loadingExperience) return null
  const metrics = loadingExperience.metrics
  const overall = loadingExperience.overall_category
  if (!metrics && !overall) return null
  const clsRaw = metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
  return {
    lcp: metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    fcp: metrics?.FIRST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    fid: metrics?.FIRST_INPUT_DELAY_MS?.percentile ?? null,
    cls: clsRaw != null ? +(clsRaw / 100).toFixed(3) : null,
    inp: metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    ttfb: metrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
    overall_category: overall ?? null,
    lcp_category: metrics?.LARGEST_CONTENTFUL_PAINT_MS?.category ?? null,
    fcp_category: metrics?.FIRST_CONTENTFUL_PAINT_MS?.category ?? null,
    cls_category: metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category ?? null,
    inp_category: metrics?.INTERACTION_TO_NEXT_PAINT?.category ?? null,
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id, loading_experience } = await req.json()
  if (!prospect_id || !loading_experience) {
    return NextResponse.json({ error: 'Missing prospect_id or loading_experience' }, { status: 400 })
  }

  const crux = extractCrux(loading_experience)
  if (!crux) {
    return NextResponse.json({ success: false, error: 'No CrUX data in loading_experience' })
  }

  console.log('[pagespeed-save] crux received for prospect_id:', prospect_id, 'overall:', crux.overall_category)

  // Read existing mobile metrics so we can preserve lighthouse data
  const { data: existing } = await supabaseAdmin
    .from('audit_data_cache')
    .select('pagespeed_mobile')
    .eq('prospect_id', prospect_id)
    .single()

  const existingMobile = existing?.pagespeed_mobile ?? {}

  // Merge: CrUX primary for lcp/fcp/cls, preserve existing lighthouse fields
  const merged = {
    ...existingMobile,
    lcp: crux.lcp ?? existingMobile.lcp ?? null,
    fcp: crux.fcp ?? existingMobile.fcp ?? null,
    cls: crux.cls ?? existingMobile.cls ?? null,
    crux_available: true,
    crux_overall: crux.overall_category,
    crux_inp: crux.inp,
    crux_ttfb: crux.ttfb,
    crux_fid: crux.fid,
    crux_lcp_category: crux.lcp_category,
    crux_fcp_category: crux.fcp_category,
    crux_cls_category: crux.cls_category,
    crux,
  }

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({ prospect_id, pagespeed_mobile: merged }, { onConflict: 'prospect_id' })

  if (dbError) {
    console.error('[pagespeed-save] Supabase write error:', JSON.stringify(dbError))
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
  }

  console.log('[pagespeed-save] CrUX saved successfully for prospect_id:', prospect_id)
  return NextResponse.json({ success: true, crux_overall: crux.overall_category })
}
