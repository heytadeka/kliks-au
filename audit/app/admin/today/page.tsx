import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import TodayClient from './TodayClient'

const CLOSED = ['won', 'lost', 'not_a_fit']

// Mirrors the getCache() pattern from the Audits dashboard: PostgREST can
// return an embedded 1:1 relation as either an object or a one-item array
// depending on how it resolves the FK, so callers shouldn't have to guess.
function getOne(v: any): any {
  return Array.isArray(v) ? v[0] : v
}

// "Today" is Sydney wall-clock time regardless of server TZ. Comparing
// formatted calendar dates (rather than hand-rolling a UTC offset) lets
// Intl's timezone database handle AEST/AEDT transitions correctly.
function isSydneyToday(isoString: string | null | undefined): boolean {
  if (!isoString) return false
  const opts = { timeZone: 'Australia/Sydney' } as const
  return new Date(isoString).toLocaleDateString('en-CA', opts) === new Date().toLocaleDateString('en-CA', opts)
}

export default async function TodayPage() {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) redirect('/audit/admin')

  const { data: prospects } = await supabaseAdmin
    .from('prospects')
    .select('id, slug, brand_name, niche, created_at, audit_content(hook_headline, ai_opportunity_commentary), outreach_log(*)')
    .order('created_at', { ascending: false })

  const rows = (prospects ?? []).map(p => ({
    id: p.id,
    slug: p.slug,
    brand_name: p.brand_name,
    niche: p.niche,
    hook: getOne(p.audit_content)?.hook_headline ?? null,
    // Same field EditAuditClient/ReportClient already use to decide
    // "AI Commentary: Pending" - reused here rather than derived a second way.
    commentaryPending: !getOne(p.audit_content)?.ai_opportunity_commentary,
    outreach: getOne(p.outreach_log) ?? null,
  }))

  // Section 1: Daily-3. outreach_log is one row per prospect, updated in place
  // for follow-ups rather than getting a new row, so counting by email_sent_at
  // (set once, on first transition to email_sent) naturally excludes follow-up
  // activity without a manual reset job. created_at was the originally proposed
  // field, but it's set at audit-creation time, not at send time - see note below.
  const sentToday = rows.filter(r => isSydneyToday(r.outreach?.email_sent_at)).length

  // Section 2: ready to reach out. An outreach_log row exists for nearly every
  // prospect from the moment the audit is created (status: 'audit_created'),
  // so "no record yet" in practice means "never actually sent", not "no row".
  const readyToReachOut = rows
    .filter(r => !r.outreach || r.outreach.status === 'audit_created')
    .map(r => ({ id: r.id, slug: r.slug, brand_name: r.brand_name, niche: r.niche, hook: r.hook, commentaryPending: r.commentaryPending, outreachId: r.outreach?.id ?? null }))

  // Section 3: follow-ups due. Same filter as the Phase 1 fix to OutreachClient's
  // overdueRows, applied here to the embedded outreach_log rows.
  const todayStr = new Date().toISOString().split('T')[0]
  const followUpsDue = rows
    .map(r => r.outreach)
    .filter((o: any) => {
      if (!o) return false
      if (o.status === 'audit_created') return false
      if (!o.follow_up_due_at || CLOSED.includes(o.status)) return false
      return o.follow_up_due_at.split('T')[0] < todayStr
    })

  return <TodayClient sentToday={sentToday} readyToReachOut={readyToReachOut} followUpsDue={followUpsDue} />
}
