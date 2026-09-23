import crypto from 'crypto'

// Same pixel the homepage and the Growth Audit page's browser-side fbq use -
// CAPI events must land on the same pixel to dedupe against the browser fire.
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

export async function sendMetaLeadEvent(params: {
  eventId: string
  email: string
  firstName: string
  lastName?: string
  phone?: string
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
    fn: [hash(params.firstName)],
  }
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
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: 'https://kliks.com.au/audit',
        action_source: 'website',
        user_data: userData,
      }],
      // Ties this call to Meta's live Test Events debug view - pass ?test_event_code=
      // on the /audit URL while testing, omit it for real applicant submissions.
      ...(params.testEventCode ? { test_event_code: params.testEventCode } : {}),
    }),
  })

  const json = await res.json()
  if (!res.ok || json.error) {
    console.error('[meta-capi] event rejected:', JSON.stringify(json))
  }
}
