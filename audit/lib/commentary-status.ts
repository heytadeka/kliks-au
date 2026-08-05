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
