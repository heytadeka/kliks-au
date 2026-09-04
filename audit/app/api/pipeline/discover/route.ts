import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { detectPlatform } from '@/lib/detect-platform'
import { cookies } from 'next/headers'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

const BLOCK_DOMAINS = [
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com',
  'wikipedia.org', 'pinterest.com', 'reddit.com', 'yelp.com',
  'tripadvisor.com', 'amazon.com', 'ebay.com', 'etsy.com',
]

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { query, max_results = 20 } = await req.json()
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })
  const limit = Math.min(Number(max_results) || 20, 50)

  // Step 1 — DataForSEO organic search
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const dfsRes = await fetch(`${DATAFORSEO_BASE}/serp/google/organic/live/advanced`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      keyword: query,
      location_code: 2036,
      language_code: 'en',
      device: 'desktop',
      depth: 100,
    }]),
  })
  const dfsJson = await dfsRes.json()
  console.log('[pipeline/discover] dfs status:', dfsRes.status)

  const items: any[] = dfsJson?.tasks?.[0]?.result?.[0]?.items ?? []
  const rawDomains: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    if (item.type !== 'organic') continue
    const d: string = (item.domain ?? '').toLowerCase().replace(/^www\./, '')
    if (!d || seen.has(d)) continue
    if (BLOCK_DOMAINS.some(b => d.includes(b))) continue
    seen.add(d)
    rawDomains.push(d)
    if (rawDomains.length >= limit) break
  }

  console.log('[pipeline/discover] raw domains:', rawDomains.length)

  // Step 2 — Platform detection in batches of 10
  const detections: { domain: string; platform: string }[] = []
  for (let i = 0; i < rawDomains.length; i += 10) {
    const batch = rawDomains.slice(i, i + 10)
    const settled = await Promise.allSettled(
      batch.map(async (d) => ({ domain: d, platform: await detectPlatform(d) }))
    )
    for (const r of settled) {
      if (r.status === 'fulfilled') detections.push(r.value)
    }
  }

  // Step 3 — Filter to qualifying platforms and upsert
  const qualifying = detections.filter(r => r.platform === 'shopify' || r.platform === 'squarespace')
  console.log('[pipeline/discover] qualifying:', qualifying.length)

  if (qualifying.length > 0) {
    const now = new Date().toISOString()
    const domainList = qualifying.map(r => r.domain)

    const { data: existingRows } = await supabaseAdmin
      .from('monitored_domains')
      .select('domain, platform')
      .in('domain', domainList)

    const existingMap = new Map((existingRows ?? []).map((r: any) => [r.domain, r.platform]))

    // A domain can already be a real contacted prospect (outreach_log)
    // without ever having a monitored_domains row - e.g. it was created
    // through Outreach or the New Prospect page, not discovered here. Without
    // this check it would insert as a fresh 'active' find with no idea it's
    // already been emailed.
    const { data: outreachRows } = await supabaseAdmin
      .from('outreach_log')
      .select('domain')
      .in('domain', domainList)
    const alreadyContacted = new Set((outreachRows ?? []).map((r: any) => r.domain))

    for (const { domain, platform } of qualifying) {
      const existingPlatform = existingMap.get(domain)
      if (!existingPlatform) {
        await supabaseAdmin.from('monitored_domains').insert({
          domain,
          platform,
          platform_detected_at: now,
          niche: query,
          status: alreadyContacted.has(domain) ? 'converted' : 'active',
        })
      } else if (existingPlatform === 'unknown') {
        await supabaseAdmin.from('monitored_domains')
          .update({ platform, platform_detected_at: now, niche: query })
          .eq('domain', domain)
      }
    }
  }

  // Step 4 — Response
  return NextResponse.json({
    query,
    total_checked: rawDomains.length,
    shopify_found: qualifying.filter(r => r.platform === 'shopify').length,
    squarespace_found: qualifying.filter(r => r.platform === 'squarespace').length,
    domains: qualifying,
  })
}
