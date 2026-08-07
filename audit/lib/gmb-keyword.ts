// Shared by every business_data/google/* call (my_business_info, reviews,
// questions_and_answers, my_business_updates) - they all accept the same
// keyword/cid/place_id convention. Extracted from dataforseo-gmb/route.ts
// so reviews/Q&A/updates don't each need their own copy.
export function buildGmbKeyword(gmbId: string | null, brandName: string | null, domain: string): string {
  if (!gmbId) return brandName ?? domain
  const trimmed = gmbId.trim()
  if (trimmed.startsWith('cid:') || trimmed.startsWith('place_id:')) return trimmed
  if (trimmed.startsWith('ChI')) return `place_id:${trimmed}`
  return `cid:${trimmed}`
}
