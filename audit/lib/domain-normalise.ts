// Strips protocol, www., and everything after the first /, ?, or # so two
// differently-formatted strings for the same host compare equal. Extracted
// from dataforseo-core/route.ts (competitor self-exclusion/dedup) so other
// call sites needing the same host comparison - e.g. LLM-visibility mention
// detection - reuse this instead of a second, slightly different copy.
export function normaliseDomain(d: string): string {
  return d
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
}
