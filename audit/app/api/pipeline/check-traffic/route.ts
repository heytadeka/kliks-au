import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'
const WEB3FORMS_KEY = '8d31ed39-c2e7-429c-b4ad-fa37a5ff26e5'
const ALERT_EMAIL = 'wearekliks@gmail.com'
const PIPELINE_URL = 'kliks.com.au/audit/admin/pipeline'

function fmtK(n: number | null): string {
  if (n == null || n === 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(Math.round(n))
}

async function runTrafficCheck() {
  // Step 1 — Fetch all active domains
  const { data: activeDomains, error: fetchError } = await supabaseAdmin
    .from('monitored_domains')
    .select('id, domain, platform, niche, traffic_current, flagged')
    .eq('status', 'active')

  if (fetchError) {
    console.error('[check-traffic] fetch error:', fetchError.message)
    return { error: fetchError.message, checked: 0 }
  }

  if (!activeDomains || activeDomains.length === 0) {
    return { checked: 0, flagged_new: 0, flagged_domains: [] }
  }

  // Step 2 — DataForSEO bulk traffic estimation (batches of 1000)
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString('base64')

  const trafficMap = new Map<string, number>()
  const targets = activeDomains.map((d: any) => d.domain)

  for (let i = 0; i < targets.length; i += 1000) {
    const batch = targets.slice(i, i + 1000)
    try {
      const res = await fetch(
        `${DATAFORSEO_BASE}/dataforseo_labs/google/bulk_traffic_estimation/live`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            targets: batch,
            location_code: 2036,
            language_code: 'en',
            item_types: ['organic'],
          }]),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        console.error('[check-traffic] DataForSEO HTTP error:', res.status, JSON.stringify(json))
        return { error: `DataForSEO error: ${res.status}`, checked: 0 }
      }
      const items: any[] = json?.tasks?.[0]?.result?.[0]?.items ?? []
      for (const item of items) {
        const key = (item.target ?? '').toLowerCase().replace(/^www\./, '')
        trafficMap.set(key, item.metrics?.organic?.etv ?? 0)
      }
    } catch (e: any) {
      console.error('[check-traffic] DataForSEO request failed:', e.message)
      return { error: e.message, checked: 0 }
    }
  }

  // Step 3 — Update each domain and collect newly flagged
  const now = new Date().toISOString()
  const newlyFlagged: {
    domain: string
    platform: string
    niche: string | null
    prev_traffic: number | null
    new_traffic: number
    drop_pct: number
  }[] = []

  for (const row of activeDomains as any[]) {
    const key = (row.domain as string).toLowerCase().replace(/^www\./, '')
    const newTraffic = trafficMap.get(key) ?? 0
    const prevTraffic: number | null = row.traffic_current ?? null

    const dropPct =
      prevTraffic != null && prevTraffic > 0
        ? ((prevTraffic - newTraffic) / prevTraffic) * 100
        : null

    const shouldFlag = dropPct !== null && dropPct > 15
    const wasAlreadyFlagged = row.flagged === true
    const isNewlyFlagged = shouldFlag && !wasAlreadyFlagged

    const updatePayload: Record<string, any> = {
      traffic_previous: Math.round(prevTraffic ?? 0),
      traffic_current: Math.round(newTraffic),
      traffic_checked_at: now,
      traffic_drop_pct: dropPct,
      flagged: shouldFlag,
    }
    if (isNewlyFlagged) {
      updatePayload.flagged_at = now
    }

    const { error: updateError } = await supabaseAdmin
      .from('monitored_domains')
      .update(updatePayload)
      .eq('id', row.id)

    if (updateError) {
      console.error('[check-traffic] update error for', row.domain, updateError.message)
    }

    if (isNewlyFlagged && dropPct !== null) {
      newlyFlagged.push({
        domain: row.domain,
        platform: row.platform,
        niche: row.niche ?? null,
        prev_traffic: prevTraffic,
        new_traffic: newTraffic,
        drop_pct: dropPct,
      })
    }
  }

  // Steps 4+5 — Send alert email if any newly flagged
  if (newlyFlagged.length > 0) {
    const domainLines = newlyFlagged
      .map(d => {
        const pct = Math.round(d.drop_pct)
        const wasStr = fmtK(d.prev_traffic)
        const nowStr = fmtK(d.new_traffic)
        return `- ${d.domain} — dropped ${pct}% (was ${wasStr}, now ${nowStr})\n  Platform: ${d.platform ?? 'unknown'}\n  Niche: ${d.niche ?? 'unknown'}`
      })
      .join('\n\n')

    const count = newlyFlagged.length
    const message = [
      `Traffic drop detected on ${count} monitored store${count === 1 ? '' : 's'}.`,
      '',
      domainLines,
      '',
      `Go to pipeline: ${PIPELINE_URL}`,
      '',
      '— Kliks Pipeline',
    ].join('\n')

    try {
      const emailRes = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Pipeline Alert — ${count} store${count === 1 ? '' : 's'} flagged`,
          from_name: 'Kliks Pipeline',
          email: ALERT_EMAIL,
          message,
        }),
      })
      await emailRes.json()
    } catch (e: any) {
      console.error('[check-traffic] email send failed (non-blocking):', e.message)
    }
  }

  // Step 6 — Return summary
  return {
    checked: activeDomains.length,
    flagged_new: newlyFlagged.length,
    flagged_domains: newlyFlagged.map(d => ({
      domain: d.domain,
      drop_pct: Math.round(d.drop_pct),
      platform: d.platform,
    })),
  }
}

export async function GET() {
  try {
    const result = await runTrafficCheck()
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[check-traffic] unhandled error:', e.message)
    return NextResponse.json({ error: e.message, checked: 0 }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await runTrafficCheck()
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[check-traffic] unhandled error:', e.message)
    return NextResponse.json({ error: e.message, checked: 0 }, { status: 500 })
  }
}
