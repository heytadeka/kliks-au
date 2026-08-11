// Single source of truth for the Relevant Pages section's headline finding:
// what share of a domain's organic visibility is concentrated in its single
// top page, computed from real DataForSEO relevant_pages/live data (raw
// per-page items, not a pre-baked stat column - same "compute derived
// numbers in one shared place" pattern as resolveOrganicStats(), so this
// can't independently drift from whatever the render layer shows).
//
// Scope note: the underlying fetch caps at 100 pages (dataforseo-core's own
// comment explains why), sorted by ETV descending. The percentage below is
// genuinely computed from real returned numbers - it's just scoped to "the
// top 100 pages DataForSEO returned for this domain," not a literal,
// unbounded "every page that ever earned a single visitor." For the small
// to medium business sites this app audits, a domain with more than 100
// organically-visible pages is uncommon, and any pages beyond that cap
// would (being lower-ETV than everything already included) move the
// computed share by less than the ones already counted - not a fabricated
// number, just a disclosed bound on it.

export interface RelevantPage {
  url: string
  etv: number
  keywordCount: number
}

export interface RelevantPagesConcentration {
  totalEtv: number
  totalKeywordCount: number
  topPage: RelevantPage & { sharePct: number }
  pages: RelevantPage[]
}

export function resolveRelevantPagesConcentration(
  rawPages: any[] | null | undefined
): RelevantPagesConcentration | null {
  if (!rawPages || rawPages.length === 0) return null

  const pages: RelevantPage[] = rawPages
    .map((p: any) => ({
      url: p?.page_address ?? null,
      etv: p?.metrics?.organic?.etv ?? 0,
      keywordCount: p?.metrics?.organic?.count ?? 0,
    }))
    .filter((p): p is RelevantPage => !!p.url)
    .sort((a, b) => b.etv - a.etv)

  if (pages.length === 0) return null

  const totalEtv = pages.reduce((sum, p) => sum + p.etv, 0)
  // No real traffic signal to compute a concentration share from - a page
  // list with zero combined ETV isn't "100% concentrated," it's just data
  // the section shouldn't render a stat from at all.
  if (totalEtv <= 0) return null

  const top = pages[0]
  const totalKeywordCount = pages.reduce((sum, p) => sum + p.keywordCount, 0)
  return {
    totalEtv,
    totalKeywordCount,
    topPage: { ...top, sharePct: (top.etv / totalEtv) * 100 },
    pages,
  }
}

// A root-path URL ("https://example.com.au/" or "https://example.com.au")
// reads better as "your homepage" than as a bare path in the headline copy -
// every other page gets its actual path shown instead.
export function isHomepageUrl(url: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/, '')
  return path === '' || path === '/'
}
