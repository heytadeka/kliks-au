// PageSpeed is now fetched entirely client-side via the browser (pagespeed-save route).
// This stub keeps the rescan route's fetch call intact without timing out on Vercel.

export const maxDuration = 10
export const preferredRegion = 'syd1'

export async function POST() {
  return Response.json({ ok: true, message: 'PageSpeed handled client-side' })
}
