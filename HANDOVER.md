# Kliks.com.au — Thread Handover Doc

> Keep this file updated as the project evolves. It is the single source of truth for new sessions.

---

## 1. What This Project Is

**kliks.com.au** is the website for Kliks Digital — Adam Nagy's paid ads + Shopify growth agency (AU-based, also operates in Hungary).

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

Also: `assetPrefix: '/audit'` in `next.config.js` must be unconditional (not gated on `process.env.VERCEL`).

### Deploy gotcha: stdout buffering
`npx vercel --prod` stdout buffers heavily. The terminal looks frozen after "Building..." but the deploy may have already finished. Use `vercel inspect <deployment-url>` to check real status, or watch for the task completion notification. Do not kill a running deploy process.

---

## 3. Static Marketing Site

### Files
- `index.html` — main homepage
- `ad-junkies.html` — Ad Junkies newsletter page (subscriber count JS: base 1445 on 2026-05-26, grows 4-6/day)
- `book.html` — Booking form page (single-step, Web3Forms backend, no Calendly redirect, inline success card)
- `booked.html` — Legacy confirmation page (no longer used)
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
- **Cards:** glass style — `rgba(255,255,255,0.03)` bg, `rgba(255,255,255,0.07)` border, 16px radius, no shadow, no left-stripe. Hover: `border-color rgba(100,75,255,0.2)`, `translateY(-6px)`
- **Buttons:** `#ff4315`, pill shape (`border-radius: 100px`)
- **Grain + vignette:** `position: fixed` (full-page, persistent on scroll)

### Copy rules (always enforce)
- No em dashes (--). Use hyphens (-) or commas.
- No bullet points in body copy. Prose only.
- Direct, calm tone. No fluff. Founder-to-founder voice.
- Australian spelling where relevant.

### index.html form (Web3Forms)
Both `index.html` and `book.html` use identical field sets: split first/last name, email, phone (optional), store URL (optional), ad spend dropdown, challenge textarea. Both submit via `fetch()` POST to Web3Forms JSON API, then fire Klaviyo non-blocking. Both show an inline success card ("Got it. We'll be in touch."), no page redirect.

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
Adam creates an audit record for a prospect (slug, brand, store URL, niche, email). Background jobs run data collection. Adam emails the prospect a link. Prospect enters their email at `/audit/[slug]` → auth cookie → sees their full audit report at `/audit/[slug]/report`.

### User flow
1. Adam hits `/audit/admin` → fills form → hits Create
2. `POST /api/audit/admin/create` fires background jobs via `waitUntil`
3. Jobs run in parallel: PageSpeed (Cloud Run AU), CRO crawl (Puppeteer), DataForSEO, Google Ads Planner, Meta Ads, GMB
4. After 35s delay, `generate-commentary` fires (waits for data jobs to settle)
5. Adam cold-emails prospect: "Your report is ready at kliks.com.au/audit/[slug]"
6. Prospect enters email → httpOnly cookie set → redirected to `/audit/[slug]/report`
7. Adam gets Web3Forms notification on first open

### Key paths
| Path | What |
|---|---|
| `/audit/admin` | Admin login |
| `/audit/admin/dashboard` | Admin dashboard (list prospects, create, rescan, reset views) |
| `/audit/admin/outreach` | Outreach tracker (add new or attach to existing audit) |
| `/audit/[slug]` | Email gate page |
| `/audit/[slug]/report` | Full report (auth-gated) |
| `/api/audit/admin/create` | Creates prospect record + fires all jobs |
| `/api/audit/admin/rescan` | Re-runs all data jobs for existing prospect |
| `/api/audit/admin/prospect` | PATCH endpoint: update prospect fields (used by reset views: `access_count: 0, last_accessed_at: null`) |
| `/api/audit/admin/track-existing` | POST: inserts outreach_log row for an existing prospect without re-running data jobs |
| `/api/audit/dataforseo-core` | SERP, keywords, competitors, gaps |
| `/api/audit/dataforseo-enrichment` | Waits 35s, then triggers generate-commentary |
| `/api/audit/dataforseo-gmb` | GMB lookup (own route, 30s timeout, 60s budget) |
| `/api/audit/generate-commentary` | Two Anthropic API calls → 5 commentary sections + priority list |
| `/api/audit/pagespeed` | Proxies to Cloud Run AU for PageSpeed |
| `/api/audit/gate` | Validates email → sets auth cookie |

### Background job architecture
- Uses `waitUntil` from `@vercel/functions` — do NOT use plain fire-and-forget (Vercel kills it on response)
- All data routes: `maxDuration = 60`, `preferredRegion = 'syd1'`
- GMB is a dedicated route (extracted from enrichment) because it needs 5-21s
- Enrichment fires generate-commentary after an explicit 35s `setTimeout` to give dataforseo-core (~25-30s) time to write first

### AI model
Model is centralised in `audit/lib/config.ts`:
```typescript
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5'
```
Both call sites in `generate-commentary/route.ts` import `ANTHROPIC_MODEL`. If Anthropic retires a model, update only `lib/config.ts`. The previous model `claude-sonnet-4-20250514` was retired and caused 404s — that's why it's now centralised.

### Supabase schema

**`prospects`**
- `slug` (UNIQUE), `brand_name`, `store_url`, `prospect_email`, `prospect_name`, `niche`, `cta_link`, `created_at`, `last_accessed_at`, `access_count`, `is_active`

**`audit_content`**
- `prospect_id` FK, legacy section fields, `ai_performance_commentary`, `ai_cro_commentary`, `ai_seo_commentary`, `ai_opportunity_commentary`, `ai_closing_commentary`, `ai_priority_list` JSONB, `hook_headline` JSONB, `score_descriptions` JSONB

**`audit_data_cache`**
- `prospect_id` FK (UNIQUE), `pagespeed_mobile`, `pagespeed_desktop`, `dataforseo_overview` JSONB (includes extra key `keywords_total_count` as of 2026-07-02 — see below), `dataforseo_keywords`, `dataforseo_gaps`, `dataforseo_competitors`, `dataforseo_serp_features` JSONB, `dataforseo_content_gap` JSONB, `dataforseo_keyword_trends` JSONB, `backlinks_summary` JSONB (always null — no subscription), `google_ads_planner`, `meta_ads`, `cro_checklist`, `gmb_data` JSONB, `crawled_at`, `pagespeed_fetched_at`

**`admin_users`**
- `email`, `password_hash` (bcrypt 12 rounds), `name`, `is_active`

**`outreach_log`**
- `prospect_id` FK, `status`, `first_opened_at`, `last_opened_at`, `open_count`

Test record: slug=`test-brand`, email=`wearekliks@gmail.com`

### SQL migrations needed (run in Supabase SQL editor if not already done)
```sql
ALTER TABLE audit_content ADD COLUMN IF NOT EXISTS ai_priority_list JSONB;
ALTER TABLE audit_content ADD COLUMN IF NOT EXISTS hook_headline JSONB;
ALTER TABLE audit_data_cache ADD COLUMN IF NOT EXISTS dataforseo_keyword_trends JSONB;
ALTER TABLE audit_data_cache ADD COLUMN IF NOT EXISTS backlinks_summary JSONB;
ALTER TABLE audit_data_cache ADD COLUMN IF NOT EXISTS gmb_data JSONB;
```

### AI commentary (generate-commentary/route.ts)
- Call 1: 5-section commentary → performance, CRO, SEO, opportunity, closing
- Call 2: priority list → `{ priorities: [{ number, title, impact, next_step }] }` (non-fatal if fails)
- Hook headline: generated from worst score, top non-branded keyword, CRO failures — must be store-specific, never generic. Anti-convergence rules in prompt prevent identical hooks across stores.

### DataForSEO notes
- `domain_overview/live` returns 404 on this plan — use `domain_rank_overview/live`
- `keyword_gap/live` returns 404 — use `keywords_for_site/live`
- `backlinks/summary/live` returns 40204 — separate subscription required, disabled
- AU location code: `2036` (national), city codes: Sydney `21167`, Melbourne `21182`, Brisbane `21139`, Perth `21188`, Adelaide `21136`, Canberra `21124`, Hobart `21172`, Darwin `21128`
- Local city detection: reads `niche` field for city terms, uses city-level location code in SERP calls, filters out other-city competitor domains
- Content gap: no `filters` param (causes 40501 error)

### Organic Keywords count (dataforseo-core fix, 2026-07-02)
The `ranked_keywords/live` endpoint returns `total_count` (real domain total) and `items` (capped at `limit`, default 50). The old code was displaying `items.length` (always 50) as the Organic Keywords stat, not the real total.

Fix: `dataforseo-core/route.ts` now reads `total_count` from the response and merges it as `keywords_total_count` into the `dataforseo_overview` JSONB before upsert — no new DB column needed. `ReportClient.tsx` reads `dfsOverview.keywords_total_count` first, falls back to `metrics.organic.count` or array length.

**Important:** only prospects rescanned AFTER commit `9f305ea` (2026-07-02) will have `keywords_total_count` populated. Older audits will show the fallback until rescanned.

### Referring Domains card (ReportClient.tsx, 2026-07-02)
The card is now conditionally rendered. If `backlinks_summary` is null or empty, the card is omitted entirely and the grid becomes 3-column (Organic Keywords, Est. Monthly Traffic, Est. Traffic Value). When a DataForSEO backlinks subscription is added and `backlinks_summary` starts populating, the card will automatically appear and the grid switches back to 2x2.

### PageSpeed architecture
Vercel US servers are blocked by AU-hosted Shopify stores. Solution: Cloud Run microservice in `australia-southeast1`.
- Cloud Run URL: `https://pagespeed-service-981518713562.australia-southeast1.run.app`
- Flow: `/api/audit/pagespeed` (Vercel syd1) → Cloud Run → PSI API (mobile + desktop, 55s timeout, all 4 categories)
- Must pass all 4 categories: `category=performance&category=seo&category=accessibility&category=best-practices`

### Report sections (render order in ReportClient.tsx)
1. Intro card (brand, date, niche, confidential)
2. Audit Scores strip (Mobile Perf, Desktop Perf, SEO Score, Accessibility, CRO Score /20, Overall CRO grade)
3. CRO Score Summary (passed/20, critical issues, warnings, opportunities)
4. Section 01 — Core Web Vitals (LCP, FCP, CLS, TBT, Speed Index, TTI) + speed/money callout + AI commentary
5. Section 02 — CRO Checklist (20-point crawl, grouped) + AI commentary
6. Section 03 — Ads and Creative (Meta Ad Library)
7. Section 04 — Ad Strategy (legacy manual, hidden if empty)
8. Section 05 — SEO Audit (DataForSEO: stats, keywords, Winning/Close/Money buckets, competitor gap, competitors table, content gap, Google Ads Planner) + AI commentary
9. Priority Actions (3 AI cards: title, impact, next step)
10. Section 06 — Search Opportunity (legacy manual, hidden if empty)
11. Section 07 — Biggest Opportunity (AI orange glow card)
12. Section 08 — Revenue Opportunity Summary (auto-calculated bars)
13. Section 09 — Data Confidence Summary (appendix)
14. Section 10 — What Happens Next (AI closing + book a call CTA)

### Keyword buckets (computed in ReportClient.tsx)
- **Winning:** pos 1-5, volume >= 100, no /blog/ URLs, sort pos asc, cap 15
- **Close:** pos 6-15, volume >= 100, no /blog/ URLs, sort volume desc, cap 10
- **Money (gap):** `dfsGaps` if available, else `dfsContentGap`, top 10 by volume

### Admin dashboard features
- Per-row "Reset views" button: confirms with brand name, PATCHes `access_count: 0, last_accessed_at: null` via `/api/audit/admin/prospect`
- Per-row "Rescan" button: re-runs all background data jobs
- Both desktop Actions column and mobile card view have these buttons

### Outreach form (admin/outreach)
Two modes via toggle:
1. **Create new** — standard new prospect form including optional Google Place ID field (`ChI...` = place_id, numeric = CID). Fires all background jobs.
2. **Attach to existing** — dropdown of existing prospects (name + domain), inserts `outreach_log` row only via `track-existing` API route. No data jobs fired, no duplicate check at prospect level.

### Admin auth
- `audit_admin_auth` httpOnly cookie gates all admin routes
- Password hash (bcrypt 12 rounds) must be inserted into `admin_users` table — Adam still needs to do this

### Env vars (set in Vercel project settings)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          (marked Sensitive — unreadable via CLI)
PAGESPEED_API_KEY
NEXT_PUBLIC_PAGESPEED_API_KEY
DATAFORSEO_LOGIN
DATAFORSEO_PASSWORD
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
`SUPABASE_SERVICE_ROLE_KEY` is marked Sensitive in Vercel — pulling env vars via CLI returns it empty. Use Vercel dashboard to read it if needed.

---

## 5. Current Prospects (as of 2026-07-02)

| Slug | Brand | Notes |
|---|---|---|
| `enze` | Enze | Cake shop |
| `oh-my-days` | Oh My Days | Vegan cakes, Sydney-local |
| `miss-lillys` (approx) | Miss Lilly's | Used for organic keywords testing — rescanned 2026-07-02 |
| `cake-mail` (approx) | Cake Mail | Mentioned alongside Enze for view reset |
| `test-brand` | Test | Dev testing, email: wearekliks@gmail.com |

Exact slugs for Miss Lilly's and Cake Mail: check admin dashboard.

---

## 6. Pending Tasks (as of 2026-07-02)

### Adam must do (requires admin/DB access)
- [ ] Verify Miss Lilly's report: Organic Keywords shows real number (not 50), Referring Domains card gone, 3-card row
- [ ] Rescan a second prospect, confirm its Organic Keywords differs from Miss Lilly's (proves fix is working across audits, not just one)
- [ ] Reset views for Enze and Cake Mail via admin dashboard (hit the per-row "Reset views" button)
- [ ] Insert admin password hash (bcrypt 12 rounds) into `admin_users` table — admin login is currently blocked without this

### Infrastructure
- [ ] Run SQL migrations above in Supabase if not already done
- [ ] Add `PAGESPEED_SERVICE_URL` as proper Vercel env var (hardcoded fallback works but is untidy)

### Copy / URLs
- [ ] AU Calendly URL — replace `https://calendly.com/kliks-hu/30min` in `book.html` and `ad-junkies.html`

### Design — approved but not built
- [ ] Core Web Vitals cards redesign to `.vital` style (coloured icon box, large coloured value, status label, animated meter bar)
- [ ] SEO stats to 4-column horizontal bar layout

### When DataForSEO backlinks subscription is added
- [ ] Re-enable `backlinks/summary/live` calls in dataforseo routes
- [ ] Add Domain Rank card back to Audit Scores strip
- [ ] Add ref. domains column to competitors table
- [ ] Referring Domains card in SEO stats will auto-appear (code already handles it)

### Longer-term
- [ ] Adam GIF re-hosting — profile GIF at Shopify CDN will break when account closes
- [ ] Re-enable `/lukewood` and `/oh-my-days` routes in `vercel.json` (currently redirect to `/`)
- [ ] Historical keyword trends — check if `dataforseo_keyword_trends` populates after rescans (plan tier may not support it)

---

## 7. Recent Commits (most recent first)

| Hash | Message |
|---|---|
| `9f305ea` | audit report: real Organic Keywords count, hide empty Referring Domains |
| `27b84a8` | audit: fix 404 from retired claude-sonnet-4-20250514 model |
| `6978326` | audit admin: New Outreach Place ID field, attach to existing audit |
| `3e48edd` | audit admin: add per-audit reset views action |
| `7956040` | book.html: single-step form, Web3Forms backend, no Calendly redirect |
| `37a921f` | book.html: fix marquee logos (Cloudinary), add Space Mono for labels |
| `2ea574b` | book.html: dynamic months + random spots to match index.html |
| `248c2a6` | GMB dedicated route, hook anti-convergence, local competitor filter, CSS polish |

All commits are on `main`, pushed to `heytadeka/kliks-au`.

---

## 8. Known Gotchas

- **Vercel stdout buffering:** deploy output freezes after "Building..." — deploy may already be done. Check with `vercel inspect <url>` rather than killing the process.
- **npx concurrency.lock:** if a deploy process is killed, subsequent `npx vercel` calls may hang on a stale lock at `/tmp/npm-cache-audit/_npx/*/concurrency.lock`. Fix: `find /tmp/npm-cache-audit/_npx -name "concurrency.lock" -delete`
- **`SUPABASE_SERVICE_ROLE_KEY` is Sensitive:** pulling env via CLI returns empty string. Can't curl Supabase admin endpoints in dev without knowing the key.
- **Vercel function logs:** `waitUntil` background jobs complete after the HTTP response, so Vercel logs for them appear in a separate "background" log entry. They may not appear at all in the response trace.
- **`generate-commentary` returns 200 immediately** but the AI call runs async. Check `audit_content.ai_seo_commentary` in Supabase (or the report page) to confirm it actually ran.
- **Existing audits won't show real Organic Keywords count** until they're rescanned — `keywords_total_count` isn't populated in older `dataforseo_overview` records.

---

## 9. Owner

**Adam Nagy** — `adam.nagy.mm@gmail.com` / `wearekliks@gmail.com`
Founder, Kliks Digital. Not a full-stack dev. Can push to git, edit Supabase SQL, use Vercel dashboard.
Communication style: direct, short, no fluff. Hyphens not em dashes. No bullet-point copy.
