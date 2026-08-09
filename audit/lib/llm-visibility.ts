import { detectLocalTarget } from './local-target'
import { normaliseDomain } from './domain-normalise'
import { LLM_VISIBILITY_MARKET } from './config'

// Tiered query construction, confirmed against 4 real prospects' actual
// stored niche/location values (not just placeholder text):
//   1. City already resolvable (via the same detectLocalTarget() used for
//      competitor geo-targeting - either location names a known AU city, or
//      niche already has one embedded, which is true for every real prospect
//      checked so far) -> "best {niche}", no location insertion needed.
//   2. No city resolvable, but a market qualifier exists -> "best {niche} in
//      {market}" - kept as a real branch (not a bare "else skip") for when
//      ecommerce prospects with no local angle start coming in, even though
//      every current real prospect resolves at tier 1.
//   3. Neither -> fully generic "best {niche}", same shape as tier 1. Only
//      reachable if LLM_VISIBILITY_MARKET is ever cleared - doesn't happen
//      today, kept for correctness rather than assuming it can't happen.
export function buildLlmVisibilityQuery(niche: string | null | undefined, location: string | null | undefined): string | null {
  const trimmedNiche = niche?.trim()
  if (!trimmedNiche) return null
  const { isLocal } = detectLocalTarget(trimmedNiche, location)
  if (isLocal) return `best ${trimmedNiche}`
  if (LLM_VISIBILITY_MARKET) return `best ${trimmedNiche} in ${LLM_VISIBILITY_MARKET}`
  return `best ${trimmedNiche}`
}

// Free-text search, not a domain-to-domain comparison - normaliseDomain() is
// reused only to get a clean comparable host string out of store_url (strip
// protocol/www/path), the actual check is a substring search of that string
// inside the model's response prose, not an equality check between two
// normalised domains the way competitor self-exclusion uses it.
const SNIPPET_RADIUS = 160

function extractSnippet(text: string, matchIndex: number, matchLen: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS)
  const end = Math.min(text.length, matchIndex + matchLen + SNIPPET_RADIUS)
  let snippet = text.slice(start, end)
  if (start > 0) {
    const firstSpace = snippet.indexOf(' ')
    snippet = firstSpace > 0 ? snippet.slice(firstSpace + 1) : snippet
  }
  if (end < text.length) {
    const lastSpace = snippet.lastIndexOf(' ')
    snippet = lastSpace > 0 ? snippet.slice(0, lastSpace) : snippet
  }
  return `${start > 0 ? '…' : ''}${snippet.trim()}${end < text.length ? '…' : ''}`
}

export function detectMention(responseText: string | null | undefined, brandName: string | null | undefined, storeUrl: string | null | undefined): { found: boolean; matchedSnippet: string | null } {
  if (!responseText) return { found: false, matchedSnippet: null }
  const lowerText = responseText.toLowerCase()

  const candidates: string[] = []
  if (brandName?.trim()) candidates.push(brandName.trim())
  if (storeUrl) {
    const domain = normaliseDomain(storeUrl)
    if (domain) candidates.push(domain)
  }

  for (const candidate of candidates) {
    const idx = lowerText.indexOf(candidate.toLowerCase())
    if (idx !== -1) {
      return { found: true, matchedSnippet: extractSnippet(responseText, idx, candidate.length) }
    }
  }
  return { found: false, matchedSnippet: null }
}
