import { supabaseAdmin } from './supabase'

// Row-creation only (prospects + audit_content + audit_data_cache +
// outreach_log + monitored_domains mark-converted) - extracted out of
// admin/create/route.ts's "Phase 1" so a second caller (the public
// /api/audit/apply route) can create the same records without also
// inheriting Phase 2 (the crawl/PageSpeed/DataForSEO/commentary fan-out).
// admin/create/route.ts still calls this then fires Phase 2 itself
// immediately after - this function never fires the pipeline on its own,
// on purpose, so it's safe to call from a route that should only create a
// lightweight record for later review.
export type CreateProspectInput = {
  brand_name: string
  slug: string
  store_url: string
  prospect_name: string
  prospect_email: string
  niche: string
  cta_link?: string | null
  location?: string | null
  gmb_cid?: string | null
}

export async function createProspectRecord(input: CreateProspectInput): Promise<
  { success: true; prospect: any } | { success: false; error: string; status: number }
> {
  const { brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link, location, gmb_cid } = input

  const { data: existing } = await supabaseAdmin
    .from('prospects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return { success: false, error: 'A prospect with this slug already exists. Use a different slug or edit the existing audit.', status: 409 }
  }

  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from('prospects')
    .insert({ brand_name, slug, store_url, prospect_name, prospect_email, niche, cta_link: cta_link || '/book', location: location || null, gmb_cid: gmb_cid || null })
    .select()
    .single()

  if (prospectError) return { success: false, error: prospectError.message, status: 400 }

  await supabaseAdmin.from('audit_content').insert({ prospect_id: prospect.id })
  await supabaseAdmin.from('audit_data_cache').insert({ prospect_id: prospect.id })

  const domain = store_url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

  try {
    await supabaseAdmin.from('outreach_log').insert({
      prospect_id: prospect.id,
      domain,
      brand_name,
      prospect_name,
      prospect_email,
      audit_slug: slug,
      stage: 'not_contacted',
    })
  } catch (e: any) {
    console.error('[create-prospect] outreach_log insert failed (non-fatal):', e.message)
  }

  try {
    const { error } = await supabaseAdmin
      .from('monitored_domains')
      .update({ audit_created: true, status: 'converted', audit_slug: slug, audit_brand_name: brand_name })
      .eq('domain', domain)
    if (error) console.error('[create-prospect] monitored_domains mark-converted failed (non-fatal):', error.message)
  } catch (e: any) {
    console.error('[create-prospect] monitored_domains mark-converted failed (non-fatal):', e.message)
  }

  return { success: true, prospect }
}
