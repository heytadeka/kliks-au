import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createProspectRecord } from '@/lib/create-prospect'
import { slugify } from '@/lib/slugify'

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
    business_name, store_url, social_handle,
    monthly_revenue, monthly_ad_spend,
    challenge, twelve_month_goal,
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
    niche: '', // not asked on this form - filled in during review, before the real scan runs
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
    monthly_revenue ? `Revenue: ${monthly_revenue}` : null,
    monthly_ad_spend ? `Ad spend: ${monthly_ad_spend}` : null,
    challenge ? `Challenge: ${challenge}` : null,
    twelve_month_goal ? `12mo goal: ${twelve_month_goal}` : null,
  ].filter(Boolean).join('\n')

  try {
    await supabaseAdmin
      .from('prospects')
      .update({
        application_data: { phone: phone || null, social_handle: social_handle || null, monthly_revenue: monthly_revenue || null, monthly_ad_spend: monthly_ad_spend || null, challenge: challenge || null, twelve_month_goal: twelve_month_goal || null },
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

  // Email notification alongside the CRM record - same Web3Forms access key
  // the homepage contact form already uses, just a different subject/fields.
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: '8d31ed39-c2e7-429c-b4ad-fa37a5ff26e5',
        subject: `New Growth Audit application - ${business_name}`,
        from_name: `${first_name} ${last_name || ''}`.trim(),
        email,
        phone: phone || 'Not provided',
        business_name,
        store_url: normalisedUrl,
        social_handle: social_handle || 'Not provided',
        monthly_revenue: monthly_revenue || 'Not provided',
        monthly_ad_spend: monthly_ad_spend || 'Not provided',
        challenge: challenge || 'Not provided',
        twelve_month_goal: twelve_month_goal || 'Not provided',
      }),
    })
  } catch (e: any) {
    console.error('[apply] Web3Forms notification failed (non-fatal):', e.message)
  }

  return NextResponse.json({ success: true, slug: prospect.slug })
}
