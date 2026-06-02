import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60
export const preferredRegion = 'syd1'

function extractLighthouse(data: any) {
  const cats = data.lighthouseResult?.categories
  const audits = data.lighthouseResult?.audits
  if (!cats && !audits) return null
  return {
    performance_score: Math.round((cats?.performance?.score ?? 0) * 100),
    lcp: audits?.['largest-contentful-paint']?.numericValue ?? null,
    fcp: audits?.['first-contentful-paint']?.numericValue ?? null,
    tbt: audits?.['total-blocking-time']?.numericValue ?? null,
    cls: audits?.['cumulative-layout-shift']?.numericValue ?? null,
    speed_index: audits?.['speed-index']?.numericValue ?? null,
    lcp_display: audits?.['largest-contentful-paint']?.displayValue ?? null,
    fcp_display: audits?.['first-contentful-paint']?.displayValue ?? null,
    tbt_display: audits?.['total-blocking-time']?.displayValue ?? null,
    cls_display: audits?.['cumulative-layout-shift']?.displayValue ?? null,
    speed_index_display: audits?.['speed-index']?.displayValue ?? null,
  }
}

function buildMetrics(crux: any, lighthouse: any) {
  if (!crux && !lighthouse) return null
  return {
    // Flat top-level fields - CrUX primary, lighthouse fallback
    performance_score: lighthouse?.performance_score ?? null,
    lcp: crux?.lcp ?? lighthouse?.lcp ?? null,
    fcp: crux?.fcp ?? lighthouse?.fcp ?? null,
    cls: crux?.cls ?? lighthouse?.cls ?? null,
    tbt: lighthouse?.tbt ?? null,
    speed_index: lighthouse?.speed_index ?? null,
    lcp_display: lighthouse?.lcp_display ?? null,
    fcp_display: lighthouse?.fcp_display ?? null,
    tbt_display: lighthouse?.tbt_display ?? null,
    cls_display: lighthouse?.cls_display ?? null,
    speed_index_display: lighthouse?.speed_index_display ?? null,
    // CrUX-only fields
    crux_available: crux !== null,
    crux_overall: crux?.overall_category ?? null,
    crux_inp: crux?.inp ?? null,
    crux_ttfb: crux?.ttfb ?? null,
    crux_fid: crux?.fid ?? null,
    crux_lcp_category: crux?.lcp_category ?? null,
    crux_fcp_category: crux?.fcp_category ?? null,
    crux_cls_category: crux?.cls_category ?? null,
    crux,
    lighthouse,
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  const { prospect_id, store_url } = await req.json()
  const domain = store_url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  const apiKey = process.env.PAGESPEED_API_KEY
  const encoded = encodeURIComponent(store_url)
  const base = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`

  // CrUX is now fetched client-side by the browser (pagespeed-save route).
  // Server only fetches lighthouse data. Read existing CrUX from DB to preserve it.
  const { data: existingCache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('pagespeed_mobile')
    .eq('prospect_id', prospect_id)
    .single()
  const existingCrux = existingCache?.pagespeed_mobile?.crux ?? null

  let mobileLighthouse: any = null
  let desktopLighthouse: any = null

  // Fetch 1: full mobile lighthouse
  try {
    const mobileData = await fetchWithTimeout(`${base}?url=${encoded}&strategy=mobile&key=${apiKey}`, 45000)
    mobileLighthouse = extractLighthouse(mobileData)
    console.log('[pagespeed] mobile lighthouse score:', mobileLighthouse?.performance_score ?? 'null')
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[pagespeed] mobile lighthouse timed out for ${domain}`)
    } else {
      console.error('[pagespeed] mobile lighthouse failed:', err.message)
    }
  }

  // Fetch 2: full desktop lighthouse
  try {
    const desktopData = await fetchWithTimeout(`${base}?url=${encoded}&strategy=desktop&key=${apiKey}`, 45000)
    desktopLighthouse = extractLighthouse(desktopData)
    console.log('[pagespeed] desktop lighthouse score:', desktopLighthouse?.performance_score ?? 'null')
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[pagespeed] desktop lighthouse timed out for ${domain}`)
    } else {
      console.error('[pagespeed] desktop lighthouse failed:', err.message)
    }
  }

  // Preserve CrUX set by browser (pagespeed-save) + add new lighthouse data
  const mobileMetrics = buildMetrics(existingCrux, mobileLighthouse)
  const desktopMetrics = buildMetrics(null, desktopLighthouse)

  console.log('[pagespeed] writing to DB - mobile:', !!mobileMetrics, 'desktop:', !!desktopMetrics)
  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      pagespeed_mobile: mobileMetrics,
      pagespeed_desktop: desktopMetrics,
      pagespeed_fetched_at: new Date().toISOString(),
    }, { onConflict: 'prospect_id' })

  if (dbError) {
    console.error('[pagespeed] Supabase write error:', JSON.stringify(dbError))
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
  }
  console.log('[pagespeed] write success for prospect_id:', prospect_id)
  return NextResponse.json({ success: true, crux: !!existingCrux, mobile: !!mobileLighthouse, desktop: !!desktopLighthouse })
}
