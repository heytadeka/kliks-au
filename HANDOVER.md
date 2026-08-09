# Kliks.com.au — Thread Handover Doc

> Keep this file updated as the project evolves. It is the single source of truth for new sessions.

---

## State as of 2026-08-09

- **Everything committed is pushed and live on `origin/main`.** No local-only commits outstanding. The Google Business bundle is now fully shipped end to end: Phase 1 (diagnosis), Phase 2 (fetch/store), Phase 3 (render reviews/Q&A/updates in the report), and Phase 4 (AI commentary on reviews + honest rating framing, hardcoded copy fully removed) are all built and pushed. Full commit list in §7, full architecture detail in §4.
- **One thing genuinely unverified right now: whether Phase 4's schema migration (`ai_gmb_commentary` text → jsonb) has actually been run.** Unlike every other migration this bundle needed, there's no confirmation on record that this one was applied, or that a real `generate-gmb-commentary` run has been checked against production. Don't assume it works end to end until that's confirmed — see §6 item 2.
- **There is currently an uncommitted, temporary diagnostic route sitting in the working tree**: `audit/app/api/diag-ai-visibility-temp/route.ts`. Built to fire live `ai_optimization/llm_responses` and `serp/google/organic` (AI Overview) calls for a pure-discovery task, deployed to preview, never committed on purpose. Delete it once that diagnostic is done being used — see §6 item 1. If you're reading this and don't know what it is, it's safe to delete; nothing else depends on it.
- **Recurring bug shape found and fixed twice: PostgREST embedded relations reading 1:1 data are unreliable.** First seen in the original "Crawls Complete: 0" bug (predates both recent sessions, patched at the time with a shape-normalising `getCache()` helper). Resurfaced as a false-positive Pending badge on Today — same shape, same helper pattern, still broke. Both Today and the Audits dashboard are now on a direct bulk-query pattern instead; a sweep found no more embedded relations left anywhere in the app. Don't reintroduce the pattern — see §8.
- **`NEXT_PUBLIC_SITE_URL` is hardcoded to production and used for every background job's internal fetch, regardless of which deployment is actually running.** This means a preview deployment can never exercise its own new background-job routes — only routes already shipped to production. Confirmed as the reason a fresh Google Business Phase 2 test on preview silently wrote nothing. Not yet fixed — see §6.
- **Vercel CLI deploys intermittently fail with a bare `"Not authorized"` before any upload progress shows.** Happened three separate times this pass, on a CLI session that had already deployed successfully many times before and after. `vercel whoami` confirmed auth was never actually broken - a plain retry succeeded every single time, no re-login or other fix needed. Don't spend time diagnosing this one, just retry once. See §8.
- **`npx tsc --noEmit` passing is not proof `next build` will succeed.** A real `prefer-const` ESLint error shipped past a clean `tsc --noEmit` check this pass and only surfaced as a failed Vercel deploy. `npm run build` locally (the full build, not just the type check) is now the standard pre-deploy check on this project - see §8.
- Test prospects still worth knowing about: **flo-viennoiserie** (genuine Google bot-protection 403 on its CRO crawl, confirmed externally — not a code bug, good prospect to check the CRO-failure UI against), **bakealicious-by-gabriela** (the Google Business bundle's test case throughout — real reviews at depth 100, Q&A, and GBP updates all confirmed landing on production for Phase 2; also the source of the real data shapes Phase 3 was built against and the review sample Phase 4's guardrails were checked against), **cake-in-a-box** (abandoned and left deleted after a pre-lock concurrent-rescan corrupted its data — cheaper to delete than untangle, don't recreate it as a lookalike name).

---

## 1. What This Project Is

**kliks.com.au** is the website for Kliks Digital — Adam Nagy's paid ads + Shopify growth agency (AU-based, also operates in Hungary). A **KLIKS Patisserie** sub-brand landing funnel (bakery/patisserie vertical) was added as a separate static page set — see §3.

The repo contains two things:

| Thing | What it is | Where |
|---|---|---|
| Static marketing site | Plain HTML/CSS/JS | `index.html` + supporting `.html` files in root |
| Audit portal | Next.js 14 App Router app | `/audit/` subdirectory |

They are deployed together via Vercel. The static site serves at `/`, the Next.js app serves at `/audit/`.

---

## 2. Repo & Deployment

**GitHub:** `heytadeka/kliks-au`
**Local path:** `/Users/Pongi/Desktop/kliks.com.au`
**Live URL:** `https://kliks.com.au`
**Vercel project:** `kliks-au` under personal account `adam.nagy.mm@gmail.com` (account `adamnagymm-3717`). Auto-deploys on push to `main`, ~30-60s to live.

### Normal deploy (preferred)
```bash
git add <files>
git commit -m "message"
git push origin main
# Vercel picks it up automatically
```

### Manual override (if git deploy is too slow or broken)
```bash
# ALWAYS from repo root /Users/Pongi/Desktop/kliks.com.au — NEVER from inside audit/
vercel --prod
```

### CRITICAL: stale project file in audit/
`audit/.vercel/project.json` points to a stale separate Vercel project called "audit". Running `vercel` from inside `audit/` deploys to the wrong project. Never cd into audit/ to deploy. Never run `vercel env pull` from inside audit/.

### CRITICAL: vercel.json rules (DO NOT TOUCH)
Order of routes is load-bearing. These rules must stay exactly as-is:

1. `/api/(.*)` → `/audit/api/$1` — must be first
2. www redirect (301)
3. `/lukewood` + `/oh-my-days` → `/` (302, temporary)
4. `/audit/(.*)` → `/$1` — must be before `handle: filesystem`
5. `handle: filesystem`
6. `/([^/.]+)$` → `/$1.html`

Also: `assetPrefix: '/audit'` in `next.config.js` must be unconditional (not gated on `process.env.VERCEL`). `vercel.json` also has a `crons` block (traffic-drop monitoring for the Pipeline tab — see §4) — leave it alone unless you're deliberately changing that schedule.

### Deploy gotcha: stdout buffering
`npx vercel --prod` stdout buffers heavily. The terminal looks frozen after "Building..." but the deploy may have already finished. Use `vercel inspect <deployment-url>` to check real status, or watch for the task completion notification. Do not kill a running deploy process.

### Deploy previews
`npx vercel` (no `--prod`) from repo root gives a preview URL without touching production — this is the normal way to visually check a rendering change before it's pushed to `main`. Confirm the target is the `kliks-au` project before running it. **Cannot verify new background-job routes** — see the `NEXT_PUBLIC_SITE_URL` gotcha in §8.

---

## 3. Static Marketing Site

### Files
- `index.html` — main homepage
- `ad-junkies.html` — Ad Junkies newsletter page (subscriber count JS: base 1445 on 2026-05-26, grows 4-6/day)
- `book.html` — Booking form page (single-step, Web3Forms backend, no Calendly redirect, redirects to `thanks-booking.html` on success)
- `thanks-booking.html` — thank-you page for the strategy-call booking form
- `booked.html` — Legacy confirmation page (no longer used, superseded by `thanks-booking.html`)
- `patisserie.html` — KLIKS Patisserie sub-brand landing page (growth-audit funnel for the bakery/patisserie vertical), Web3Forms + GA4 + Meta Lead tracking
- `thanks-patisserie.html` — thank-you page for the Patisserie funnel
- `patisserie/` — design handoff reference for the Patisserie page (`Patisserie Landing.dc.html` mockup + `README.md` + `image-slot.js` helper). Not served — reference only. Same convention as the Stage Rivers design handoff used for the audit portal's Outreach board (a `.dc.html` mockup + `README.md` dropped in a feature-named folder before build).
- `privacy.html` — privacy policy
- `luke-index.html` / `luke-apply.html` / `luke-results.html` — Luke funnel (separate design: Bebas Neue + DM Sans, lime green `#c8f040` accent)

### Design system (main site)
- **Background:** `#0e0d1a` (deep dark purple)
- **Background 2:** `#1a1828`
- **Purple:** `#644bff`
- **Orange / CTA:** `#ff4315` (hover: `#c42f08`)
- **Border:** `rgba(100,75,255,0.12)`
- **Headings:** Clash Display (Fontshare) — weights 400/500/600/700/800
- **Body:** Satoshi (Fontshare) — weights 400/500/700
- **Labels / mono elements:** Space Mono (Google Fonts) — weights 400/700
- **Cards:** glass style — `rgba(255,255,255,0.03)` bg, `rgba(255,255,255,0.07)` border, 20px radius, `40px 36px` padding, no shadow, no left-stripe. Hover: `border-color rgba(100,75,255,0.2)`, `translateY(-6px)`
- **Buttons:** `#ff4315`, pill shape (`border-radius: 100px`)
- **Grain + vignette:** `position: fixed` (full-page, persistent on scroll)

### Copy rules (always enforce)
- No em dashes (--). Use hyphens (-) or commas.
- No bullet points in body copy. Prose only.
- Direct, calm tone. No fluff. Founder-to-founder voice.
- Australian spelling where relevant.

### index.html form (Web3Forms)
Both `index.html` and `book.html` use identical field sets: split first/last name, email, phone (optional), store URL (optional), ad spend dropdown, challenge textarea. Both submit via `fetch()` POST to Web3Forms JSON API, then fire Klaviyo non-blocking. `book.html` redirects to `thanks-booking.html` on success; check `index.html`'s current behaviour before assuming it matches (it may still use the inline success card rather than a redirect).

### book.html availability slots
Month slots auto-compute from `new Date()`. Current month = 0 spots (Fully booked). Next month = random 1-2 spots. Pattern matches index.html.

### Key IDs / constants
- Facebook Pixel ID: `1875112903440305`
- Web3Forms key: `8d31ed39-c2e7-429c-b4ad-fa37a5ff26e5` (routes to `wearekliks@gmail.com`)
- Klaviyo company ID: `QNNHsN`
- Klaviyo form ID: `VaHVst` (embed: `<div class="klaviyo-form-VaHVst"></div>`)
- Calendly URL: `https://calendly.com/kliks-hu/30min` (placeholder — AU version still needed)

---

## 4. Audit Portal

### What it does
Adam creates an audit record for a prospect (slug, brand, store URL, niche, email, optional location and Google Business ID). Background jobs run data collection. Adam emails the prospect a link. Prospect enters their email at `/audit/[slug]` → auth cookie → sees their full audit report at `/audit/[slug]/report`.

### User flow
1. Adam logs in at `/audit/admin` → lands on `/audit/admin/today` (the Today tab, default post-login landing page)
2. Adam creates a prospect via `/audit/admin/new` (or the dashboard/Outreach board's own create/attach affordances, or Pipeline's own create form) → `POST /api/audit/admin/create` fires background jobs via `waitUntil`
3. Jobs run in parallel: PageSpeed (Cloud Run AU), CRO crawl (plain `fetch()` + HTML checks, not a headless browser — see "CRO crawl" below), DataForSEO, Google Ads Planner, Meta Ads, GMB lookup, GMB Q&A, GMB reviews/updates (async, see "Google Business expansion" below)
4. `dataforseo-enrichment` polls every 3s (up to 50s) waiting for PageSpeed + crawl + DataForSEO-core to land, then fires `generate-commentary` — **only if all three showed up in time**. If the poll times out, commentary is skipped on purpose rather than run against holes, and the prospect surfaces as **Pending** on the Today tab. Google Business data (reviews/Q&A/updates) is never part of this gate, on purpose — see below.
5. Adam cold-emails prospect: "Your report is ready at kliks.com.au/audit/[slug]"
6. Prospect enters email → httpOnly cookie set → redirected to `/audit/[slug]/report`
7. Adam gets Web3Forms notification on first open

### Key paths
| Path | What |
|---|---|
| `/audit/admin` | Admin login |
| `/audit/admin/today` | **Default post-login landing.** Daily-3 follow-ups (by `email_sent_at`, Sydney-local "today"), "Ready to reach out" (status `audit_created` or no outreach row yet — includes a Pending-commentary badge, see below), overdue follow-ups. Has its own "+ New Audit" CTA in the empty "Ready to reach out" state, linking to `/audit/admin/new`. |
| `/audit/admin/dashboard` | Admin dashboard (list prospects, rescan, reset views) — "Audits" in nav |
| `/audit/admin/outreach` | **Stage Rivers** pipeline board — 4 lanes (`to_contact`, `contacted`, `engaged`, `closed`), each prospect a beeswarm-stacked dot positioned by days-since-last-touch. Click a dot for a detail modal. Also has its own "Create new audit" / "Attach to existing audit" toggle (still using `track-existing`, independent of `/admin/new`). |
| `/audit/admin/pipeline` | Domain-discovery + traffic-drop monitoring tool, backed by `monitored_domains` (not `prospects`) — see below |
| `/audit/admin/new` | Dedicated full-page "create new audit" form |
| `/audit/admin/team` | Admin user list + add-user form (`admin_users`) |
| `/audit/admin/[slug]/edit` | Edit an existing audit's content; shows AI commentary status and (if the CRO crawl failed) the real failure reason |
| `/audit/[slug]` | Email gate page |
| `/audit/[slug]/report` | Full report (auth-gated) |
| `/api/audit/admin/auth` | Login (sets `audit_admin_auth` cookie) |
| `/api/audit/admin/create` | Creates prospect record + fires all jobs. Also marks the matching `monitored_domains` row converted if one exists, for any creation path — not just Pipeline's own form. |
| `/api/audit/admin/rescan` | Re-runs all data jobs for existing prospect — checks/sets `rescan_locked_at` first |
| `/api/audit/admin/regenerate-commentary` | Recovery path for a Pending prospect: fires `generate-commentary` directly (no re-fetch) if the underlying data is actually present, otherwise returns a clear "run a full rescan instead" error. Same lock as rescan. |
| `/api/audit/admin/prospect` | PATCH endpoint: update prospect fields (used by reset views: `access_count: 0, last_accessed_at: null`) |
| `/api/audit/admin/update` | PATCH `outreach_log` (status, notes, follow-up date, deal value, lost reason) — powers Stage Rivers' detail modal |
| `/api/audit/admin/track-existing` | POST: inserts `outreach_log` row for an existing prospect without re-running data jobs |
| `/api/audit/admin/team` | Admin user list/create |
| `/api/audit/dataforseo-core` | SERP, keywords, competitors, gaps |
| `/api/audit/dataforseo-enrichment` | Polls for readiness, then triggers `generate-commentary` (or skips it and records why) |
| `/api/audit/dataforseo-gmb` | GMB lookup (own route, 30s timeout, 60s budget). Resolves and stores `place_id` regardless of whether the admin-supplied Google Business ID field was filled in — see "Google Business expansion" below. |
| `/api/audit/dataforseo-gmb-qa` | Google Q&A, synchronous, same shape as the GMB lookup |
| `/api/audit/dataforseo-gmb-tasks` | Fires the async reviews + GBP-updates `task_post` calls once the GMB lookup resolves a `place_id` |
| `/api/audit/dataforseo-gmb-reviews-webhook` | Receives DataForSEO's reviews postback |
| `/api/audit/dataforseo-gmb-updates-webhook` | Receives DataForSEO's GBP-updates postback |
| `/api/audit/generate-commentary` | Two Anthropic API calls → 5 commentary sections + priority list. Whole handler wrapped in try/finally that clears `rescan_locked_at` on any exit. |
| `/api/audit/pagespeed` | Proxies to Cloud Run AU for PageSpeed |
| `/api/audit/crawl` | CRO checklist — plain `fetch()` of the homepage (+ first product page) with a spoofed desktop Chrome user-agent, checked against ~20 regex/substring signals. No headless browser, no JS execution. |
| `/api/audit/gate` | Validates email → sets auth cookie |
| `/api/pipeline/discover` | DataForSEO SERP search for a query → platform-detects each result domain → upserts qualifying (Shopify/Squarespace) domains into `monitored_domains` |
| `/api/pipeline/check-traffic` | Bulk traffic estimation for all active `monitored_domains`, flags a >15% drop, emails Adam via Web3Forms. Wired to a Vercel cron in `vercel.json`. |
| `/api/pipeline/mark-converted` | Marks a monitored domain as converted once an audit is created for it. Still called directly by Pipeline's own create flow too — redundant with the server-side version in `admin/create`, but harmless (an update against zero matching rows is a no-op either way). |

### Background job architecture
- Uses `waitUntil` from `@vercel/functions` — do NOT use plain fire-and-forget (Vercel kills it on response)
- All data routes: `maxDuration = 60`, `preferredRegion = 'syd1'`
- GMB is a dedicated route (extracted from enrichment) because it needs 5-21s
- **Every job is fired via `${NEXT_PUBLIC_SITE_URL}/api/...`, a fixed production URL — not "wherever this code is currently running."** See the gotcha in §8 before adding a new background route and testing it on a preview.

**Readiness poll.** `dataforseo-enrichment/route.ts` has:
```typescript
const READY_POLL_INTERVAL_MS = 3_000
const READY_MAX_WAIT_MS = 50_000
```
`waitForCommentaryData(prospect_id)` polls `audit_data_cache` (`pagespeed_fetched_at`, `crawled_at`, `dataforseo_overview`) every 3s up to 50s. If all three show up, it records `commentary_readiness_status: 'ready'` (+ elapsed ms) on `audit_data_cache` and `generate-commentary` fires. If the cap is hit first, it records `'timeout'` instead, explicitly clears `rescan_locked_at` (since `generate-commentary` — the thing that normally clears it — never runs on this path), and commentary is **not** fired. Better to visibly skip than to silently generate against holes. **Confirmed via the persisted data**: all instrumented runs so far (9 total) resolved `ready`, worst case 38s. No confirmed timeout yet — worth re-querying once more audits have run before concluding the cap is right-sized either way.

**Rescan lock.** `prospects.rescan_locked_at` (timestamptz) prevents two rescans (or a rescan and a regenerate) from interleaving their writes on the same prospect. Checked/set in `rescan/route.ts` inline, with a 120s staleness fallback (`RESCAN_LOCK_TIMEOUT_MS`) so a crashed invocation can't orphan a prospect forever. Cleared by `generate-commentary/route.ts`'s try/finally on every exit path, or explicitly on a readiness timeout (above). `lib/rescan-lock.ts` (`checkRescanLock` / `setRescanLock` / `clearRescanLock`) is the same logic extracted for new call sites — used by `regenerate-commentary/route.ts`. `rescan/route.ts` and `generate-commentary/route.ts` keep their own working inline copies. **Note: the lock prevents new overlapping runs, it does not retroactively fix data already corrupted by a pre-lock race** — `cake-in-a-box` was abandoned rather than untangled for exactly this reason.

**Pending commentary — visible and recoverable, widened this pass.** `lib/commentary-status.ts` exports `isCommentaryPending(content)`, checking four fields: `ai_opportunity_commentary`, `hook_headline`, `score_descriptions`, `ai_closing_commentary`. Previously this only checked `ai_opportunity_commentary` alone, independently re-derived in three places (Today, `EditAuditClient`, `ReportClient`'s Data Confidence row) — widened and unified into one shared helper after those other three fields turned out to have disguised-fallback risk (see below) with no Pending signal at all. The other AI fields (`ai_performance_commentary`, `ai_cro_commentary`, `ai_seo_commentary`, `ai_priority_list`) are deliberately **not** part of this check — they already degrade honestly (render nothing, or an explicit "not yet generated" state) when missing, so including them would only cause extra false-positive Pending flags. Used by:
1. `/audit/admin/today`'s "Ready to reach out" section — Pending badge/warning + "Regenerate Commentary" button.
2. `EditAuditClient`'s status banner.
3. `ReportClient`'s Data Confidence table "AI Commentary" row.

**Disguised-fallback fixes.** Three spots previously showed polished, brand-name-bearing text whenever the corresponding AI field was missing, with nothing signalling it wasn't written for that prospect — the report could look complete and personally written while actually being generic:
- The closing note under Adam's signature ("I put this together because I think {brand} is leaving real money on the table...") is now omitted entirely when both `ai_closing_commentary` and the legacy `section_closing_body` are absent, rather than showing invented personal text.
- The hero headline/subtext fallback no longer interpolates the store's domain into a sentence that implied bespoke analysis ("We ran {domain} through every signal...") — now genuinely generic when `hook_headline` is missing.
- `SCORE_DESC_FALLBACKS` (six hardcoded one-liners, one per score card) is removed entirely. These didn't check the actual score value, so e.g. "Slow on phones" could render next to a GOOD-badged ring. `ScoreRing` already conditionally rendered its description (`{desc && <p>...}}`), so a missing `score_descriptions` value now just omits that line.

**Unfounded-claims fixes.** Separately, two spots stated a specific-sounding number as if it were measured when it was actually a hardcoded constant: the CRO section's "Stores like {competitor} typically pass 17-18 of these checks" (competitor CRO scores are never actually measured anywhere in this app — reworded to a general benchmark, no longer naming the competitor) and the SEO section's "Closing even 20% of that gap is worth targeting" (the 20% was arbitrary — reworded to drop the fabricated figure). A third candidate, the "industry leaders load in under 2.5s" LCP benchmark clause, was reviewed and left alone — it's Google's real published Core Web Vitals threshold, already used the same way elsewhere on the same report.

### CRO crawl (crawl/route.ts)
Despite older documentation implying Puppeteer, this is a plain `fetch()` of the homepage (and first product page, if a `/products/` link is found) with a spoofed desktop Chrome user-agent, checked against ~20 regex/substring signals (sticky header, exit intent, reviews widget, etc.) — no headless browser, no JS execution. `puppeteer-core` and `@sparticuz/chromium` were still sitting in `package.json` from before this rewrite, unreferenced anywhere in `app/` — removed this pass.

`cro_checklist.error = true` can only come from the **homepage** fetch itself failing — a non-2xx response (most commonly bot protection), the 15s timeout firing, or a network failure. The product-page fetch has its own silently-swallowed `catch {}`, so its failure alone can't produce this state. A JS-heavy storefront doesn't cause this error state either — with no JS execution, it just produces a low/mostly-failed checklist (empty static HTML), not a thrown exception.

`cro_checklist.message` holds the real reason (e.g. `"Fetch failed: 403"`) and is now surfaced on the Dashboard's CRO Status column and the Edit page — previously captured but shown nowhere, which is why a real, external bot-protection block (confirmed on `flo-viennoiserie` by testing the URL directly, outside the app) took three rescans and a full diagnosis to explain instead of five seconds. The report's CRO section is now **hidden entirely** when the crawl failed (`cro?.error`), rather than showing "Automated CRO scan could not complete for this store. Manual review recommended." to the prospect — on a cold outreach report, that read as the tool getting blocked by the prospect's own site, which undermines the report rather than informing it. The ordinary "still scanning" state (no results yet, no error) is unaffected and keeps its own shell. Section numbering (`sectionNums`) skips CRO on failure too, same conditional pattern as GMB/strategy/opportunity, so numbers after it don't jump.

### AI model
Model is centralised in `audit/lib/config.ts`:
```typescript
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5'
```
Both call sites in `generate-commentary/route.ts` import `ANTHROPIC_MODEL`. If Anthropic retires a model, update only `lib/config.ts`. The previous model `claude-sonnet-4-20250514` was retired and caused 404s — that's why it's now centralised.

### Google Business expansion (all four phases shipped)
Strategic direction: these prospects are local businesses that happen to have a store, not the reverse — Sydney bakeries live on local search and word of mouth. Reviews especially are the one part of the audit a prospect couldn't easily produce themselves (nobody reads their own 300 reviews looking for patterns).

**Identifier resolution.** `buildGmbKeyword()` (in `lib/gmb-keyword.ts`, extracted from the GMB route) builds a `keyword`/`cid`/`place_id` parameter from the prospect's optional "Google Business ID" form field (`gmb_cid` — accepts a raw Place ID, a raw CID, or is left blank to fall back to brand-name search). The GMB lookup route (`dataforseo-gmb`) resolves and stores its own `place_id` in `gmb_data.place_id` regardless of which path found the match — this is reused by reviews/updates rather than each resolving independently, because a generic local-business name can match a *different* business per independent search, and reviews/updates need to describe the same business the GMB card describes. If GMB comes back not-found (or hasn't landed within a short wait window), reviews/updates are skipped entirely rather than falling back to their own brand-name match — no reviews beats someone else's reviews.

**Q&A** (`dataforseo-gmb-qa`) is synchronous (`questions_and_answers/live`), fires in the same fan-out as everything else, own timeout/budget, not gated on readiness. Resolves its own identifier independently (doesn't wait on GMB) since a Q&A mismatch is low-stakes compared to reviews.

**Reviews and GBP updates** (`dataforseo-gmb-tasks`) are async — DataForSEO's `task_post` endpoints take up to 45 minutes at standard priority, or about a minute at high priority (paid extra, exact multiplier over base rate not confirmed). Both are fired at **high priority**, a deliberate choice: the workflow is create-review-send, and a report sitting visibly incomplete for up to 45 minutes with no way to distinguish "still coming" from "failed" would break that. Both calls carry a `postback_url` — DataForSEO POSTs the actual result (gzip-compressed) to that URL whenever the task completes, so this route fires and returns without waiting on results. `lib/dataforseo-postback.ts` decompresses defensively (tries gzip, falls back to plain parse) since this is the one part of the integration that can't be confirmed without a live postback actually landing. Reviews are fetched at depth 100, sorted newest-first.

**Webhooks** (`dataforseo-gmb-reviews-webhook`, `dataforseo-gmb-updates-webhook`) verify a purpose-built `DATAFORSEO_WEBHOOK_SECRET` (query-string param, not the Supabase service role key — DataForSEO's postback auth has no signature scheme beyond IP allowlisting, so a dedicated low-privilege secret limits the blast radius of a leak to fake review data, not DB access) and respond fast, within DataForSEO's 10s postback deadline.

**None of this joins the commentary readiness gate.** Deliberate, carried through the whole build — the gate still only waits on PageSpeed, crawl, and DataForSEO core.

**Phase 2 verified end to end on production**: `bakealicious-by-gabriela` — real reviews (100 returned), Q&A, and GBP updates all landed correctly. (Preview deployments cannot verify this feature at all — see the `NEXT_PUBLIC_SITE_URL` gotcha in §8; a real postback also has to reach a real public URL, which a Vercel-protected preview URL structurally can't be.)

**Phase 3 (render in the report) — shipped.** Three new subsections render below the existing GBP profile card (`ReportClient.tsx`, still nested inside `gmbData.found`):
- **Recent reviews** — header stat (average rating + total count, sourced from `gmbData.rating`/`gmbData.review_count`, i.e. Google's own aggregate from the Phase 1 lookup, deliberately *not* `gmb_reviews.length` which is just the fetch-depth cap of 100). Top 3 by `timestamp`, no rating filtering shown as-is. Review text truncated in JS (`truncateReviewText()`, ~150 chars, trims back to the last full word before appending `…`) rather than relying on CSS `-webkit-line-clamp` alone — confirmed on real data that line-clamp cuts mid-word, since it truncates by pixel/line boundary, not word boundary. Line-clamp stays on as a secondary safety net for narrower viewports.
- **Common questions** — up to 5 answered Q&A pairs by `timestamp`, unanswered questions filtered out entirely.
- **Recent activity** — up to 3 GBP posts by `timestamp`, image shown only when `images_url` is present.
- All three hide entirely (no placeholder) when their underlying status/array says there's nothing to show — same principle as everywhere else. Confirmed the real DataForSEO response shapes for all three against `bakealicious-by-gabriela` before writing any render logic (reviews: `rating.value`, `time_ago`, `timestamp`, `review_text`, `owner_answer`, `profile_name`, `profile_image_url`; Q&A: `question_text`, `timestamp`, `items[].answer_text`/`timestamp`; updates: `post_text`, `post_date`, `timestamp`, `images_url`, `links`).

**Phase 4 (AI commentary on reviews, honest rating framing) — shipped. Not yet confirmed working end to end — see the migration note in the State-as-of banner above and §6 item 2.**
- Triggered by the **reviews** webhook specifically (not Q&A, which arrives earlier and synchronously) — by the time that webhook fires, Q&A is already sitting in `audit_data_cache` ready to read into the same prompt. `generate-gmb-commentary/route.ts` is a separate, additive Anthropic call (`ai_gmb_commentary` on `audit_content`), decoupled from the main commentary call — same precedent as the existing main + priority-list two-call pattern in `generate-commentary/route.ts`. Sample size: 25 most recent reviews (`REVIEW_SAMPLE_SIZE`), rating + text only.
- **Two-layer guardrail against surfacing a specific review or reviewer.** Input layer: `profile_name`, `profile_image_url`, and `owner_answer` are stripped before the prompt is ever built - the model structurally never sees them. Output layer (`lib/gmb-commentary-guardrails.ts`): after generation, both output fields (`rating_framing`, `review_patterns`) are scanned for an 8+ consecutive word run matching any source review verbatim, and for any reviewer name leaking through anyway. One regeneration on failure; whichever field still fails after that is suppressed (stored `null`), never retried indefinitely or stored risky. Verified the guardrail functions actually catch a deliberately bad case (a sentence restating a review, a sentence naming a reviewer) before wiring them into the real route - this was a real, necessary check, not just plausible-looking logic. Real-data confirmation this was needed at all: the `bakealicious-by-gabriela` review set contained a live public dispute (a detailed delivery-mixup complaint with a long owner rebuttal).
- **Schema**: `ai_gmb_commentary` had to move from `text` (how it was declared in the Phase 2 migration) to `jsonb`, since this phase stores two fields (`rating_framing`, `review_patterns`) as one object. New migration block in `supabase/schema.sql` - **not confirmed run**, see §6.
- Replaced the hardcoded GBP copy at `ReportClient.tsx`'s Google Business section entirely, not just conditionally overridden - confirmed via grep that none of the old strings remain anywhere in the file. That copy (confirmed hardcoded template text, not AI-generated - every store with rating ≥4.0 and ≥100 reviews saw identical wording) also had a self-contradicting logic bug: stated 4.5+ as the bar, then called a 4.3 rating "above average" in the same breath. `rating_framing` renders only when generated (the profile-stats grid collapses to one column when it's absent, so there's no empty box); the raw rating number and review count are not AI-dependent and always render regardless. `review_patterns` renders as an intro line above Recent Reviews, same hide-when-null rule.
- `ai_gmb_commentary` does **not** join `isCommentaryPending` — same reasoning as the other AdamsTake-style commentary fields: it should degrade honestly (section doesn't render) rather than needing a disguised-fallback guard.

### Supabase schema

**`prospects`**
- `slug` (UNIQUE), `brand_name`, `store_url`, `prospect_email`, `prospect_name`, `niche`, `cta_link`, `created_at`, `last_accessed_at`, `access_count`, `is_active`, `rescan_locked_at` (timestamptz, nullable — confirmed migrated), `location`, `gmb_cid` — **the latter two are live in the DB and used by the app but are not tracked anywhere in `supabase/schema.sql`**, same gap as `monitored_domains` below. Confirmed still missing this pass; worth adding alongside it.

**`audit_content`**
- `prospect_id` FK, legacy section fields, `ai_performance_commentary`, `ai_cro_commentary`, `ai_seo_commentary`, `ai_opportunity_commentary`, `ai_closing_commentary`, `ai_priority_list` JSONB, `hook_headline` JSONB, `score_descriptions` JSONB, `ai_gmb_commentary` JSONB (`{ rating_framing, review_patterns }` — declared `text` in the Phase 2 migration, changed to `jsonb` in a later migration block once Phase 4 needed two fields — **schema change not confirmed run**, see §6)

**`audit_data_cache`**
- `prospect_id` FK (UNIQUE), `pagespeed_mobile`, `pagespeed_desktop`, `dataforseo_overview` JSONB (includes `keywords_total_count` — see "DataForSEO notes"), `dataforseo_keywords`, `dataforseo_gaps`, `dataforseo_competitors`, `dataforseo_serp_features` JSONB, `dataforseo_content_gap` JSONB, `dataforseo_keyword_trends` JSONB, `backlinks_summary` JSONB (always null — no subscription), `google_ads_planner`, `meta_ads`, `cro_checklist`, `gmb_data` JSONB (**also live but untracked in schema.sql**, see above), `crawled_at`, `pagespeed_fetched_at`, `commentary_readiness_status` / `_ms` / `_at` (text/integer/timestamptz — **confirmed applied**, no longer a no-op), and added this pass: `gmb_reviews` / `gmb_reviews_status` / `gmb_reviews_task_id` / `gmb_reviews_fetched_at`, `gmb_qa` / `gmb_qa_fetched_at`, `gmb_updates` / `gmb_updates_status` / `gmb_updates_task_id` / `gmb_updates_fetched_at` — **confirmed applied**

**`admin_users`**
- `email`, `password_hash` (bcrypt 12 rounds), `name`, `created_at`, `is_active`. Managed via `/audit/admin/team`.

**`outreach_log`**
- `id`, `prospect_id` FK, `status` (`audit_created` / `email_sent` / `opened` / `no_response` / `won` / `lost` / `not_a_fit` — collapsed into the Stage Rivers board's 4 lanes via `STATUS_TO_LANE` in `OutreachClient.tsx`), `domain`, `brand_name`, `prospect_name`, `prospect_email`, `audit_slug`, `notes`, `follow_up_due_at`, `deal_value` (set on `won`), `lost_reason` (set on `lost`), `created_at`, `updated_at`, `email_sent_at` (set once, on first transition to `email_sent`), `first_opened_at`, `last_opened_at`, `open_count`

**`monitored_domains`** (backs the Pipeline tab — **still not tracked in `supabase/schema.sql` at all**; it exists in the live DB but was created out-of-band, so a fresh environment would need it hand-created from this column list)
- `id`, `domain`, `platform` (`shopify` / `squarespace` / `unknown`), `platform_detected_at`, `niche` (the discovery query that found it), `status` (`active` / `converted`), `created_at`, `traffic_current`, `traffic_previous`, `traffic_checked_at`, `traffic_drop_pct`, `flagged` (bool), `flagged_at`, `audit_created` (bool), `audit_slug`, `audit_brand_name`

Test record: slug=`test-brand`, email=`wearekliks@gmail.com`

### supabase/schema.sql — migration blocks
The base `create table` statements only cover the original columns. Everything added since lives in comment-blocked `ALTER TABLE` sections lower in the file, applied by hand in the Supabase SQL editor (standing convention: hand over exact SQL, never attempt to run it directly). In order:
1. AI commentary columns (`ai_performance_commentary` etc.) — long since applied.
2. `prospects.rescan_locked_at` — confirmed applied.
3. `audit_data_cache.commentary_readiness_status` / `_ms` / `_at` — confirmed applied.
4. Google Business Phase 2 columns (`gmb_reviews*`, `gmb_qa*`, `gmb_updates*` on `audit_data_cache`, `ai_gmb_commentary` on `audit_content` as `text`) — confirmed applied.
5. Google Business Phase 4: `ALTER COLUMN ai_gmb_commentary TYPE jsonb` — **drafted, not confirmed applied.** This is the one outstanding migration as of this writing. `ai_gmb_commentary` was never written to by any code before this block existed, so this is a safe type change with no data to convert whenever it does get run.

Still not in this file's history at all: `monitored_domains`, and `prospects.location` / `prospects.gmb_cid` / `audit_data_cache.gmb_data` (all three live in the DB, used throughout the app, discovered missing from schema.sql while building the Google Business bundle this pass). Worth a single cleanup pass adding `create table if not exists` / `ADD COLUMN IF NOT EXISTS` blocks for all of these, so a fresh DB setup doesn't silently miss them.

### AI commentary (generate-commentary/route.ts)
- Call 1: 5-section commentary → performance, CRO, SEO, opportunity, closing
- Call 2: priority list → `{ priorities: [{ number, title, impact, next_step }] }` (non-fatal if fails)
- Hook headline: generated from worst score, top non-branded keyword, CRO failures — must be store-specific, never generic. Anti-convergence rules in prompt prevent identical hooks across stores.
- Organic keyword count and monthly traffic figures used in the prompt come from `lib/organic-stats.ts`'s `resolveOrganicStats()` — the same function the report page uses (see below). Do not hand-roll a second calculation here.
- Prompt explicitly labels which figures are visitor counts vs dollar figures, and instructs the model not to dollar-sign a traffic count in `seo_findings` — added after a real report showed a visitor count with a `$` in front of it.

### Shared organic-stats resolver (lib/organic-stats.ts)
```typescript
export function resolveOrganicStats(overview: any, keywords: any[] | null | undefined): { keywordCount: number; monthlyTraffic: number }
```
Single source of truth for keyword count (`keywords_total_count` → `metrics.organic.count` → array length) and monthly traffic (`metrics.organic.etv` → sum of keyword search volumes). Used by both `ReportClient.tsx` and `generate-commentary/route.ts`. Built after a report showed contradicting organic-traffic numbers between the stat card and the AI commentary — two independently-written formulas had silently diverged. If you need organic keyword/traffic numbers anywhere else, call this function; don't recompute — this exact "recomputed in more than one place" shape is the single most recurring bug type across both recent sessions (this resolver, the revenue formula below, and GMB competitor self-exclusion were all instances of it).

### Revenue model (ReportClient.tsx)
Module-level constants, shared by every place revenue impact is shown:
```typescript
const ASSUMED_CONVERSION_RATE = 0.015
const ASSUMED_AOV = 150
```
`revCalc`'s three initiatives and the inline "What this costs you" box both compute `traffic × CR × AOV × 12` from these. They used to be two independently-hand-written copies that had drifted **~67x apart** — one was missing the `× 0.015` conversion-rate factor entirely, treating AOV as revenue-per-visitor rather than revenue-per-order. Confirmed by hand-working the arithmetic: the inflation factor was exactly `1/0.015`, matching the missing term precisely. Revenue figures are only shown when real DataForSEO overview data (`dfsOverview`) is present — no hardcoded traffic fallback. If `dfsOverview` is null, those UI elements are skipped entirely rather than showing a number computed from an invented baseline (a prior version defaulted to 500 visitors in three separate call sites, producing an identical headline figure across genuinely different stores — also removed).

**Already-sent audits carrying the old inflated figure**: Enze, Cake Mail, and Miss Lilly's were flagged for a rescan to correct this. Not confirmed whether that rescan actually happened — check before assuming it's resolved, this is the most urgent item in §6.

### DataForSEO notes
- `domain_overview/live` returns 404 on this plan — use `domain_rank_overview/live`
- `keyword_gap/live` returns 404 — use `keywords_for_site/live`
- `backlinks/summary/live` returns 40204 — separate subscription required, disabled
- AU location code: `2036` (national), city codes: Sydney `21167`, Melbourne `21182`, Brisbane `21139`, Perth `21188`, Adelaide `21136`, Canberra `21124`, Hobart `21172`, Darwin `21128`
- **Local city detection** (`detectLocalTarget()` in `dataforseo-core/route.ts`): checks the prospect's `location` field first, falls back to scanning the free-text `niche` field for a city name if `location` is empty or doesn't match. Previously `location` was read into a `locationCode` that was computed, logged, and never actually used anywhere — competitor discovery depended entirely on `niche` happening to contain a city name, silently going national otherwise. Confirmed on a real prospect: `niche` had no "Sydney" in it, top competitor came back as an unrelated `.com`. Fixed this pass; confirmed working afterward on a different prospect with no city in its niche text, which correctly returned local `.com.au` competitors via the primary discovery path.
- Content gap: no `filters` param (causes 40501 error)
- The `serp_competitors` API (primary competitor-discovery path) sets `avg_position`/`visibility`/`intersections` per competitor. Its fallback path (niche-search, triggered when fewer than 3 clean competitors come back) only ever sets `{ domain, niche_source: true }`. `ReportClient.tsx`'s competitor table hides each of those columns independently if no competitor in the top 5 has that field, rather than showing empty cells.
- Competitor domain normalisation (`normalise()` in `dataforseo-core/route.ts`) strips protocol, `www.`, and everything after the first `/`, `?`, or `#` before comparing against the audited domain — strengthened to catch a store listing itself as its own competitor when the store URL had a trailing path or query string.
- `ranked_keywords` has an explicit `limit: 50`. `total_count` (merged into `dataforseo_overview.keywords_total_count`) is the only source of the true count. **Parked, unresolved**: comes back null intermittently — confirmed happening on some prospects and not others (one got a real 1,950, others got the capped-50 fallback presented as a real count) — root cause not investigated.
- `maxDuration = 60` on the dataforseo route, longer than the readiness poll's 50s cap (intentional headroom). PageSpeed's own allowance (55s) is close enough to the poll's cap that a slow PageSpeed run is the most likely way a prospect ends up Pending — not yet investigated further given zero confirmed timeouts so far (see readiness-poll note above).
- **Endpoint audit (discovery pass, no code changes)**: grepped every DataForSEO call site in the codebase — 12 unique endpoints called from 6 files. `business_data/google/*` (My Business Info live, Reviews `task_post`, Q&A live, Updates `task_post`) confirmed as exactly 4 endpoints, no 5th in use anywhere. Backlinks, On-Page, and AI Optimization products confirmed entirely absent from the codebase — never called. `pagespeed/route.ts` calls Google's own PageSpeed Insights API directly, not DataForSEO's `on_page`/lighthouse endpoints, despite living under `/api/audit/`. `keyword-planner/route.ts` also lives under `/api/audit/` but calls the Google Ads API directly (`google-ads-api` package, `customer.keywordPlanIdeas.generateKeywordIdeas`) — not DataForSEO at all. Naming trap: DataForSEO Labs' `serp_competitors` (the primary competitor-discovery path used by `dataforseo-core/route.ts`, see above) is a different product from `competitors_domain`, which this codebase does not use.
- **AI Overview / LLM-visibility mechanics (documentation-researched; live verification still pending)**: `ai_optimization/llm_responses` has no unified endpoint — it's per-provider (`chat_gpt`, `claude`, `gemini`, `perplexity`), each with its own `.../models` (GET) and `.../live` (POST) under `ai_optimization/{provider}/llm_responses/`. Google's native AI Overview (with real citation data under `ai_overview`/`ai_overview_element.references`) comes back inline within `serp/google/organic/live/advanced` automatically whenever Google decides to show one for that query — it is not a separate call. `serp/ai_summary` is a wholly different, unrelated DataForSEO product: their own LLM synthesis of SERP snippets, requiring a prior organic task id, not Google's AI Overview and not derived from it. A temporary, deliberately uncommitted diagnostic route (`app/api/diag-ai-visibility-temp/route.ts`, deployed to preview) exercises all of this live against `bakealicious-by-gabriela` to confirm the real shapes before any feature design starts — **Adam has not yet pasted back the JSON output; delete the route once he has.**

### Organic Keywords count (dataforseo-core fix)
The `ranked_keywords/live` endpoint returns `total_count` (real domain total) and `items` (capped at `limit`, default 50). Fixed by reading `total_count` and merging it as `keywords_total_count` into `dataforseo_overview` before upsert. Only prospects rescanned after this fix landed have it populated — older audits fall back through `resolveOrganicStats()`'s chain.

### Referring Domains card (ReportClient.tsx)
Conditionally rendered. If `backlinks_summary` is null or empty, the card is omitted entirely and the grid becomes 3-column. Will auto-reappear once a DataForSEO backlinks subscription is added and `backlinks_summary` starts populating — no code change needed then.

### PageSpeed architecture
Vercel US servers are blocked by AU-hosted Shopify stores. Solution: Cloud Run microservice in `australia-southeast1`.
- Cloud Run URL: `https://pagespeed-service-981518713562.australia-southeast1.run.app`
- Flow: `/api/audit/pagespeed` (Vercel syd1) → Cloud Run → PSI API (mobile + desktop, 55s timeout, all 4 categories) → `savePagespeedData()` in `lib/pagespeed.ts` writes `pagespeed_fetched_at` and the score data in one atomic upsert.
- Must pass all 4 categories: `category=performance&category=seo&category=accessibility&category=best-practices`
- `app/api/audit/pagespeed-save/route.ts` exists but is dead code — not called from anywhere in the app.

### Report scorecards (ReportClient.tsx)
Mobile Performance, Desktop Performance, SEO Score, and Accessibility all display `null` (renders as `--`) only when the underlying value is genuinely absent — not when it's a real `0`. Now `X != null ? Math.round(X) : null` (was previously `X != null && X > 0 ? ... : null`, which silently mapped a real zero score to `--`).

### Report sections (render order in ReportClient.tsx)
1. Intro card (brand, date, niche, confidential)
2. Audit Scores strip (Mobile Perf, Desktop Perf, SEO Score, Accessibility, CRO Score /20, Overall CRO grade)
3. CRO Score Summary (passed/20, critical issues, warnings, opportunities)
4. Section — Core Web Vitals (LCP, FCP, CLS, TBT, Speed Index, TTI) + speed/money callout + AI commentary
5. Section — CRO Checklist (20-point crawl, grouped) + AI commentary — **hidden entirely if the crawl failed**, see "CRO crawl" above
6. Section — Google Business (rating, review count, category, address, claimed status) + AI-generated rating framing, plus Recent reviews / Common questions / Recent activity subsections — all four phases shipped, see "Google Business expansion" above
7. Section — Ads and Creative (Meta Ad Library)
8. Section — Ad Strategy (legacy manual, hidden if empty)
9. Section — SEO Audit (DataForSEO: stats, keywords, Winning/Close/Money buckets, competitor gap, competitors table, content gap, Google Ads Planner) + AI commentary
10. Priority Actions (3 AI cards: title, impact, next step)
11. Section — Search Opportunity (legacy manual, hidden if empty)
12. Section — Biggest Opportunity (AI orange glow card)
13. Section — Revenue Opportunity Summary (auto-calculated bars — see "Revenue model" above for the gating rule)
14. Section — Data Confidence Summary (appendix)
15. Section — What Happens Next (AI closing + book a call CTA — omitted if no closing text, see "Disguised-fallback fixes" above)

Section numbers (`sectionNums`) are computed to skip any conditionally-hidden section, so the visible numbering never has a gap.

### Keyword buckets (computed in ReportClient.tsx)
- **Winning:** pos 1-5, volume >= 100, no /blog/ URLs, sort pos asc, cap 15
- **Close:** pos 6-15, volume >= 100, no /blog/ URLs, sort volume desc, cap 10
- **Money (gap):** `dfsGaps` if available, else `dfsContentGap`, top 10 by volume

### Admin — Today tab (`/audit/admin/today`)
Default landing page after login. Fetches `audit_content` and `outreach_log` via direct bulk queries keyed on `prospect_id` (not embedded through `prospects`, see §8). Three sections:
1. **Daily-3** — up to 3 follow-ups due today, computed from `email_sent_at` (not `created_at`) against Sydney-local "today" (`isSydneyToday()`, Intl-based, DST-safe).
2. **Ready to reach out** — prospects with `outreach_log.status === 'audit_created'` or no outreach row at all yet. Each card shows a Pending badge/warning + "Regenerate Commentary" button when `isCommentaryPending()` is true (see above). Empty-state has a "+ New Audit" CTA to `/audit/admin/new`.
3. **Overdue follow-ups** — reuses the dashboard's existing overdue filter.

### Admin — Stage Rivers board (`/audit/admin/outreach`)
4 lanes (`to_contact`, `contacted`, `engaged`, `closed`), driven by `STATUS_TO_LANE` mapping every real `outreach_log.status` value onto one of the four. Within a non-closed lane, each prospect is a dot positioned on an x-axis by days-since-last-touch, y-stacked via a beeswarm layout (`layoutBeeswarm()`) so same-day touches fan out instead of overlapping. Click a dot for a detail modal. Still has its own "Create new audit" / "Attach to existing audit" toggle, independent of the dedicated `/admin/new` page.

### Admin — Pipeline tab (`/audit/admin/pipeline`)
Prospect *discovery* and churn monitoring, backed by `monitored_domains`, not `prospects`. `/api/pipeline/discover` runs a DataForSEO SERP search, platform-detects each result domain, upserts qualifying (Shopify/Squarespace) domains as `active`. A Vercel cron hits `/api/pipeline/check-traffic` on a schedule, bulk-estimates traffic for every active domain, flags a >15% drop, emails Adam. `/api/pipeline/mark-converted` flips a domain to `converted` once an audit is created for it — this now also happens server-side from `admin/create/route.ts` directly, so any creation path marks it, not just Pipeline's own form.

### Admin — Team tab (`/audit/admin/team`)
Lists `admin_users`, lets Adam add a new admin login. Backed by `/api/audit/admin/team`.

### Admin auth
- `audit_admin_auth` httpOnly cookie gates all admin routes, set by `/api/audit/admin/auth`
- Admin login is live and working — the `admin_users` table has at least one active row with a bcrypt hash.

### Env vars (set in Vercel project settings)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          (marked Sensitive — unreadable via CLI)
PAGESPEED_API_KEY
NEXT_PUBLIC_PAGESPEED_API_KEY
DATAFORSEO_LOGIN
DATAFORSEO_PASSWORD
DATAFORSEO_WEBHOOK_SECRET          (added this pass — Google Business reviews/updates postback auth, Preview + Production)
GOOGLE_ADS_DEVELOPER_TOKEN
GOOGLE_ADS_CLIENT_ID
GOOGLE_ADS_CLIENT_SECRET
GOOGLE_ADS_REFRESH_TOKEN
GOOGLE_ADS_CUSTOMER_ID
META_ACCESS_TOKEN
ANTHROPIC_API_KEY
NEXT_PUBLIC_SITE_URL=https://kliks.com.au
ADMIN_JWT_SECRET
PAGESPEED_SERVICE_URL
```
`SUPABASE_SERVICE_ROLE_KEY` is marked Sensitive in Vercel — pulling env vars via CLI returns it empty. Use Vercel dashboard to read it if needed. **Standing rule: never attempt to work around this or pull the key another way.**

---

## 5. Current Prospects

Not independently re-verified — treat as approximate and check the admin dashboard (`/audit/admin/dashboard`) for the live list rather than trusting this table blindly.

| Slug | Brand | Notes |
|---|---|---|
| `enze` | Enze | Cake shop. Carried the ~67x-inflated revenue figure; flagged for a rescan, not confirmed done — see §6 item 1. |
| `oh-my-days` | Oh My Days | Vegan cakes, Sydney-local |
| `miss-lillys` (approx) | Miss Lilly's | Also flagged for the revenue-figure rescan, see §6 item 1 |
| `cake-mail` (approx) | Cake Mail | Also flagged for the revenue-figure rescan, see §6 item 1 |
| `flo-viennoiserie` (approx) | Flo Viennoiserie | Genuine Google bot-protection 403 on its CRO crawl, confirmed externally — good prospect to check the CRO-failure UI against, not a bug to chase further |
| `bakealicious-by-gabriela` (approx) | Bakealicious by Gabriela | Google Business Phase 2 end-to-end test case — reviews, Q&A, updates all confirmed landing on production |
| — | Little Cake Box | Used for an earlier data-error diagnosis, still live |
| — | Cake In a Box | **Deleted.** Corrupted by a pre-rescan-lock concurrent-rescan race, abandoned rather than untangled. Don't recreate a similarly-named prospect assuming it's the same one. |
| — | Cupcake Factory | Real audit created via a path that skipped `mark-converted` at the time — now fixed for all paths, but this specific prospect's `monitored_domains` row may still show un-actioned unless manually corrected or re-triggered |
| `test-brand` | Test | Dev testing, email: wearekliks@gmail.com |

---

## 6. Pending Tasks

### Priority order (as of this pass)
1. **Confirm whether Enze, Cake Mail, and Miss Lilly's were actually rescanned** to correct the ~67x revenue-formula error. If not, this is the most urgent remaining item — those reports are live at their URLs and any of those prospects could reopen them.
2. **Confirm the Phase 4 `ai_gmb_commentary` jsonb migration has actually been run** (`ALTER COLUMN ai_gmb_commentary TYPE jsonb USING ai_gmb_commentary::jsonb`, handed to Adam, not confirmed applied) and verify `generate-gmb-commentary` produces real output end-to-end against production data — without this the GBP rating-framing section will silently stay empty (no output beats wrong output, so it won't error, just never render).
3. **Get Adam's pasted-back JSON output from the AI-visibility diagnostic route** (`https://kliks-q1rzgp5zr-adams-projects-fc0efc7d.vercel.app/api/diag-ai-visibility-temp`), write up the clean findings report he asked for (raw shapes only, no feature design), then **delete `app/api/diag-ai-visibility-temp/route.ts`** — it's deliberately uncommitted and must never land in git.
4. **Fix `NEXT_PUBLIC_SITE_URL` for background jobs** before it causes the same "nothing fired, no error anywhere" confusion on the next new route. Proposed shape: use `VERCEL_URL` (Vercel's own automatically-provided current-deployment URL) for internal job-to-job calls, but keep `postback_url` (anything an external service like DataForSEO needs to reach) pointed at production regardless — an external service can't reach a protected preview URL no matter what this env var says.
5. **Re-query `commentary_readiness_status`/`_ms`/`_at`** once more audits have run — zero timeouts confirmed so far, worth checking again before concluding the 50s cap doesn't need raising.
6. Add `create table if not exists` / `ADD COLUMN IF NOT EXISTS` blocks to `supabase/schema.sql` for everything confirmed live-but-untracked this pass: `monitored_domains`, `prospects.location`, `prospects.gmb_cid`, `audit_data_cache.gmb_data`.
7. `keywords_total_count` null root cause — confirmed intermittent (some prospects get a real count, others the capped-50 fallback), not yet root-caused.
8. Store URL normalization on save — a pasted ad-click URL currently surfaces as-is in a client-facing report rather than being cleaned to a bare domain.
9. Re-check whether the DataForSEO `40501 Invalid Field: location_code` error and `dataforseo-enrichment`'s own ~60s Vercel timeout warning still recur — both flagged early on, neither addressed, both may be stale given how much has changed since.
10. Danielle's onboarding — blocked on the above being solid; revisit once the Phase 4 migration is confirmed and a few more real audits have been sent.
11. Decide whether to add a root-level `CLAUDE.md` so a fresh thread can orient itself without a full HANDOVER.md read — discussed this pass (pointing it at this file plus a short "read this first" map), not yet built, waiting on Adam to confirm he wants it.

### Infrastructure
- [ ] Add `PAGESPEED_SERVICE_URL` as proper Vercel env var (hardcoded fallback works but is untidy)

### Copy / URLs
- [ ] AU Calendly URL — replace `https://calendly.com/kliks-hu/30min` in `book.html` and `ad-junkies.html`

### When DataForSEO backlinks subscription is added
- [ ] Re-enable `backlinks/summary/live` calls in dataforseo routes
- [ ] Add Domain Rank card back to Audit Scores strip
- [ ] Add ref. domains column to competitors table
- [ ] Referring Domains card in SEO stats will auto-appear (code already handles it)

### Longer-term
- [ ] Adam GIF re-hosting — profile GIF at Shopify CDN will break when account closes
- [ ] Re-enable `/lukewood` and `/oh-my-days` routes in `vercel.json` (currently redirect to `/`)
- [ ] Historical keyword trends — check if `dataforseo_keyword_trends` populates after rescans (plan tier may not support it)
- [ ] `puppeteer-core`/`@sparticuz/chromium` — already removed this pass, listed here as done for continuity with the prior version of this doc

### GEO / AI-search visibility (separate workstream, not started)
Kliks doesn't currently appear in any Shopify/digital-marketing-agency roundup an LLM would cite for "recommend an agency in Sydney" (Clutch, GoodFirms, Sortlist, DesignRush, Mayple all list competitors instead), and "Kliks Digital" collides with unrelated same-named agencies in Madrid and the Netherlands. Blog content doesn't move this metric — it's a third-party-citation problem, not a crawl problem.
- [ ] Create/claim Kliks profiles on Clutch, GoodFirms, Sortlist, DesignRush (Sydney/Shopify categories)
- [ ] Collect real client reviews on those profiles + Google Business Profile
- [ ] Add LocalBusiness/ProfessionalService schema to the kliks.com.au homepage (currently only the blog has structured data)
- [ ] Get 1-2 genuine third-party mentions (guest post, podcast, partner case study)
- [ ] Consistently pair "Kliks Digital" with "Shopify" + "Australia"/"Sydney" + "Adam Nagy" in external mentions to disambiguate from the Madrid/Netherlands agencies

---

## 7. Recent Commits

All confirmed live on `origin/main`, most recent first. Verified against `git log` directly rather than carried forward from memory.

**This pass:**

| Hash | Message |
|---|---|
| `a906a00` | fix(audit): let to const in generate-gmb-commentary (prefer-const) |
| `cd7d5c5` | feat(report): Google Business Phase 4 - AI commentary on reviews, honest rating framing |
| `f795d21` | fix(report): truncate GBP review text on a word boundary, not mid-word |
| `6b8f4e1` | feat(report): Google Business Phase 3 - render reviews, Q&A, updates |

**Previous pass:**

| Hash | Message |
|---|---|
| `e99ad59` | fix(audit): log Supabase write errors in dataforseo-gmb-tasks |
| `2ffdd80` | feat(audit): Google Business Phase 2 - fetch and store reviews, Q&A, updates |
| `eedfe56` | fix(admin): stop Audits dashboard reading audit_data_cache as an embed |
| `d567095` | fix(report): reword two claims that read as measured, aren't |
| `ffe581b` | chore: remove unused puppeteer-core and @sparticuz/chromium |
| `edf16f3` | fix(audit): wire prospect.location into competitor geo-targeting |
| `d5995a7` | fix(report): hide CRO section entirely when the crawl failed |
| `38b9a81` | fix(admin): surface the real CRO crawl failure reason in admin UI |
| `b1f0174` | fix(admin): stop Today reading audit_content/outreach_log as embeds |
| `27517f9` | fix(pipeline): mark monitored_domains converted on any audit creation |
| `e4b141c` | fix(report): stop fallback copy from impersonating personal AI commentary |
| `e563adb` | docs: add refreshed audit portal backlog and DataForSEO pricing/GBP concept |

**Earlier:**

| Hash | Message |
|---|---|
| `51097bb` | feat(audit): make incomplete commentary visible and recoverable |
| `bf525fa` | fix(report): three independent template/prompt fixes (items 6, 7, 8) |
| `ea2ee8a` | fix(report): drop hardcoded 500-visitor fallback, gate revenue figures on real data |
| `da32a42` | fix(audit): strengthen competitor domain normalisation to catch self-listing |
| `63731ec` | fix(report): correct ~67x error in revenue-impact formula |
| `fa49db7` | fix(audit): stop commentary firing into incomplete data on a readiness timeout |
| `c284119` | fix(audit): lock rescan to prevent overlapping runs on the same prospect |
| `02bbc3d` | fix(report): unify organic keyword/traffic resolution into one shared function |
| `479af0d` | fix(report): stop treating a genuine zero score as missing data |
| `a5d6066` | fix(audit): replace fixed 35s commentary delay with a real readiness check |

Everything before `a5d6066` (Stage Rivers board, Today tab, the original "Crawls Complete: 0" fix, the KLIKS Patisserie work) predates all three passes above — treat as stable baseline, check `git log` directly if older context is needed rather than extending this table indefinitely.

---

## 8. Known Gotchas

- **`NEXT_PUBLIC_SITE_URL` is a fixed production URL used by every background job's internal fetch**, regardless of which deployment is actually running. A preview deployment testing a brand-new background route will silently write nothing — the fetch 404s against production (where the new route doesn't exist yet), and `waitUntil(fetch(...))` never surfaces a failed fetch anywhere. Only bites on genuinely *new* routes tested via preview (anything already shipped to production works fine either way, since the URL resolves there regardless of which deployment triggered it). Not yet fixed — see §6.
- **Vercel preview URLs sit behind Vercel's own deployment-protection SSO**, separate from the app's own admin login. This can never be clicked through by an agent, and it also means an external service's webhook (e.g. DataForSEO's postback) can never reach a preview URL — some things can only be verified on production.
- **PostgREST embedded relations reading 1:1 data are unreliable** — caused the same bug shape twice (the original "Crawls Complete: 0" bug, then Today's Pending badge false-positive), even with a shape-normalising helper in place both times. Root cause not fully pinned down; the fix both times was switching to a direct bulk query (`.in(prospect_id)`, join in JS) rather than trying to make the embed reliable. A sweep this pass found no more embedded relations left anywhere in the app — don't reintroduce the pattern.
- **The single most recurring bug shape across recent work: the same number computed in more than one place, independently, silently drifting apart.** The organic traffic/keyword resolver, the revenue formula (drifted ~67x), and GMB competitor self-exclusion normalisation were all instances of this. Any value shown in more than one place should go through one shared function, not be recomputed per call site.
- **The rescan lock prevents new overlapping runs, it does not retroactively fix data already corrupted by a pre-lock race.** `cake-in-a-box` was abandoned rather than debugged for this reason — cheaper to delete and recreate under a different name than untangle interleaved writes.
- **DataForSEO `task_post` endpoints are async and don't publish a fixed turnaround**: standard priority up to 45 minutes, high priority (paid extra) about a minute, via a `postback_url` webhook DataForSEO calls when done (gzip-compressed POST body, 10s response deadline or it falls back to the polled `tasks_ready` list). No built-in signature scheme — auth via a custom secret in the postback URL's query string, not the Supabase service role key.
- **No output beats output that's wrong or misleading** — the throughline of nearly every fix this pass. Missing data should hide its section or suppress its line, never render a plausible-looking fallback, and especially never one that reads as personally written when it wasn't.
- **Vercel stdout buffering:** deploy output freezes after "Building..." — deploy may already be done. Check with `vercel inspect <url>` rather than killing the process.
- **npx concurrency.lock:** if a deploy process is killed, subsequent `npx vercel` calls may hang on a stale lock at `/tmp/npm-cache-audit/_npx/*/concurrency.lock`. Fix: `find /tmp/npm-cache-audit/_npx -name "concurrency.lock" -delete`
- **`git push` can hang silently** on a macOS Keychain credential prompt that never surfaces in a non-interactive session. If a push hangs with no output, kill it (`pkill -f "git push"`, `pkill -f "git-remote-https"`, `pkill -f "git-credential-osxkeychain"`) and retry. Confirmed this pass that it can take more than one retry — don't assume the first retry succeeding is guaranteed, check `git status`/`git log origin/main..HEAD` after each attempt rather than trusting exit code alone if the command was backgrounded.
- **`SUPABASE_SERVICE_ROLE_KEY` is Sensitive:** pulling env via CLI returns empty string. Can't curl Supabase admin endpoints in dev without knowing the key. Never attempt to work around this.
- **Vercel log retention is short and volume-sensitive, not just time-based.** A specific background-job log line can rotate out within minutes on this project. Prefer a persisted DB column over a log line for anything you'll need to check later — this is why `commentary_readiness_*` and the various `gmb_*_status`/`_fetched_at` columns exist as columns rather than just console output.
- **`waitUntil` background jobs complete after the HTTP response** — Vercel logs for them appear in a separate "background" log entry and may not appear at all in the response trace.
- **`generate-commentary` returns 200 immediately** but the AI call runs async. Check `audit_content.ai_opportunity_commentary` in Supabase, or the Today tab's Pending badge, to confirm it actually ran — don't infer success from the 200.
- **Existing audits won't show a real Organic Keywords count** until they're rescanned — `keywords_total_count` isn't populated in older `dataforseo_overview` records.
- **The `lib/supabase.ts` Supabase client is untyped** (`SupabaseClient`, no generated `Database` type). A new column that hasn't been migrated yet will never cause a TypeScript error — it'll compile fine and only fail (or silently no-op, depending on whether the call site checks `{ error }`) at runtime. Don't take a clean `tsc` as proof a schema-dependent change actually works end-to-end. Check the write side explicitly logs `{ error }` too — found and fixed one call site this pass (`dataforseo-gmb-tasks`) that didn't.
- **No credentials, ever.** Standing rule across every session on this project: never log into the admin dashboard, never attempt to obtain or work around `SUPABASE_SERVICE_ROLE_KEY`. Verification that needs the live admin UI or a live DB query has to go through Adam — say so plainly rather than guessing at what a screen would show.
- **`npx vercel` deploys intermittently fail with an immediate `"Not authorized"` JSON error and no upload progress, even though auth is fine.** Confirmed three separate times this pass via `vercel whoami` (correct account, correct project link every time). Not a real auth problem — a direct retry of the exact same `npx vercel` command succeeds. Don't try to "fix" auth when this happens, just retry.
- **`npx tsc --noEmit` passing is not sufficient proof a change will build on Vercel.** An ESLint error (`prefer-const` on a `let` that's never reassigned) passed type-checking cleanly but failed the real `npm run build`. Run `npm run build` locally as the standard pre-deploy check going forward, not just `tsc --noEmit`.
- **A leading-underscore folder under `app/` (e.g. `app/api/_foo/`) is excluded from Next.js App Router routing entirely** — it never appears in the build's route list, and hitting its intended URL just 404s with no other signal. Rename without the underscore to route it at all.
- **A GET route handler with no dynamic API usage (no `cookies()`, no request-derived branching, etc.) gets statically pre-rendered and cached at build time by default — even if its body fires live external `fetch` calls.** It'll show `○ (Static)` in the build output instead of `ƒ (Dynamic)`, meaning it actually ran once at build time and every later hit just replays that same cached response. Add `export const dynamic = 'force-dynamic'` to any route that must execute fresh on every request.

---

## 9. Owner

**Adam Nagy** — `adam.nagy.mm@gmail.com` / `wearekliks@gmail.com`
Founder, Kliks Digital. Not a full-stack dev. Can push to git, edit Supabase SQL, use Vercel dashboard.
Communication style: direct, short, no fluff. Hyphens not em dashes. No bullet-point copy. Sends tightly-scoped, single-purpose requests — one bug or one feature per message, often with an explicit build order and an explicit instruction to stop and report back rather than guess when a diagnosis is ambiguous. Diagnose-first: expects a confirmed root cause (not a plausible one) before a fix is proposed, and expects "propose before building" to mean an actual stop, not a formality.
