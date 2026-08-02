// Single source of truth for "how many keywords does this domain rank for" and
// "how much monthly organic traffic does that represent", resolved from a
// DataForSEO domain_rank_overview response plus the keyword list - including
// the fallback behavior for when either overview field is missing or zero.
// Used by both the live report page and the AI commentary prompt so the two
// can never independently disagree on the same number again.

export function resolveOrganicStats(
  overview: any,
  keywords: any[] | null | undefined
): { keywordCount: number; monthlyTraffic: number } {
  const kws = keywords ?? []
  const totalKeywordsCount = overview?.keywords_total_count ?? null
  const overviewCount = overview?.metrics?.organic?.count ?? 0
  const overviewEtv = overview?.metrics?.organic?.etv ?? 0

  const keywordCount = totalKeywordsCount ?? (overviewCount > 0 ? overviewCount : kws.length)
  const monthlyTraffic = overviewEtv > 0
    ? overviewEtv
    : kws.reduce((sum: number, kw: any) => sum + (kw?.keyword_data?.keyword_info?.search_volume ?? 0), 0)

  return { keywordCount, monthlyTraffic }
}
