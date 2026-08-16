import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isCommentaryPending } from '@/lib/commentary-status'
import { CLOSED_STAGES, isViewed } from '@/lib/outreach-stage'
import TodayClient from './TodayClient'

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
    .select('id, slug, brand_name, niche, created_at')
    .order('created_at', { ascending: false })

  const prospectIds = (prospects ?? []).map(p => p.id)

  // Direct, separate queries rather than embedding audit_content/outreach_log
  // through the prospects relation. This used to embed both (same shape as
  // the Audits dashboard's audit_data_cache embed), with a getOne() helper to
  // normalise PostgREST's object-vs-array ambiguity - but a fresh audit
  // (Humble Sydney) showed Pending on Today with fully populated commentary,
  // while EditAuditClient's direct query for the same prospect_id read it
  // correctly. Shape-handling didn't fix it, so rather than chase the exact
  // embed mechanism further, match the pattern already proven correct
  // everywhere else this data is read (report page, EditAuditClient): fetch
  // each table separately, keyed by prospect_id. One extra query per table
  // instead of per prospect, via .in() rather than embedding.
  const [{ data: contentRows }, { data: outreachRows }] = await Promise.all([
    supabaseAdmin
      .from('audit_content')
      .select('prospect_id, hook_headline, ai_opportunity_commentary, score_descriptions, ai_closing_commentary')
      .in('prospect_id', prospectIds),
    supabaseAdmin
      .from('outreach_log')
      .select('*')
      .in('prospect_id', prospectIds),
  ])

  const contentByProspect = new Map((contentRows ?? []).map(c => [c.prospect_id, c]))
  const outreachByProspect = new Map((outreachRows ?? []).map(o => [o.prospect_id, o]))

  const rows = (prospects ?? []).map(p => ({
    id: p.id,
    slug: p.slug,
    brand_name: p.brand_name,
    niche: p.niche,
    hook: contentByProspect.get(p.id)?.hook_headline ?? null,
    // Shared with EditAuditClient/ReportClient via isCommentaryPending()
    // rather than each deriving "is this audit done" a different way.
    commentaryPending: isCommentaryPending(contentByProspect.get(p.id)),
    outreach: outreachByProspect.get(p.id) ?? null,
  }))

  // Section 1: Daily-3. outreach_log is one row per prospect, updated in place
  // for follow-ups rather than getting a new row, so counting by email_sent_at
  // (set once, on first transition to email_sent) naturally excludes follow-up
  // activity without a manual reset job. created_at was the originally proposed
  // field, but it's set at audit-creation time, not at send time - see note below.
  const sentToday = rows.filter(r => isSydneyToday(r.outreach?.email_sent_at)).length

  // Section 2: ready to reach out. An outreach_log row exists for nearly every
  // prospect from the moment the audit is created (stage: 'not_contacted'),
  // so "no record yet" in practice means "never actually sent", not "no row".
  // isViewed() overrides stage here - a real-data pull showed several
  // not_contacted rows (email_sent_at never set) with real opens already
  // recorded, since the Viewed badge is independent of stage by design (see
  // lib/outreach-stage.ts) and Mark Sent doesn't always get clicked even
  // when the link genuinely went out and was viewed. Without this override
  // this list was recommending outreach to prospects who'd already seen their
  // report, sometimes several times over.
  const readyToReachOut = rows
    .filter(r => !r.outreach || (r.outreach.stage === 'not_contacted' && !isViewed(r.outreach)))
    .map(r => ({ id: r.id, slug: r.slug, brand_name: r.brand_name, niche: r.niche, hook: r.hook, commentaryPending: r.commentaryPending, outreachId: r.outreach?.id ?? null }))

  // Section 3: follow-ups due. Same filter as the Phase 1 fix to OutreachClient's
  // overdueRows, applied here to the fetched outreach_log rows.
  const todayStr = new Date().toISOString().split('T')[0]
  const followUpsDue = rows
    .map(r => r.outreach)
    .filter((o: any) => {
      if (!o) return false
      if (o.stage === 'not_contacted') return false
      if (!o.follow_up_due_at || CLOSED_STAGES.includes(o.stage)) return false
      return o.follow_up_due_at.split('T')[0] < todayStr
    })

  return <TodayClient sentToday={sentToday} readyToReachOut={readyToReachOut} followUpsDue={followUpsDue} />
}
