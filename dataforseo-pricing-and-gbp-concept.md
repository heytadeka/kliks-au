# DataForSEO pricing findings + Google Business build concept

Reviewed the full 330-endpoint pricing sheet, 4 Aug 2026. Reference doc, not a build spec.

---

## The headline finding

**Google Reviews is effectively free.** `business_data/google/reviews/task_post` = **$0.00075**
per request. No special plan, no minimum, same `business_data` group as the GMB lookup already in
use. This was previously assumed to need a paid tier alongside LLM Mentions, that assumption was
wrong.

At these prices the entire audit costs single-digit cents per prospect.

---

## Cheap and worth building

| Endpoint | Cost | Why it matters |
|---|---|---|
| `business_data/google/reviews/task_post` | $0.00075 | Individual review text. AI pattern-finding across them. Nobody reads their own 300 reviews. |
| `business_data/google/questions_and_answers/live` | $0.0054 | What people actually ask on GBP. Delivery zones, dietary, lead times. Unanswered questions are a strong hook. |
| `business_data/google/my_business_updates/task_post` | $0.00225 | Whether they post GBP updates. Most small bakeries don't. Visible, specific gap. |
| `keywords_data/dataforseo_trends/explore/live` | $0.0012 | Seasonal demand. Cake is intensely seasonal (Mother's Day, Christmas, Valentine's). Enables time-sensitive angles. |
| `domain_analytics/technologies/domain_technologies/live` | $0.012 | Their Shopify app/tech stack. Directly relevant to what gets pitched. |
| `content_analysis/sentiment_analysis/live` | $0.024 | Pairs with reviews data. |

## Existing backlog items, all cheap

- Relevant Pages: `dataforseo_labs/relevant_pages/live` — $0.012
- AI Overview visibility: `serp/ai_summary` — $0.01 per result
- Backlinks: `backlinks/summary/live` — $0.024

## The expensive one

**LLM Mentions: $0.10 per request** plus $0.001 per result, across every `llm_mentions/*`
endpoint. Roughly 130x everything else, this is where the $100/mo minimum came from. Park until
the cheap items are exhausted.

Note `ai_optimization/llm_responses/live` is only $0.0006, a different thing (querying a model
directly) but worth knowing it exists at that price.

---

## Build concept: local-first Google Business section

**Strategic reframe**: these prospects are local businesses that happen to have an ecommerce
store, not ecommerce stores that happen to be local. Sydney bakeries live and die on local search
and word of mouth. That argues for Google Business becoming a centrepiece section rather than
section 04, with reviews and Q&A as the substance.

**Why this is the strongest remaining feature**: everything else in the audit is something a
prospect could check themselves (PageSpeed, their own rankings). Nobody sits down and reads their
own 300 reviews looking for patterns. "Fourteen people mentioned delivery timing in the last three
months" is the kind of line that gets a reply, and it sits naturally in the founder-to-founder
register the outreach already uses.

## Build constraints, learned the hard way

1. **New routes, new columns, nothing existing modified.** GBP already has its own route for
   exactly this reason. Reviews and Q&A get their own fetches and their own columns.
2. **Do NOT add new data to the commentary readiness gate.** The poll currently waits on
   PageSpeed, crawl, and DataForSEO core. Adding a slow new dependency there would stop commentary
   firing across every audit. New data is additive to the report, never part of what generation
   waits on.
3. **Absent data hides its section, never breaks the page.** Same principle as removing the
   hardcoded 500-visitor fallback: no output beats wrong output.
4. **Phase the verification.** Fetch and store, confirm data lands. Then render. Then AI
   commentary on top. Three checkpoints, not one build.
5. **Watch rate limits and per-audit cost** once several new calls are added to the same fan-out.

## Also worth fixing while in this area

The current GBP section's right-hand copy is hardcoded template text with conditional variation,
not AI-generated (confirmed in `ReportClient.tsx`). Every store with rating ≥4.0 and ≥100 reviews
sees identical wording. It also reads oddly: states 4.5+ as the bar, then tells a 4.3 store it's
"above average." Worth replacing with real AI commentary as part of this build.

A broader sweep for other hardcoded-but-personalised-looking copy elsewhere in the report is
pending, sections 03 and the two legacy manual sections are the flagged candidates.
