// Single source of truth for the unified outreach stage model (2026-08-14
// migration - see supabase/schema.sql's "Unified outreach stage model" block
// and the outreach_log table definition above it). Previously this
// vocabulary was duplicated independently in TodayClient.tsx and
// OutreachClient.tsx (10-value status, not this 6-value stage) - shared here
// so Today, Outreach, and any future unified Audits view render identically
// and can't drift out of sync with each other again.

export const STAGE_ORDER = [
  'not_contacted',
  'first_email_sent',
  'second_email_sent',
  'responded',
  'won',
  'declined',
] as const

export type Stage = typeof STAGE_ORDER[number]

// Typed as Record<string, string> rather than Record<Stage, string> -
// callers read these against untyped Supabase rows (this project has no
// generated Database type, see lib/supabase.ts) and dropdown/db values that
// are plain `string`, not narrowed to Stage. Every Stage key is still
// authored here for real completeness; the looser export type just avoids
// forcing an `as Stage` cast at every read site, matching how the rest of
// this codebase already indexes these label maps.
export const STAGE_LABELS: Record<string, string> = {
  not_contacted: 'Not contacted',
  first_email_sent: '1st email sent',
  second_email_sent: '2nd email sent',
  responded: 'Responded, follow-up needed',
  won: 'Won',
  declined: 'Declined',
}

export const STAGE_BG: Record<string, string> = {
  not_contacted: 'rgba(255,255,255,0.05)',
  first_email_sent: 'rgba(99,102,241,0.15)',
  second_email_sent: 'rgba(239,68,68,0.1)',
  responded: 'rgba(59,130,246,0.15)',
  won: 'rgba(34,197,94,0.3)',
  declined: 'rgba(239,68,68,0.15)',
}

export const STAGE_COLOR: Record<string, string> = {
  not_contacted: 'rgba(255,255,255,0.5)',
  first_email_sent: '#818cf8',
  second_email_sent: '#f87171',
  responded: '#60a5fa',
  won: '#4ade80',
  declined: '#ef4444',
}

// Terminal stages - no further outreach action expected, follow-up dates get
// cleared on entry (see autoFollowUpForStage).
export const CLOSED_STAGES: Stage[] = ['won', 'declined']

export const DECLINED_REASONS = ['said_no', 'not_a_fit'] as const
export type DeclinedReason = typeof DECLINED_REASONS[number]

export const DECLINED_REASON_LABELS: Record<string, string> = {
  said_no: 'Said no',
  not_a_fit: 'Not a fit',
}

export const toInputDate = (d: Date) => d.toISOString().split('T')[0]
export const addDays = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toInputDate(d)
}

// Mirrors the old per-status autoFollowUp() 1:1, minus the 'opened' branch -
// opened is no longer a stage a prospect occupies (see isViewed below), so
// there's nothing left to map it from. Takes plain string, same reasoning
// as the label maps above - callers pass dropdown/db values, not Stage.
export function autoFollowUpForStage(stage: string): string | null | undefined {
  if (stage === 'first_email_sent') return addDays(3)
  if (stage === 'second_email_sent') return addDays(4)
  if (stage === 'responded' || (CLOSED_STAGES as string[]).includes(stage)) return null
  return undefined // not_contacted - don't change
}

// The "Viewed" badge: independent of stage by design (locked decision, see
// gate/route.ts) - a prospect can view their report at any stage, including
// before "Mark Sent" was ever clicked (report links can reach someone
// outside the tracked send flow). Never infer stage from this.
export function isViewed(outreach: { open_count?: number | null } | null | undefined): boolean {
  return (outreach?.open_count ?? 0) > 0
}
