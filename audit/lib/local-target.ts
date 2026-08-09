// Extracted from dataforseo-core/route.ts (competitor geo-targeting) so any
// other call site needing the same "which AU city is this prospect in"
// detection - e.g. the LLM Visibility Check's query builder - shares it
// rather than growing a second, slightly different city-matching list.
export const AU_CITY_MAP = [
  { terms: ['sydney', 'nsw', 'new south wales'], label: 'sydney', code: 21167 },
  { terms: ['melbourne', 'vic', 'victoria'], label: 'melbourne', code: 21182 },
  { terms: ['brisbane', 'qld', 'queensland'], label: 'brisbane', code: 21139 },
  { terms: ['perth', 'western australia'], label: 'perth', code: 21188 },
  { terms: ['adelaide', 'south australia'], label: 'adelaide', code: 21136 },
  { terms: ['canberra', 'act'], label: 'canberra', code: 21124 },
  { terms: ['hobart', 'tasmania'], label: 'hobart', code: 21172 },
  { terms: ['darwin', 'northern territory'], label: 'darwin', code: 21128 },
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
