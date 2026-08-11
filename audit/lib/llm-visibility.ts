import { detectLocalTarget, AU_CITY_MAP } from './local-target'
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

// ── Competitor-name extraction (AI Visibility Section, design handoff 1b) ──
// Heuristic, not real NLP entity recognition - there's no existing "extract
// unknown proper nouns from prose" utility in this codebase to reuse
// (detectMention() above checks for ONE *known* name, it doesn't discover
// unknown ones). Two-tier extraction, confirmed necessary against real
// responses seen this session: **bold** markdown spans are the primary
// signal (Perplexity's real response bolded every business name), falling
// back to a Title-Case phrase match only for a response with zero bold
// spans at all (ChatGPT's real test response used plain prose, no markdown
// whatsoever). Cross-response counting is exact-match only (case/whitespace
// normalised) - no fuzzy merging of near-duplicate variants ("Looma's" vs
// "Looma's Cakes" stay separate entries), a deliberate choice to avoid
// silently merging what might be two different businesses.
const GENERIC_PLACE_TERMS = new Set<string>(
  AU_CITY_MAP.flatMap(city => city.terms).concat(['australia'])
)
const GENERIC_NON_COMPETITOR_TERMS = new Set(['chatgpt', 'claude', 'perplexity', 'openai', 'anthropic', 'google'])

// Confirmed live on production (bakealicious-by-gabriela's real report):
// "Strawberry Watermelon Cake" and "Metro Sydney" both passed
// looksLikeProperNounPhrase (every word capitalised, no connector issue)
// but are a dish name and a delivery zone, not businesses. Not solvable by
// capitalisation shape alone - these words are generic regardless of case.
// Rejects a candidate only when EVERY word in it is generic (see
// isAllGenericWords below) - "Black Star Pastry" and "Adora Handmade
// Chocolates" keep the real business intact because "Black"/"Star"/"Adora"
// aren't generic, even though "Pastry"/"Chocolates" are. Deliberately
// biased toward under-extraction per explicit direction: a real business
// whose every word happens to be generic ("CBD Cakes" - both words are
// generic on their own) gets filtered out too. Accepted cost - a missed
// competitor is a minor loss, a fake entry in a list titled "the AI's pick,
// instead" is a real credibility problem. List isn't exhaustive, same
// disclosed-heuristic spirit as the connector/leading-stopword fixes.
// Deliberately excludes business-TYPE words ("bakery", "cakery", "patisserie",
// "cafe") even though they're food-adjacent - those are a positive signal of
// a real business (e.g. "The Cupcake Bakery", confirmed extractable in
// testing), not a dish descriptor. Only actual food/flavour/occasion words
// that describe an ITEM rather than a BUSINESS belong in this list.
const GENERIC_FOOD_TERMS = new Set([
  'cake', 'cakes', 'cupcake', 'cupcakes', 'pastry', 'pastries', 'dessert', 'desserts',
  'chocolate', 'chocolates', 'cookie', 'cookies', 'brownie', 'brownies', 'tart', 'tarts',
  'muffin', 'muffins', 'donut', 'donuts', 'doughnut', 'doughnuts', 'bread', 'slice', 'slices',
  'sweet', 'sweets', 'treat', 'treats',
  'watermelon', 'strawberry', 'vanilla', 'caramel', 'custard', 'cream', 'icing', 'frosting',
  'fudge', 'macaron', 'macarons', 'macaroon', 'macaroons', 'sponge', 'velvet', 'lemon', 'lime',
  'mango', 'red', 'wedding', 'birthday', 'engagement', 'celebration', 'celebrations',
  'gourmet', 'artisan', 'handmade', 'homemade', 'custom', 'signature', 'classic', 'traditional',
  // Added after auditing every real llm_visibility_results row in the DB
  // (not just the two cases first reported) - miss-lillys-bakery-cafe's
  // dish-specific query ("best sydney order carrot cake") surfaced a
  // cluster of dish/flavour words this list didn't cover yet: "Carrot &
  // Walnut", "Vanilla Bean", "Carrot Cake Loaf", etc. all slipped through
  // because "carrot"/"walnut"/"bean"/"loaf"/"layer"/"tall"/"vegan" weren't
  // here. Same principle as before, just more coverage.
  'carrot', 'walnut', 'bean', 'beans', 'coconut', 'banana', 'pecan', 'pecans', 'pineapple',
  'cinnamon', 'raspberry', 'blueberry', 'passionfruit', 'salted', 'buttercream', 'fondant',
  'ganache', 'meringue', 'praline', 'loaf', 'loaves', 'layer', 'layers', 'tier', 'tiered', 'tall',
  'vegan', 'gluten-free', 'nut-free', 'dairy-free', 'eggless',
])
const GENERIC_GEO_TERMS = new Set([
  'metro', 'cbd', 'area', 'areas', 'suburb', 'suburbs', 'delivery', 'region', 'regions',
  'zone', 'zones', 'district', 'districts', 'city', 'town', 'local', 'nationwide', 'national',
])
// Common bolded/capitalised list-topic labels found live in real responses
// structured as "**Label** - description" or "**Label:** description"
// ("**Occasion** - Birthday, wedding...", "**Best for Sydney:** Cake
// Mail..."). These aren't dish or geography words, they're meta-vocabulary
// about the LIST ITSELF, a third category the food/geo lists don't cover.
// Checking "does a colon/dash follow the match" was considered and
// rejected - real business names are followed by " - description" just as
// often ("**Black Star Pastry** - Famous for..."), so position alone can't
// distinguish a label from a name; only the word itself can.
const GENERIC_LABEL_TERMS = new Set([
  'best', 'top', 'good', 'great',
  'occasion', 'occasions', 'reviews', 'review', 'tips', 'tip', 'considerations', 'consideration',
  'notes', 'note', 'summary', 'options', 'option', 'ordering', 'order', 'website', 'websites',
  'location', 'locations', 'hours', 'contact', 'highlights', 'highlight', 'pricing', 'price',
  'prices', 'shipping', 'availability', 'menu', 'ingredients', 'allergens', 'dietary', 'choosing',
])
function isGenericWord(word: string): boolean {
  const lower = word.toLowerCase().replace(/[:.,;]+$/, '')
  return GENERIC_FOOD_TERMS.has(lower) || GENERIC_GEO_TERMS.has(lower) || GENERIC_PLACE_TERMS.has(lower) || GENERIC_NON_COMPETITOR_TERMS.has(lower) || GENERIC_LABEL_TERMS.has(lower)
}
function isAllGenericWords(phrase: string): boolean {
  const words = phrase.split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  return words.every(w => NAME_CONNECTOR_WORDS_SET.has(w.toLowerCase()) || isGenericWord(w))
}

// Shared with looksLikeProperNounPhrase below - one list, not two, so a name
// like "Cakes by Kate" (real example from this exact design handoff's own
// reference copy) is recognised consistently by both the Title-Case regex's
// optional connector and the bold-span filter, instead of drifting apart.
const NAME_CONNECTOR_WORDS = ['a', 'an', 'the', 'of', 'in', 'on', 'for', 'at', 'by', 'and', '&', "'s"]
const NAME_CONNECTOR_WORDS_SET = new Set(NAME_CONNECTOR_WORDS)
const NAME_CONNECTOR_ALTERNATION = NAME_CONNECTOR_WORDS.filter(w => w !== "'s").join('|')

function extractBoldSpans(text: string): string[] {
  return Array.from(text.matchAll(/\*\*([^*]{2,60})\*\*/g)).map(m => m[1].trim()).filter(Boolean)
}

// A run of 2-4 consecutive Title-Case words (optionally joined by a common
// lowercase connector - "by", "of", "and", etc.) is a reasonably strong
// proper-noun signal in ordinary English prose, since only a sentence's
// first word is capitalised otherwise. Known ambiguity, not fully solvable
// with a regex: "and" is a real internal connector in some names but also a
// genuine boundary between two separate names ("Black Star Pastry and Adora
// Handmade Chocolates") - confirmed on synthetic test data that the greedy
// word cap can occasionally split at the wrong point in that case. Accepted
// as a known limitation of a heuristic, not a real NLP parser.
// A sentence-initial capitalised word (a verb like "Named"/"Recommended", or
// "Try"/"Consider"/"Some") is indistinguishable from a real name's first
// word by capitalisation alone, and when it directly precedes a real name
// with no lowercase word breaking the run ("Named Black Star Pastry..."),
// the regex above sweeps it in. Confirmed on synthetic test data. Stripped
// off the front rather than rejecting the whole match, since the rest of
// the phrase is usually still a genuine name.
const LEADING_STOPWORDS = new Set([
  'named', 'recommended', 'recommends', 'try', 'consider', 'pointed', 'pick',
  'some', 'several', 'other', 'others', 'both', 'many', 'most',
  'here', 'this', 'that', 'these', 'those',
  'for', 'from', 'if', 'when', 'while', 'since', 'because', 'so', 'also',
  'you', 'your', 'i', 'we', 'they', 'it',
])
function stripLeadingStopword(phrase: string): string | null {
  const words = phrase.split(/\s+/)
  if (words.length > 1 && LEADING_STOPWORDS.has(words[0].toLowerCase())) {
    const rest = words.slice(1)
    return rest.length >= 2 ? rest.join(' ') : null
  }
  return phrase
}

// Character class includes the Latin-1 accented range (À-ÿ) - found live on
// production: "Lopé Cake Studio" was truncating to "Cake Studio" because
// the accented "é" fell outside the original [a-zA-Z] class, breaking the
// match mid-word and dropping the actual business name's first word.
function extractTitleCasePhrases(text: string): string[] {
  const stripped = text.replace(/\*\*/g, '')
  const regex = new RegExp(`\\b[A-Z][a-zA-Z'&À-ÿ]*(?:\\s+(?:${NAME_CONNECTOR_ALTERNATION})?\\s*[A-Z][a-zA-Z'&À-ÿ]*){1,3}\\b`, 'g')
  const raw = Array.from(stripped.matchAll(regex)).map(m => m[0].trim())
  return raw.map(stripLeadingStopword).filter((m): m is string => m !== null)
}

function isGenericTerm(name: string): boolean {
  return GENERIC_PLACE_TERMS.has(name.toLowerCase()) || GENERIC_NON_COMPETITOR_TERMS.has(name.toLowerCase())
}

// A bold markdown span can wrap any text, not just names - real responses
// bold descriptive phrases too ("**best cake delivery in Sydney**",
// "**same-day cake delivery in Sydney**"), which the Title-Case regex would
// never produce on its own but a bold span will. Confirmed necessary
// against a real response: without this, extraction picked up bolded
// keyword phrases alongside genuine business names. A real name's words are
// virtually all capitalised; a descriptive phrase's aren't (only an
// incidental place name inside it is) - reject anything with a
// non-capitalised, non-connector word. Same NAME_CONNECTOR_WORDS_SET as the
// Title-Case regex above, so a lowercase connector like "by" is treated the
// same way whether it came from a bold span or the regex fallback.
function looksLikeProperNounPhrase(phrase: string): boolean {
  const words = phrase.split(/\s+/).filter(Boolean)
  if (words.length === 0) return false
  return words.every(w => NAME_CONNECTOR_WORDS_SET.has(w.toLowerCase()) || /^[A-Z]/.test(w))
}

// Candidate names for one response's text, self-exclusion and generic-term
// filtering already applied - callers never see the prospect's own name
// (which the model may mention alongside real competitors) or a bare
// place/provider name that the regex fallback can pick up.
export function extractCandidateNames(text: string | null | undefined, brandName?: string | null, storeUrl?: string | null): string[] {
  if (!text) return []
  const brandLower = brandName?.trim().toLowerCase()
  const domain = storeUrl ? normaliseDomain(storeUrl) : null

  const bold = extractBoldSpans(text)
  const rawList = bold.length > 0 ? bold : extractTitleCasePhrases(text)
  // A bold span can end with punctuation still attached from its source
  // sentence ("**Best for Sydney:**") - strip trailing colon/comma/period
  // before any check runs, both so the genericness check matches cleanly
  // and so a kept candidate never displays with stray punctuation.
  const raw = rawList.map(c => c.replace(/[:.,;]+$/, '').trim()).filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []
  for (const candidate of raw) {
    const key = candidate.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!key || seen.has(key) || isGenericTerm(key)) continue
    if (!looksLikeProperNounPhrase(candidate)) continue
    if (isAllGenericWords(candidate)) continue
    if (brandLower && (key === brandLower || key.includes(brandLower) || brandLower.includes(key))) continue
    if (domain && key.replace(/[^a-z]/g, '').length > 3 && domain.includes(key.replace(/[^a-z]/g, ''))) continue
    seen.add(key)
    out.push(candidate)
  }
  return out
}

export interface CompetitorRankingEntry { name: string; count: number }

// One entry per distinct name, count = how many of the (up to 3) providers'
// responses named it at least once - not total mention occurrences within a
// single response.
export function extractCompetitorRanking(
  results: Array<{ response_text?: string | null; error?: string | null }>,
  brandName?: string | null,
  storeUrl?: string | null
): CompetitorRankingEntry[] {
  const counts = new Map<string, CompetitorRankingEntry>()
  for (const r of results) {
    if (!r.response_text || r.error) continue
    for (const name of extractCandidateNames(r.response_text, brandName, storeUrl)) {
      const key = name.toLowerCase().replace(/\s+/g, ' ')
      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { name, count: 1 })
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}

// Deterministic one-line card summary from the same per-response extraction
// used for the ranking panel - no separate AI call, no free-form paraphrase.
export function buildResponseSummary(candidateNames: string[], found: boolean): string {
  const top = candidateNames.slice(0, 2)
  if (found) {
    return top.length > 0 ? `Named you alongside ${top.join(' & ')}.` : 'Named you directly.'
  }
  if (top.length === 0) return 'Did not name a specific business.'
  if (top.length === 1) return `Recommended ${top[0]} instead.`
  return `Recommended ${top.join(' & ')} instead.`
}
