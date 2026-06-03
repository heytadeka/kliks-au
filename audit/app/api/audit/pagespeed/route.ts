import { NextRequest, NextResponse } from 'next/server'
import { savePagespeedData } from '@/lib/pagespeed'

// PAGESPEED_SERVICE_URL must also be set in Vercel environment variables.
const PAGESPEED_SERVICE_URL =
  process.env.PAGESPEED_SERVICE_URL ||
  'https://pagespeed-service-981518713562.australia-southeast1.run.app'

export const maxDuration = 60
export const preferredRegion = 'syd1'

export async function POST(req: NextRequest) {
  const { prospect_id, store_url } = await req.json()

  console.log('[pagespeed] calling Cloud Run for:', store_url)

  let mobile: any = null
  let desktop: any = null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)
    try {
      const res = await fetch(`${PAGESPEED_SERVICE_URL}/pagespeed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: store_url, prospect_id }),
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        mobile = data.mobile ?? null
        desktop = data.desktop ?? null
        console.log('[pagespeed] Cloud Run response - mobile:', !!mobile, 'desktop:', !!desktop)
      } else {
        console.error('[pagespeed] Cloud Run HTTP error:', res.status)
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[pagespeed] Cloud Run request timed out for:', store_url)
    } else {
      console.error('[pagespeed] Cloud Run request failed:', err.message)
    }
  }

  if (!mobile && !desktop) {
    return NextResponse.json({ success: false, error: 'No PageSpeed data returned' })
  }

  const result = await savePagespeedData(prospect_id, mobile, desktop)
  return NextResponse.json(result)
}
