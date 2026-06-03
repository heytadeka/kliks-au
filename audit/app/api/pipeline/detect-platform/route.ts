import { NextRequest, NextResponse } from 'next/server'
import { detectPlatform } from '@/lib/detect-platform'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json()
    if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
    const platform = await detectPlatform(domain)
    return NextResponse.json({ domain, platform })
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }
}
