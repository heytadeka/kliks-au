import { gunzipSync } from 'zlib'
import { NextRequest } from 'next/server'

export function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get('secret')
  return !!secret && secret === process.env.DATAFORSEO_WEBHOOK_SECRET
}

export function getProspectIdFromPostback(req: NextRequest): string | null {
  return req.nextUrl.searchParams.get('prospect_id')
}

// DataForSEO postback bodies are documented as gzip-compressed. Try
// decompressing first; fall back to reading the body as plain text if that
// fails, in case compression isn't applied the way expected in practice -
// this is the one part of the integration that can't be confirmed without
// a live postback actually landing, so it's written defensively rather
// than assuming the docs are precise here.
export async function parsePostbackBody(req: NextRequest): Promise<any> {
  const buf = Buffer.from(await req.arrayBuffer())
  try {
    const decompressed = gunzipSync(buf)
    return JSON.parse(decompressed.toString('utf-8'))
  } catch {
    return JSON.parse(buf.toString('utf-8'))
  }
}
