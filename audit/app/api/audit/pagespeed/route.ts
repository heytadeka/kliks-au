import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

function extractCrux(data: any) {
  const metrics = data.loadingExperience?.metrics
  const overall = data.loadingExperience?.overall_category
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

  let crux: any = null
  let mobileLighthouse: any = null
  let desktopLighthouse: any = null
  let siteUnreachable = false

  // Fetch 1: CrUX only - 10s timeout. If this times out, site is blocking Vercel - skip lighthouse.
  try {
    const cruxUrl = `${base}?url=${encoded}&strategy=DESKTOP&fields=loadingExperience&locale=en-AU&key=${apiKey}`
    const cruxData = await fetchWithTimeout(cruxUrl, 10000)
    crux = extractCrux(cruxData)
    console.log('[pagespeed] crux available:', crux !== null, 'overall:', crux?.overall_category ?? 'none')
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[pagespeed] site unreachable from Vercel - skipping all pagespeed checks`)
      siteUnreachable = true
    } else {
      console.error('[pagespeed] CrUX fetch failed:', err.message)
    }
  }

  if (!siteUnreachable) {
    // Fetch 2: full mobile lighthouse (slow, can timeout)
    try {
      const mobileData = await fetchWithTimeout(`${base}?url=${encoded}&strategy=mobile&key=${apiKey}`, 45000)
      mobileLighthouse = extractLighthouse(mobileData)
      console.log('[pagespeed] mobile lighthouse score:', mobileLighthouse?.performance_score ?? 'null')
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`[pagespeed] mobile lighthouse timed out for ${domain} - store may be slow`)
      } else {
        console.error('[pagespeed] mobile lighthouse failed:', err.message)
      }
    }

    // Fetch 3: full desktop lighthouse (slow, can timeout)
    try {
      const desktopData = await fetchWithTimeout(`${base}?url=${encoded}&strategy=desktop&key=${apiKey}`, 45000)
      desktopLighthouse = extractLighthouse(desktopData)
      console.log('[pagespeed] desktop lighthouse score:', desktopLighthouse?.performance_score ?? 'null')
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`[pagespeed] desktop lighthouse timed out for ${domain} - store may be slow`)
      } else {
        console.error('[pagespeed] desktop lighthouse failed:', err.message)
      }
    }
  }

  // mobile = CrUX + mobile lighthouse; desktop = desktop lighthouse only
  const mobileMetrics = buildMetrics(crux, mobileLighthouse)
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
  return NextResponse.json({ success: true, crux: !!crux, mobile: !!mobileLighthouse, desktop: !!desktopLighthouse })
}
