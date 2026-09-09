import { NextRequest, NextResponse } from 'next/server'

// A/B split for the free Growth Audit landing page. Public URL stays
// kliks.com.au/audit either way (Vercel's own rewrite maps that to this
// app's "/") - visitors assigned to variant B are internally rewritten to
// /b, so ad links, UTM params and the URL bar never change.
const COOKIE_NAME = 'kliks_audit_variant'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, so a repeat visitor keeps seeing the same variant

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(COOKIE_NAME)?.value
  const variant = existing === 'a' || existing === 'b' ? existing : (Math.random() < 0.5 ? 'a' : 'b')

  const res = variant === 'b'
    ? NextResponse.rewrite(new URL('/b', req.url))
    : NextResponse.next()

  if (!existing) {
    res.cookies.set(COOKIE_NAME, variant, { maxAge: COOKIE_MAX_AGE, path: '/', sameSite: 'lax' })
  }

  return res
}

export const config = {
  matcher: '/',
}
