import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { savePagespeedData } from '@/lib/pagespeed'

// Accepts full PSI results from the browser admin UI as a fallback/manual trigger.
// The primary path is now pagespeed/route.ts → Cloud Run (Australia).

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id, mobile, desktop } = await req.json()
  if (!prospect_id || (!mobile && !desktop)) {
    return NextResponse.json({ error: 'Missing prospect_id or pagespeed data' }, { status: 400 })
  }

  const result = await savePagespeedData(prospect_id, mobile, desktop)
  return result.success
    ? NextResponse.json(result)
    : NextResponse.json(result, { status: 500 })
}
