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

// The form no longer asks for a business name (one less field, less friction),
// so a reasonable brand name is guessed from the domain instead. Adam can
// correct it from the admin edit page if the guess is off.
function deriveBrandNameFromDomain(domain: string): string {
  const root = domain.split('.')[0] || domain
  const guess = root
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return guess || domain
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
    first_name, email, phone, store_url,
    monthly_revenue, challenge,
    event_id, // shared with the browser-side fbq Lead fire, for CAPI dedup
    test_event_code, // present only when testing via ?test_event_code= on /audit
    hp_field, // honeypot - real visitors never see or fill this
  } = body

  if (hp_field) {
    // Silent success - don't tip off whatever filled it in.
    return NextResponse.json({ success: true })
  }

  if (!first_name || !email || !store_url) {
    return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
  }

  const normalisedUrl = store_url.startsWith('http') ? store_url : `https://${store_url}`
  const domain = normalisedUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase()
  const business_name = deriveBrandNameFromDomain(domain)
  const slug = await findAvailableSlug(slugify(business_name))

  const result = await createProspectRecord({
    brand_name: business_name,
    slug,
    store_url: normalisedUrl,
    prospect_name: first_name,
    prospect_email: email,
    niche: '',
  })

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  const { prospect } = result

  // Store the full structured request alongside a human-readable notes
  // summary - notes already renders in the existing detail panel, so this is
  // visible immediately with no new UI, while application_data keeps the
  // structured version for anything that wants it later.
  const notesSummary = [
    phone ? `Phone: ${phone}` : null,
    monthly_revenue ? `Revenue: ${monthly_revenue}` : null,
    challenge ? `Challenge: ${challenge}` : null,
  ].filter(Boolean).join('\n')

  try {
    await supabaseAdmin
      .from('prospects')
      .update({
        application_data: { phone: phone || null, monthly_revenue: monthly_revenue || null, challenge: challenge || null },
      })
      .eq('id', prospect.id)

    if (notesSummary) {
      await supabaseAdmin
        .from('outreach_log')
        .update({ notes: `Requested via Growth Audit form:\n${notesSummary}` })
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
