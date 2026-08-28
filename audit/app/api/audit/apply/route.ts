import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createProspectRecord } from '@/lib/create-prospect'
import { slugify } from '@/lib/slugify'
import { sendMetaLeadEvent } from '@/lib/meta-capi'

export const maxDuration = 30

// Public endpoint behind the Growth Audit landing page (/audit). Deliberately
// stops after createProspectRecord's Phase 1 - this creates a lightweight
// record for review, it does NOT fire the crawl/PageSpeed/DataForSEO/
// commentary pipeline the way admin/create/route.ts does. That only runs
// once a human decides the application is worth it, via the existing
// "Re-run Data Scan" button already on the edit page - no new "approve"
// action needed for that part.
async function findAvailableSlug(base: string): Promise<string> {
  const candidate = base || 'applicant'
  const { data: existing } = await supabaseAdmin.from('prospects').select('slug').ilike('slug', `${candidate}%`)
  const taken = new Set((existing ?? []).map(r => r.slug))
  if (!taken.has(candidate)) return candidate
  for (let i = 2; i < 50; i++) {
    const attempt = `${candidate}-${i}`
    if (!taken.has(attempt)) return attempt
  }
  return `${candidate}-${Date.now()}`
}

export async function POST(req: NextRequest) {
  try {
    return await handleApply(req)
  } catch (e: any) {
    // A public, unauthenticated form should never hand a real visitor a raw
    // 500 - the client already degrades gracefully on this, but the route
    // itself shouldn't rely on that alone.
    console.error('[apply] unhandled error:', e?.message ?? e)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again or email adam@kliks.com.au directly.' }, { status: 500 })
  }
}

async function handleApply(req: NextRequest) {
  const body = await req.json()
  const {
    first_name, last_name, email, phone,
    business_name, store_url, social_handle, keywords,
    monthly_revenue, monthly_ad_spend,
    challenge, twelve_month_goal,
    event_id, // shared with the browser-side fbq Lead fire, for CAPI dedup
    test_event_code, // present only when testing via ?test_event_code= on /audit
    hp_field, // honeypot - real visitors never see or fill this
  } = body

  if (hp_field) {
    // Silent success - don't tip off whatever filled it in.
    return NextResponse.json({ success: true })
  }

  if (!first_name || !email || !business_name || !store_url) {
    return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
  }

  const normalisedUrl = store_url.startsWith('http') ? store_url : `https://${store_url}`
  const slug = await findAvailableSlug(slugify(business_name))

  const result = await createProspectRecord({
    brand_name: business_name,
    slug,
    store_url: normalisedUrl,
    prospect_name: `${first_name} ${last_name || ''}`.trim(),
    prospect_email: email,
    niche: keywords || '',
  })

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  const { prospect } = result

  // Store the full structured application alongside a human-readable notes
  // summary - notes already renders in the existing detail panel, so this is
  // visible immediately with no new UI, while application_data keeps the
  // structured version for anything that wants it later.
  const notesSummary = [
    phone ? `Phone: ${phone}` : null,
    social_handle ? `Social: ${social_handle}` : null,
    keywords ? `Keywords: ${keywords}` : null,
    monthly_revenue ? `Revenue: ${monthly_revenue}` : null,
    monthly_ad_spend ? `Ad spend: ${monthly_ad_spend}` : null,
    challenge ? `Challenge: ${challenge}` : null,
    twelve_month_goal ? `12mo goal: ${twelve_month_goal}` : null,
  ].filter(Boolean).join('\n')

  try {
    await supabaseAdmin
      .from('prospects')
      .update({
        application_data: { phone: phone || null, social_handle: social_handle || null, keywords: keywords || null, monthly_revenue: monthly_revenue || null, monthly_ad_spend: monthly_ad_spend || null, challenge: challenge || null, twelve_month_goal: twelve_month_goal || null },
      })
      .eq('id', prospect.id)

    if (notesSummary) {
      await supabaseAdmin
        .from('outreach_log')
        .update({ notes: `Applied via Growth Audit form:\n${notesSummary}` })
        .eq('prospect_id', prospect.id)
    }
  } catch (e: any) {
    console.error('[apply] application_data/notes write failed (non-fatal):', e.message)
  }

  if (event_id) {
    try {
      await sendMetaLeadEvent({
        eventId: event_id,
        email,
        firstName: first_name,
        lastName: last_name || undefined,
        phone: phone || undefined,
        clientIp: req.headers.get('x-forwarded-for')?.split(',')[0].trim(),
        userAgent: req.headers.get('user-agent') || undefined,
        fbp: req.cookies.get('_fbp')?.value,
        fbc: req.cookies.get('_fbc')?.value,
        testEventCode: test_event_code || undefined,
      })
    } catch (e: any) {
      console.error('[apply] Meta CAPI event failed (non-fatal):', e.message)
    }
  }

  // Web3Forms rejects server-to-server calls on the free plan ("Use our API
  // in client side" - confirmed directly against the endpoint), so the email
  // notification fires from the browser instead, after this responds - see
  // GrowthAuditForm.tsx.
  return NextResponse.json({ success: true, slug: prospect.slug })
}
