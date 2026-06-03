// Shared PageSpeed extraction and save logic.
// Used by both pagespeed/route.ts (server → Cloud Run)
// and pagespeed-save/route.ts (browser → admin UI).

import { supabaseAdmin } from './supabase'

export function extractCrux(loadingExperience: any) {
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

export function extractLighthouse(data: any) {
  const cats = data?.lighthouseResult?.categories
  const audits = data?.lighthouseResult?.audits
  if (!cats && !audits) return null
  return {
    performance_score: Math.round((cats?.performance?.score ?? 0) * 100),
    seo_score: Math.round((cats?.seo?.score ?? 0) * 100),
    accessibility_score: Math.round((cats?.accessibility?.score ?? 0) * 100),
    lcp: audits?.['largest-contentful-paint']?.numericValue ?? null,
    fcp: audits?.['first-contentful-paint']?.numericValue ?? null,
    cls: audits?.['cumulative-layout-shift']?.numericValue ?? null,
    tbt: audits?.['total-blocking-time']?.numericValue ?? null,
    speed_index: audits?.['speed-index']?.numericValue ?? null,
    tti: audits?.['interactive']?.numericValue ?? null,
  }
}

export function buildMetrics(crux: any, lh: any) {
  if (!crux && !lh) return null
  return {
    performance_score: lh?.performance_score ?? null,
    seo_score: lh?.seo_score ?? null,
    accessibility_score: lh?.accessibility_score ?? null,
    // CrUX primary for lcp/fcp/cls, lighthouse fallback
    lcp: crux?.lcp ?? lh?.lcp ?? null,
    fcp: crux?.fcp ?? lh?.fcp ?? null,
    cls: crux?.cls ?? lh?.cls ?? null,
    // Lighthouse only
    tbt: lh?.tbt ?? null,
    speed_index: lh?.speed_index ?? null,
    tti: lh?.tti ?? null,
    // CrUX fields
    crux_available: crux !== null,
    crux_overall: crux?.overall_category ?? null,
    crux_inp: crux?.inp ?? null,
    crux_ttfb: crux?.ttfb ?? null,
    crux_fid: crux?.fid ?? null,
    crux_lcp_category: crux?.lcp_category ?? null,
    crux_fcp_category: crux?.fcp_category ?? null,
    crux_cls_category: crux?.cls_category ?? null,
    crux: crux ?? null,
    lighthouse: lh ?? null,
  }
}

export async function savePagespeedData(prospect_id: string, mobile: any, desktop: any) {
  const mobileCrux = extractCrux(mobile?.loadingExperience)
  const mobileLh = extractLighthouse(mobile)
  const desktopLh = extractLighthouse(desktop)

  const mobileMetrics = buildMetrics(mobileCrux, mobileLh)
  const desktopMetrics = buildMetrics(null, desktopLh)

  console.log('[pagespeed] raw scores:', {
    performance: mobile?.lighthouseResult?.categories?.performance?.score,
    seo: mobile?.lighthouseResult?.categories?.seo?.score,
    accessibility: mobile?.lighthouseResult?.categories?.accessibility?.score,
  })
  console.log('[pagespeed] mobile perf:', mobileLh?.performance_score ?? 'null', 'seo:', mobileLh?.seo_score ?? 'null', 'a11y:', mobileLh?.accessibility_score ?? 'null', 'crux:', mobileCrux?.overall_category ?? 'null')
  console.log('[pagespeed] desktop perf:', desktopLh?.performance_score ?? 'null')

  const updateData: Record<string, any> = {
    prospect_id,
    pagespeed_fetched_at: new Date().toISOString(),
  }
  if (mobileMetrics) updateData.pagespeed_mobile = mobileMetrics
  if (desktopMetrics) updateData.pagespeed_desktop = desktopMetrics

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert(updateData, { onConflict: 'prospect_id' })

  if (dbError) {
    console.error('[pagespeed] Supabase write error:', JSON.stringify(dbError))
    return { success: false, error: dbError.message }
  }

  console.log('[pagespeed] saved successfully for prospect_id:', prospect_id)
  return { success: true, crux_overall: mobileCrux?.overall_category ?? null }
}
