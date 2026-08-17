import { getCommentaryReadinessState } from './commentary-status'

// The Audits table's "Audit Status" column - derived at render time from
// audit_data_cache + prospects.rescan_locked_at, same "compute, don't store"
// approach the old CRO Status column already used (see AdminDashboardClient.tsx),
// just widened to cover the whole pipeline (crawl + pagespeed + dataforseo +
// commentary) instead of only the CRO/crawl check.
export const AUDIT_STATUS_ORDER = ['not_started', 'collecting', 'ready', 'stalled'] as const
export type AuditStatus = typeof AUDIT_STATUS_ORDER[number]

export const AUDIT_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  collecting: 'Collecting',
  ready: 'Ready',
  stalled: 'Stalled',
}

export const AUDIT_STATUS_COLOR: Record<string, string> = {
  not_started: 'rgba(255,255,255,0.5)',
  collecting: '#f97316',
  ready: '#22c55e',
  stalled: '#ef4444',
}

// Stalled is intentionally NOT re-derived from scratch here - it's the exact
// same signal as the edit page's status banner (getCommentaryReadinessState
// in lib/commentary-status.ts): either the rescan lock has been held past
// the readiness poll's own max-wait window, or the poll already gave up and
// recorded status 'timeout'. Reusing it rather than writing a second
// "is this stuck" check is the whole point of this file existing separately
// from a duplicate readiness calculation.
export function getAuditStatus(
  cache: {
    crawled_at?: string | null
    pagespeed_fetched_at?: string | null
    dataforseo_overview?: unknown
    commentary_gen_invoked_at?: string | null
    commentary_readiness_status?: string | null
  } | null | undefined,
  rescanLockedAt: string | null | undefined
): AuditStatus {
  if (!cache?.crawled_at) return 'not_started'

  const readiness = getCommentaryReadinessState(cache, rescanLockedAt)
  if (readiness === 'stalled') return 'stalled'

  const allLanded = !!(cache.pagespeed_fetched_at && cache.dataforseo_overview != null && cache.commentary_gen_invoked_at)
  return allLanded ? 'ready' : 'collecting'
}
