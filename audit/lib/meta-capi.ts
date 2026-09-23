import crypto from 'crypto'

// Same pixel every page's browser-side fbq uses - CAPI events must land on
// the same pixel to dedupe against the browser fire.
const PIXEL_ID = '1875112903440305'

function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

// Meta matches phone numbers as exact digit strings with country code, no
// leading 0 or +. Applicants are all AU (site, form placeholder, audience),
// so a bare "04XX XXX XXX" gets normalised to "614XXXXXXXX" before hashing -
// left as-is otherwise rather than guessing at a country code.
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `61${digits.slice(1)}`
  return digits
}

// General-purpose CAPI sender, shared by every form on the site (audit apply,
// homepage contact form, book.html, patisserie.html, ad-junkies.html) so the
// hashing/fbp/fbc/dedup logic exists in exactly one place rather than being
// re-copied per page - same "one shared function" rule as resolveOrganicStats
// elsewhere in this app.
export async function sendMetaCapiEvent(params: {
  eventName: string
  eventId: string
  eventSourceUrl: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  contentName?: string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  testEventCode?: string
}) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!accessToken) {
    console.error('[meta-capi] META_CAPI_ACCESS_TOKEN not set, skipping')
    return
  }

  const userData: Record<string, any> = {
    em: [hash(params.email)],
  }
  if (params.firstName) userData.fn = [hash(params.firstName)]
  if (params.lastName) userData.ln = [hash(params.lastName)]
  if (params.phone) userData.ph = [hash(normalisePhone(params.phone))]
  if (params.clientIp) userData.client_ip_address = params.clientIp
  if (params.userAgent) userData.client_user_agent = params.userAgent
  if (params.fbp) userData.fbp = params.fbp
  if (params.fbc) userData.fbc = params.fbc

  const res = await fetch(`https://graph.facebook.com/v26.0/${PIXEL_ID}/events?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: params.eventSourceUrl,
        action_source: 'website',
        user_data: userData,
        ...(params.contentName ? { custom_data: { content_name: params.contentName } } : {}),
      }],
      // Ties this call to Meta's live Test Events debug view - pass ?test_event_code=
      // on the page URL while testing, omit it for real submissions.
      ...(params.testEventCode ? { test_event_code: params.testEventCode } : {}),
    }),
  })

  const json = await res.json()
  if (!res.ok || json.error) {
    console.error('[meta-capi] event rejected:', JSON.stringify(json))
  }
}

// Thin wrapper kept for the existing /audit apply route so it didn't need to
// change shape when this file was generalised for the rest of the site.
export async function sendMetaLeadEvent(params: {
  eventId: string
  email: string
  firstName: string
  lastName?: string
  phone?: string
  contentName?: string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  testEventCode?: string
}) {
  return sendMetaCapiEvent({
    ...params,
    eventName: 'Lead',
    eventSourceUrl: 'https://kliks.com.au/audit',
  })
}
