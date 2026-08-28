import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'
import { createProspectRecord } from '@/lib/create-prospect'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link, location, gmb_cid } = body

  // Phase 1: create prospects/audit_content/audit_data_cache/outreach_log -
  // see lib/create-prospect.ts (shared with the public apply route, which
  // stops here and never reaches Phase 2 below).
  const result = await createProspectRecord({ brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link, location, gmb_cid })
  if (!result.success) return NextResponse.json({ error: result.error }, { status: result.status })
  const { prospect } = result

  // Phase 2: fire all jobs in background without awaiting - return to browser immediately
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const h = { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY! }
  const pid = prospect.id

  // Fire all background jobs independently.
  // dataforseo-core: overview, keywords, SERP competitors, content gap (~25-30s)
  // dataforseo-enrichment: polls for pagespeed/crawl/dataforseo-core readiness, then fires commentary
  // dataforseo-gmb: dedicated GMB route with 30s timeout and its own 60s budget
  // dataforseo-gmb-qa: synchronous Q&A, same shape as dataforseo-gmb
  // dataforseo-gmb-tasks: fires the async reviews + GBP-updates task_post calls once
  //   dataforseo-gmb resolves a place_id (polls audit_data_cache internally, see its own
  //   comments) - postback-driven, not part of the readiness gate, does not block commentary
  // dataforseo-llm-visibility: synchronous chat_gpt/claude/perplexity llm_responses/live
  //   calls, same shape as dataforseo-gmb-qa - not part of the readiness gate either
  // Each dataforseo route fetches the prospect record itself — only prospect_id needed.
  console.log('[create] firing background jobs for prospect_id:', pid, 'base:', base)
  waitUntil(fetch(`${base}/api/audit/pagespeed`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, store_url }) }))
  waitUntil(fetch(`${base}/api/audit/crawl`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, store_url }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-core`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-enrichment`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb-qa`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-gmb-tasks`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid }) }))
  waitUntil(fetch(`${base}/api/audit/dataforseo-llm-visibility`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid }) }))
  waitUntil(fetch(`${base}/api/audit/keyword-planner`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, niche, store_url }) }))
  waitUntil(fetch(`${base}/api/audit/meta-ads`, { method: 'POST', headers: h, body: JSON.stringify({ prospect_id: pid, brand_name, store_url }) }))

  return NextResponse.json({ success: true, prospect_id: prospect.id, slug: prospect.slug, brand_name })
}
