// Extracted from dataforseo-core/route.ts (competitor geo-targeting) so any
// other call site needing the same "which AU city is this prospect in"
// detection - e.g. the LLM Visibility Check's query builder - shares it
// rather than growing a second, slightly different city-matching list.
//
// The `code` values below were wrong prior to 2026-08-17 - real DataForSEO
// city-level location_codes (verified live against their locations endpoint,
// not assumed) sit in the 1000000+ range (e.g. Sydney = 1000286), not the
// 21xxx range that was hard-coded here. That mismatch was the confirmed
// cause of the recurring "task error 40501 Invalid Field: 'location_code'"
// on serp_competitors/live whenever a prospect resolved isLocal: true - it
// silently fell back to the slower niche-search path (see dataforseo-core/
// route.ts's `< 3 competitors` branch) on every single local-target scan.
export const AU_CITY_MAP = [
  { terms: ['sydney', 'nsw', 'new south wales'], label: 'sydney', code: 1000286 },
  { terms: ['melbourne', 'vic', 'victoria'], label: 'melbourne', code: 1000567 },
  { terms: ['brisbane', 'qld', 'queensland'], label: 'brisbane', code: 1000339 },
  { terms: ['perth', 'western australia'], label: 'perth', code: 1000676 },
  { terms: ['adelaide', 'south australia'], label: 'adelaide', code: 1000422 },
  { terms: ['canberra', 'act'], label: 'canberra', code: 1000142 },
  { terms: ['hobart', 'tasmania'], label: 'hobart', code: 1000480 },
  { terms: ['darwin', 'northern territory'], label: 'darwin', code: 1000322 },
]

// location is the dedicated field for this, so a match there takes priority
// over scanning the free-text niche - falls back to niche only when location
// is empty or doesn't match a known AU city. Previously location was read
// into a locationCode that was computed, logged, and never actually used -
// every prospect's competitor discovery ran on niche-text detection alone,
// silently going national whenever niche didn't happen to name a city even
// if location correctly did.
export function detectLocalTarget(niche: string | null | undefined, location: string | null | undefined): { isLocal: boolean; cityTerm: string | null; localCode: number } {
  for (const source of [location, niche]) {
    if (!source) continue
    const s = source.toLowerCase()
    for (const city of AU_CITY_MAP) {
      if (city.terms.some(t => s.includes(t))) {
        return { isLocal: true, cityTerm: city.label, localCode: city.code }
      }
    }
  }
  return { isLocal: false, cityTerm: null, localCode: 2036 }
}
