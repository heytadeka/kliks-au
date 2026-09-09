import { supabaseAdmin } from './supabase'

// Shared "spots left this month" figure shown on both audit landing page
// variants (nav pill, hero cap note, form reassurance line, final CTA).
// Pooled across variants on purpose - it's the same real capacity
// constraint (Adam personally does every audit) regardless of which page a
// visitor lands on, not a separate counter per variant.
export const GROWTH_AUDIT_MONTHLY_CAP = 14

export type GrowthAuditAvailability = {
  total: number
  remaining: number
  monthLabel: string
}

export async function getGrowthAuditAvailability(): Promise<GrowthAuditAvailability> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', timeZone: 'Australia/Melbourne' })
  const total = GROWTH_AUDIT_MONTHLY_CAP

  try {
    // application_data is only ever set by the public apply route (see
    // app/api/audit/apply/route.ts), so "not null" is what distinguishes a
    // real visitor request from a prospect created via the admin/outreach
    // pipeline - those never touch this counter.
    const { count, error } = await supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .not('application_data', 'is', null)
      .gte('created_at', monthStart)

    if (error) throw error
    const used = count ?? 0
    return { total, remaining: Math.max(0, total - used), monthLabel }
  } catch (e: any) {
    // Fail open (show full availability) rather than fail closed - a
    // transient query error should never falsely tell a real visitor
    // there are zero spots left.
    console.error('[growth-audit-cap] availability query failed, defaulting to full availability:', e?.message ?? e)
    return { total, remaining: total, monthLabel }
  }
}
