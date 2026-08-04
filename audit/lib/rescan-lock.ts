// Shared rescan-lock helpers. rescan/route.ts owns the original inline
// version of this logic and is left as-is (working, recently shipped,
// out of scope to touch right now) - this is for new call sites, starting
// with regenerate-commentary/route.ts, so a third copy doesn't get hand-
// written independently and drift from the other two.

import { supabaseAdmin } from './supabase'

// How long a lock is honoured before being treated as stale and taken over.
// Matches rescan/route.ts's own constant - generously longer than the
// pipeline's realistic worst case, so a genuinely still-running scan is
// never pre-empted, but a lock orphaned by a crashed invocation can't block
// a prospect forever.
export const RESCAN_LOCK_TIMEOUT_MS = 120_000

export type LockCheckResult =
  | { locked: false }
  | { locked: true; secondsAgo: number }

// Read-only: checks whether prospect_id currently has a non-stale lock.
// Callers decide what to do about it (block, surface an error, etc.) and are
// responsible for calling setRescanLock/clearRescanLock around their own work.
export async function checkRescanLock(prospect_id: string): Promise<LockCheckResult> {
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('rescan_locked_at')
    .eq('id', prospect_id)
    .single()

  if (!prospect?.rescan_locked_at) return { locked: false }

  const lockedAgoMs = Date.now() - new Date(prospect.rescan_locked_at).getTime()
  if (lockedAgoMs >= RESCAN_LOCK_TIMEOUT_MS) return { locked: false }

  return { locked: true, secondsAgo: Math.max(1, Math.round(lockedAgoMs / 1000)) }
}

export async function setRescanLock(prospect_id: string): Promise<void> {
  await supabaseAdmin
    .from('prospects')
    .update({ rescan_locked_at: new Date().toISOString() })
    .eq('id', prospect_id)
}

export async function clearRescanLock(prospect_id: string): Promise<void> {
  try {
    await supabaseAdmin.from('prospects').update({ rescan_locked_at: null }).eq('id', prospect_id)
  } catch (e: any) {
    console.error('[rescan-lock] failed to clear lock (non-fatal):', e.message)
  }
}
