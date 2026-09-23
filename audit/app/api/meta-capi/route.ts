import { NextRequest, NextResponse } from 'next/server'
import { sendMetaCapiEvent } from '@/lib/meta-capi'

export const maxDuration = 15

// Public tracking endpoint shared by every non-audit form on the site
// (homepage contact form, book.html, patisserie.html, ad-junkies.html) -
// mirrors /api/audit/apply's inline CAPI call, generalised so those static
// pages (which have no server of their own) can fire a real server-side
// Meta event instead of relying on the browser pixel alone. Reachable at
// kliks.com.au/api/meta-capi via the existing root vercel.json rewrite
// (/api/(.*) -> /audit/api/$1) - no new Vercel config needed.
const ALLOWED_EVENTS = new Set(['Lead', 'Subscribe', 'Schedule'])

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    event_name,
    event_id,
    email,
    first_name,
    last_name,
    phone,
    event_source_url,
    content_name,
    test_event_code,
  } = body

  if (!ALLOWED_EVENTS.has(event_name) || !event_id || !email || !event_source_url) {
    return NextResponse.json({ success: false, error: 'Missing or invalid required fields' }, { status: 400 })
  }

  try {
    await sendMetaCapiEvent({
      eventName: event_name,
      eventId: event_id,
      eventSourceUrl: event_source_url,
      email,
      firstName: first_name || undefined,
      lastName: last_name || undefined,
      phone: phone || undefined,
      contentName: content_name || undefined,
      clientIp: req.headers.get('x-forwarded-for')?.split(',')[0].trim(),
      userAgent: req.headers.get('user-agent') || undefined,
      fbp: req.cookies.get('_fbp')?.value,
      fbc: req.cookies.get('_fbc')?.value,
      testEventCode: test_event_code || undefined,
    })
  } catch (e: any) {
    console.error('[meta-capi route] send failed (non-fatal):', e.message)
  }

  // Always 200 - this is a fire-and-forget tracking call, callers don't
  // branch on the result (same "non-fatal" treatment as the apply route's
  // own inline CAPI call).
  return NextResponse.json({ success: true })
}
