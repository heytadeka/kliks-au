// Whether an audit's AI-generated commentary is complete enough for the
// admin UI and report to treat it as done. These four fields are the ones
// whose absence either gates a whole report section (opportunity) or falls
// back to fixed generic copy (hook, score descriptions, closing). The other
// AI fields - ai_performance_commentary, ai_cro_commentary, ai_seo_commentary,
// ai_priority_list - already degrade honestly when missing (render nothing,
// or an explicit "not yet generated" state), so they're deliberately not
// part of this check. Shared by Today, EditAuditClient, and ReportClient's
// Data Confidence table rather than each deriving it separately.
export function isCommentaryPending(content: {
  ai_opportunity_commentary?: string | null
  hook_headline?: unknown
  score_descriptions?: unknown
  ai_closing_commentary?: string | null
} | null | undefined): boolean {
  if (!content) return true
  return !(
    content.ai_opportunity_commentary &&
    content.hook_headline &&
    content.score_descriptions &&
    content.ai_closing_commentary
  )
}

// How long dataforseo-enrichment's readiness poll waits for pagespeed/crawl/
// dataforseo-core to all land before giving up (see that route's
// waitForCommentaryData). Vercel Hobby caps a single function invocation at
// 60s hard - this leaves ~8s margin inside that ceiling for the poll's final
// query plus recordReadinessOutcome's write, which is as much margin as a
// single invocation can safely give without risking getting killed mid-write.
// It will NOT catch a slow external call beyond this (a real ~57s Cloud Run
// PageSpeed call has reproduced and would still slip past it) - that's what
// the admin UI's stalled state + retry button are for, not this cap alone.
// Shared with the admin UI so its "scan stalled" threshold can't drift out
// of sync with the poll's own cap - see getCommentaryReadinessState below.
export const COMMENTARY_READY_MAX_WAIT_MS = 52_000

// The exact readiness condition dataforseo-enrichment's poll checks for -
// shared so the admin UI's manual retry action (retry-commentary/route.ts)
// checks the identical condition instead of a second, possibly-drifting copy.
export function isDataReadyForCommentary<T extends {
  pagespeed_fetched_at?: string | null
  crawled_at?: string | null
  dataforseo_overview?: unknown
}>(cache: T | null | undefined): cache is T & { pagespeed_fetched_at: string; crawled_at: string } {
  return !!(cache?.pagespeed_fetched_at && cache?.crawled_at && cache?.dataforseo_overview != null)
}

// Derives what the admin edit page should show about the current rescan
// cycle, from data already available on the page (audit_data_cache +
// prospects.rescan_locked_at) rather than a live poll of its own:
//
// - 'updated': generate-commentary's own last invocation happened at or
//   after the current pagespeed_fetched_at - i.e. the commentary on screen
//   actually reflects this rescan's data, not a stale prior one.
// - 'scanning': rescan_locked_at is held and still within the readiness
//   poll's own max-wait window - a scan is genuinely in flight.
// - 'stalled': either the lock has been held past that window (the poll
//   likely crashed without recording an outcome), or the poll already gave
//   up and wrote status 'timeout' (lock already cleared by that handler -
//   see dataforseo-enrichment/route.ts). Either way commentary was never
//   fired for the current data and won't be without a manual retry.
// - 'idle': no active or recently-failed cycle to report - fall back to the
//   older isCommentaryPending check for "has this prospect ever had
//   commentary generated at all".
export function getCommentaryReadinessState(
  cache: {
    pagespeed_fetched_at?: string | null
    commentary_gen_invoked_at?: string | null
    commentary_readiness_status?: string | null
  } | null | undefined,
  rescanLockedAt: string | null | undefined
): 'updated' | 'scanning' | 'stalled' | 'idle' {
  const pagespeedAt = cache?.pagespeed_fetched_at ? Date.parse(cache.pagespeed_fetched_at) : null
  const genAt = cache?.commentary_gen_invoked_at ? Date.parse(cache.commentary_gen_invoked_at) : null
  if (genAt !== null && pagespeedAt !== null && genAt >= pagespeedAt) return 'updated'

  const lockAt = rescanLockedAt ? Date.parse(rescanLockedAt) : null
  if (lockAt !== null) {
    return Date.now() - lockAt > COMMENTARY_READY_MAX_WAIT_MS ? 'stalled' : 'scanning'
  }
  if (cache?.commentary_readiness_status === 'timeout') return 'stalled'
  return 'idle'
}
