import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function fetchPageSpeed(url: string, strategy: 'mobile' | 'desktop') {
  const apiKey = process.env.PAGESPEED_API_KEY
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${apiKey}`
  const res = await fetch(endpoint, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  const { prospect_id, store_url } = await req.json()

  try {
    const [mobile, desktop] = await Promise.all([
      fetchPageSpeed(store_url, 'mobile'),
      fetchPageSpeed(store_url, 'desktop'),
    ])

    const extractMetrics = (data: any) => {
      const cats = data.lighthouseResult?.categories
      const audits = data.lighthouseResult?.audits
      return {
        performance_score: Math.round((cats?.performance?.score ?? 0) * 100),
        lcp: audits?.['largest-contentful-paint']?.numericValue,
        fcp: audits?.['first-contentful-paint']?.numericValue,
        tbt: audits?.['total-blocking-time']?.numericValue,
        cls: audits?.['cumulative-layout-shift']?.numericValue,
        speed_index: audits?.['speed-index']?.numericValue,
        lcp_display: audits?.['largest-contentful-paint']?.displayValue,
        fcp_display: audits?.['first-contentful-paint']?.displayValue,
        tbt_display: audits?.['total-blocking-time']?.displayValue,
        cls_display: audits?.['cumulative-layout-shift']?.displayValue,
        speed_index_display: audits?.['speed-index']?.displayValue,
      }
    }

    const mobileMetrics = extractMetrics(mobile)
    const desktopMetrics = extractMetrics(desktop)

    await supabaseAdmin
      .from('audit_data_cache')
      .upsert({
        prospect_id,
        pagespeed_mobile: mobileMetrics,
        pagespeed_desktop: desktopMetrics,
        pagespeed_fetched_at: new Date().toISOString(),
      }, { onConflict: 'prospect_id' })

    return NextResponse.json({ success: true, mobile: mobileMetrics, desktop: desktopMetrics })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
