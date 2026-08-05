# Kliks Audit Portal — backlog, refreshed 5 Aug 2026

Supersedes the previous feature backlog. Two things changed it: the DataForSEO pricing review
(Google Reviews is effectively free, LLM Mentions is the only genuinely expensive item), and the
local-first reframe (these prospects are local businesses that happen to have a store, not the
reverse).

---

## 0. Do these first, they're not features

**Rescan the three already-sent audits.** Enze, Cake Mail, Miss Lilly's all carry the 67x-inflated
revenue figure. Those reports are live at their URLs and any of those prospects could reopen them.
One at a time, let each finish, check Today afterwards for the Pending badge.

**Send audits.** Nothing has gone out since Miss Lilly's. The report is now in genuinely sendable
shape and there are prospects sitting in Ready to reach out. Everything below is better informed
after a few real sends and any replies they produce.

---

## 1. Small, already scoped, quick

- **Hardcoded-copy sweep.** Diagnosis offered, not run. Find all copy in the report that reads as
  personalised but is fixed text with conditional variation. Sections 03 and the two legacy manual
  sections are the flagged candidates. GBP already confirmed as one.
- **Today CTA visibility.** Currently only renders in the empty state. Open question whether it
  should always show, since Today is meant to be self-sufficient for Danielle.
- **Store URL normalisation on save.** An ad click URL pasted into the field currently surfaces in
  the client-facing report.
- **`keywords_total_count` null fallback.** When it comes back null, the count falls back to a
  capped 50-item array and presents it as real. Consistent now, still not always correct.

## 2. Commentary timeout, once there's data

The readiness outcome is now persisted (`commentary_readiness_status`/`_ms`/`_at`). Once a handful
of audits have run, query it and find out whether the 50s cap is simply too short, or something
upstream is slower than assumed. Don't guess at a new number before looking.

```sql
select commentary_readiness_status, commentary_readiness_ms, commentary_readiness_at
from audit_data_cache where commentary_readiness_at is not null
order by commentary_readiness_at desc;
```

---

## 3. Google Business as centrepiece — the main build

Strategic reframe: local businesses with a store, not stores that happen to be local. Sydney
bakeries live on local search and word of mouth. GBP should be a major section, not section 04.

This is the strongest remaining feature because it's the only part of the audit a prospect
couldn't easily produce themselves. Nobody reads their own 300 reviews looking for patterns.

Build in this order, verifying each before the next:

1. **Reviews** (`business_data/google/reviews/task_post`, $0.00075) — fetch and store first,
   confirm data lands. Then render. Then AI pattern-finding on top.
2. **Q&A** (`google/questions_and_answers/live`, $0.0054) — what people actually ask. Unanswered
   questions are a strong, specific outreach hook.
3. **GBP updates** (`google/my_business_updates/task_post`, $0.00225) — most small bakeries don't
   post. Visible, concrete gap.
4. **Replace the hardcoded GBP copy** with real AI commentary as part of this. Also fix its odd
   logic: states 4.5+ as the bar, then congratulates a 4.3 store for being "above average."

**Non-negotiable constraints** (learned the hard way today):
- New routes, new columns, nothing existing modified
- Do NOT add any of this to the commentary readiness gate — a slow new dependency there would stop
  commentary firing across every audit
- Absent data hides its section, never breaks the page
- Watch per-audit cost and rate limits once several new calls join the same fan-out

## 4. Next features, roughly in order

- **Seasonal trends** (`dataforseo_trends/explore/live`, $0.0012). Bakery-specific and genuinely
  differentiated: cake demand spikes hard around Mother's Day, Christmas, Valentine's. Enables
  time-sensitive outreach angles.
- **Store tech stack** (`domain_analytics/technologies/domain_technologies/live`, $0.012). Which
  Shopify apps they run. Directly relevant to what gets pitched.
- **Relevant Pages** (`dataforseo_labs/relevant_pages/live`, $0.012). Carried over from the old
  backlog, still worthwhile.
- **Sentiment analysis** (`content_analysis/sentiment_analysis/live`, $0.024). Pairs with reviews,
  build after reviews works.
- **AI Overview visibility** (`serp/ai_summary`, $0.01/result).
- **Backlinks / Domain Rank card** (`backlinks/summary/live`, $0.024).

## 5. Parked

**LLM Mentions.** $0.10 per request across every endpoint, roughly 130x everything else. Was
higher on the old backlog partly on the assumption that reviews were also expensive. That's no
longer true, so this drops until the cheap items are exhausted.

---

## 6. Delegation to Danielle

Blocked on the audit tool being reliable, which is close now. Needs:
- Her own login via the existing Team feature, so sends are attributed to a person
- A one-pager: what makes a good hook, the subject line formula, when to escalate
- Confidence that an incomplete audit is unmissable (the Pending work covers this)

Worth doing after a few real sends, so the one-pager reflects what actually gets replies rather
than what we assume will.
