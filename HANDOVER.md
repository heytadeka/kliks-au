# Kliks.com.au — Thread Handover Doc

> Keep this file updated as the project evolves. It is the single source of truth for new sessions.

---

## State as of 2026-11-05

**Adds to the 2026-10-07 banner below; it does not replace it.** A small site pass: two pages went live at `6e0299b`, and the footer link, the Pupcases card and one wording fix ship in the same commit as this note.

- **New `/brands` page** (`brands.html`, "The brands under Kliks"). Four cards: Kliks Digital, Occasionly, Magniscan, Pupcases, each a text wordmark with one line and a "Visit" link. Occasionly's own site footer links to it ("Occasionly is part of Kliks."). Built from the case-studies head, tokens and footer, so it carries the same GA4 and Meta Pixel snippet and no extra tracking. The grid is 3 columns for 3 cards and switches itself to 2x2 when a 4th card exists.
- **`/case-studies` redesigned** (layout borrowed from Adam's "Beyond the Ads" page, Kliks fonts and colours). Four cases: Oh My Days, Pupcases, Magniscan, Occasionly, each with a framed screenshot. The screenshots (`case-*.png`) and the Occasionly wordmark (`occasionly-logo.png`) are root-level PNGs because `vercel.json` only deploys root `*.html` and `*.png`. They are point-in-time captures of the client sites; retake one if that homepage changes. Client sites linked out: ohmydays.com.au, pupcases.com.au.
- **"Kliks brands" link in the footer of 16 pages:** home, book, booked, ad-junkies, privacy, case-studies, brands and the 9 blog pages. Left out on purpose: the three thank-you pages (different brand designs, conversion endpoints), the Luke funnel, patisserie, mactrans (client report) and the unserved lukewood and oh-my-days. Footers are copied into each page with no shared template, so a new page needs the link added by hand.
- **Occasionly facts for any copy:** customers set up the occasion themselves (birthday, anniversary and so on) and two branded reminder emails go out before each one.
- **Merge note:** the case-studies redesign was merged over a padding fix that had just landed on `main` (`aa9088f`). The new page replaces that file and already follows the same rule: an element that also carries `.container` must set vertical padding with `padding-top` and `padding-bottom`, never the `padding` shorthand, or it wipes the side padding.

---

## State as of 2026-10-07

**Read this first.** This pass was about lead tracking (Meta, Google Ads, Klaviyo), two production incidents, and a privacy-policy rewrite. Where this banner disagrees with an older section below, the banner wins. "Live" below means on `origin/main` at `82ed2ea` (the HANDOVER update itself may sit one commit above that).

### How Adam wants work done (hard rules from this pass)
- **Preview branch first, never straight to `main`.** New work goes on a `preview/...` branch. Pushing a branch only builds a private preview; it does not touch the live site. Merging into `main` is the go-live step (Vercel then deploys kliks.com.au) and only happens when Adam says "merge". Earlier in this pass a few commits went straight to `main` with his OK, and two of them caused or exposed incidents (below).
- **Never submit real forms on production to test.** A live submit creates real things: a Web3Forms email, a Klaviyo profile, a Supabase prospect (`/audit`), Meta and Google events. Test locally in headless Chromium with every backend stubbed at the network layer (Web3Forms, Klaviyo writes, Meta pixel, `/api/*`; abort GA4 collect), fake data only (`test+gads@example.com`). If a live test is genuinely needed, ask first and list exactly what it will create. Earlier live tests on 2026-09-22/23 left test emails and Klaviyo profiles behind - see §6.
- **Never print secrets.** No credentials work: never log into admin, never work around Sensitive Vercel env vars.
- **Adam is not a full-stack dev and loses the thread in long sessions.** Open with the plain-English answer, keep tables short, and always say what is live versus only on a branch.

### What shipped this pass
| What | Commit | Status |
|---|---|---|
| Per-prospect AOV on audit reports (`prospects.aov`, admin New/Edit forms, `$150` fallback) | `9ce6228` | Live. DB column added by Adam. |
| Meta Conversions API for every lead form, homepage form now tracked, double-counted Lead on thank-you pages removed, Ad Junkies newsletter now `Subscribe` | `6cfc536` (reverted `eb419d0`, reapplied `935d65d`) | Live. `/api/meta-capi`, `audit/lib/meta-capi.ts` |
| Explicit `/` → `/index.html` route in `vercel.json` | `68763d2` | Live. Fixed bare homepage 404ing ~50% of requests |
| Google Ads conversion tracking (AUDIT + CALL labels) | `de0712b` | Live (merged 2026-10-07) |
| Strategy-call leads into Klaviyo list `XqKPhV` | `6a3f203` | Live. Adam verified a test lead arrived with correct fields |
| Privacy policy rewritten to name every third party | `11464b0`, `82ed2ea` | Live |
| `force-dynamic` on `audit/app/page.tsx` (attempt to make the A/B middleware run) | `c9087d1` → reverted `233a668` | FAILED, do not retry (see below) |

### Incidents this pass (so nobody repeats them)
1. **`export const dynamic = 'force-dynamic'` on `audit/app/page.tsx` broke `/audit` for about 5 minutes.** Under this repo's legacy `builds` + `routes` `vercel.json`, once `/` stopped being a prerendered static page, `kliks.com.au/audit` resolved to `app/[slug]/page.tsx` with `slug = "audit"` and showed the email gate for a nonexistent prospect instead of the landing page. Reverted in `233a668`. Details and the real status of the A/B test are in §4A.
2. **Bare `kliks.com.au/` was returning a Vercel 404 on roughly half of requests, and had been all along.** `vercel.json` had no rule for `/` (`/([^/.]+)$` needs at least one character), so it relied on an unreliable Vercel default. Every other path was stable. Found by hammering `/` with repeated GETs while testing the Meta work (it persisted after that work was reverted, proving it was not the cause). Fixed by `68763d2`; verified 40/40, then 50/50, then 20/20 afterwards.

### Findings that closed old questions
- **Meta Leads fell to zero on 2026-09-13 because Adam paused the campaign. Not a bug.** Dataset `1875112903440305` showed paired BROWSER + SERVER `Lead` events up to 2026-09-13 16:00 PT, then nothing while PageView kept climbing. The Meta campaign was still paused when this note was written (Adam hasn't said it was restarted).
- **raw-passion "commentary disagrees with scores" (2026-09-23) was a transient mid-scan view, not the unresolved freshness bug in §6.** The trace columns showed no divergence and the stored commentary matched the current PageSpeed numbers. Two real gaps came out of it: the public report page shows no "scan in progress" indicator, and `audit_content.updated_at` is never written by any code path or trigger (it only holds the creation time), so it can't prove content was refreshed.
- **Strategy-call leads had never reached Klaviyo** since the site was built (2026-04-23): `book.html` posted to `/client/form-submissions`, which does not exist in Klaviyo's API (404; the browser reports it as a CORS error and `.catch` hid it). Replaced with `/client/subscriptions` - see §3.
- **The `/audit` A/B test has never split traffic in production** - see §4A.

### Vercel
- Two Vercel projects were both connected to the GitHub repo and built every push. **`kliks-au` is the real one** (holds `kliks.com.au`; repo-root `.vercel/project.json` links here). **`kliks.com.au` was a duplicate; Adam paused it on 2026-10-07.** GitHub now shows it as "failure" on every push - expected, ignore it (or disconnect its git integration to silence it). A third project, `audit`, is what `audit/.vercel/project.json` points at (stale, not git-connected - see §2).
- Preview URLs now come from `kliks-au` (`kliks-<hash>-adams-projects-fc0efc7d.vercel.app`) and sit behind Vercel login, so an agent cannot open them.

### What is left (full list in §6 "Tracking follow-ups")
Adam: run Google Tag Assistant on the live site for each form, delete earlier test leftovers, check Ads conversion status, decide on a consent line for `/book`. Open engineering: A/B test, GA4 `generate_lead` double-fire on two thank-you pages, stale Calendly buttons on `privacy.html`, scan-in-progress indicator.

---

## Earlier state, as of 2026-09-15 (kept for history; the banner above wins where they differ)

**This doc went unmaintained for a month (last update 2026-08-14) while ~35 commits shipped.** Everything below is now current as of today, but treat any pre-2026-09-15 detail in the body sections as possibly superseded by what's in this banner and §7 first. Full commit list in §7.

- **Everything committed is pushed and live on `origin/main`.** No local-only commits outstanding.
- **The undocumented month, by theme** (see §7 for the full hash list): the entire **Growth Audit landing page** was built from scratch at `/audit` — a public lead-gen funnel, distinct from the Audit Portal in §4 — then A/B split into a second variant, then iterated on across several passes (Meta CAPI, GA4/Clarity, copy rewrites, a logo marquee, a nav hamburger). New architecture doc for it is §4A below. Separately: a homepage copy rewrite, a new case-studies page (Pupcases, Magniscan), a `*.png` static-build fix (images were silently not deploying), and one AU DataForSEO location-code fix (`64f2abd` — corrected wrong codes for the 8 existing cities; unrelated to, and does not fix, the missing-Gold-Coast gap found below).
- **This pass (today) did three things, none of them touching the code above:**
  1. Fixed four real bugs found while polishing Growth Audit variant B: an invisible CTA (`<a>` link text losing to a more specific CSS selector), a mobile logo-strip layout bug, a mobile hero-grid overflow/clipping bug, and a missing variant tag on the lead-notification email. All confirmed fixed and live — see §4A.
  2. **Ran a real diagnostic against a live non-ecommerce prospect (`mactrans-2`, a Gold Coast freight company) and confirmed the Audit Portal's report template (§4) is not ready for any non-ecommerce niche.** Concrete, evidence-backed findings, not a guess: a hardcoded `$150`/`1.5%` ecommerce revenue model drives every dollar figure on every report regardless of business type; retail vocabulary ("store", "shopper", "order") is baked into both fixed template copy and the AI commentary prompt's own instructions, not just left over from bad niche data; `AU_CITY_MAP` (used for local geo-targeting) has no entry for Gold Coast or any non-capital city, and this is now **empirically confirmed** to have caused a real, live wrong result (an awkward LLM-visibility query, and "Gold Coast" itself getting extracted as a fake competitor name); and the CRO checklist has ~7 checks (cart, ATC, product schema, etc.) that can't meaningfully pass or fail for a service business, inflating its failure count. Full detail and the resulting build scope in §4's new "Local Service audit mode" subsection and §6.
  3. **Shipped a one-off, hand-built static report for the real Mactrans prospect** at `/mactrans.html`, entirely outside the normal Audit Portal pipeline (because Local Service mode doesn't exist yet and the client needed something correct by the next day). Self-hosted its logo, wired the real `/book` CTA, added a lightweight client-side email gate. **This is explicitly not a template — see §5's `mactrans-2` row before generalizing anything from it.**
- Everything in the old Aug-14 banner (the rescan/commentary-freshness investigation, the 12-prospect regeneration cleanup route, the Phase 4 `ai_gmb_commentary` migration, `NEXT_PUBLIC_SITE_URL`) **was not touched this pass and its status is unverified** — nothing here disproves it was resolved in one of the undocumented month's sessions, but nothing confirms it either. Treat §6's older items as still open until someone checks.

---

## 1. What This Project Is

**kliks.com.au** is the website for Kliks Digital — Adam Nagy's paid ads + Shopify growth agency (AU-based, also operates in Hungary). A **KLIKS Patisserie** sub-brand landing funnel (bakery/patisserie vertical) was added as a separate static page set — see §3.

The repo contains two things:

| Thing | What it is | Where |
|---|---|---|
| Static marketing site | Plain HTML/CSS/JS | `index.html` + supporting `.html` files in root |
| Growth Audit landing page | Public lead-gen funnel, two A/B variants — see §4A | `audit/app/page.tsx` (variant A) + `audit/app/b/` (variant B) |
| Audit portal | Cold-outreach SEO/AI-visibility report tool — see §4 | `audit/app/[slug]/`, `audit/app/admin/` |

The last two are the same Next.js 14 App Router app (`audit/` subdirectory) but are two different products serving two different purposes — don't conflate them. They are deployed together via Vercel. The static site serves at `/`, the Next.js app serves at `/audit/`.

---

## 2. Repo & Deployment

**GitHub:** `heytadeka/kliks-au`
**Local path:** `/Users/Pongi/Desktop/kliks.com.au`
**Live URL:** `https://kliks.com.au`
**Vercel project:** `kliks-au` under personal account `adam.nagy.mm@gmail.com` (account `adamnagymm-3717`). Auto-deploys on push to `main`, ~30-60s to live. A duplicate project named `kliks.com.au` also used to build every push; Adam paused it on 2026-10-07 (see the 2026-10-07 banner). Pushes to any other branch build a private preview in `kliks-au`.

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
Order of routes is load-bearing (routes are first-match-wins). These rules must stay exactly as-is:

1. `/api/(.*)` → `/audit/api/$1` — must be first. This is also why `kliks.com.au/api/meta-capi` works: the route lives in the audit Next.js app.
2. `/` → `/index.html` — added 2026-10-07 (`68763d2`). Without it bare `/` returned a Vercel 404 on ~50% of requests. Do not remove, and do not add a second rule for `/`.
3. www redirect (301)
4. `/lukewood` + `/oh-my-days` → `/` (302, temporary)
5. `/audit/(.*)` → `/$1` — must be before `handle: filesystem`
6. `handle: filesystem`
7. `/([^/.]+)$` → `/$1.html`

**Do not set `export const dynamic = 'force-dynamic'` on `audit/app/page.tsx`.** It makes `/audit` resolve to the `[slug]` route and shows a broken email gate (incident 1 in the 2026-10-07 banner). Any change to routing, `middleware.ts`, or how `/` renders needs a preview branch and request-level testing (many repeated GETs, not one), never a push to `main`.

Also: `assetPrefix: '/audit'` in `next.config.js` must be unconditional (not gated on `process.env.VERCEL`). `vercel.json` also has a `crons` block (traffic-drop monitoring for the Pipeline tab — see §4) — leave it alone unless you're deliberately changing that schedule.

### Deploy gotcha: stdout buffering
`npx vercel --prod` stdout buffers heavily. The terminal looks frozen after "Building..." but the deploy may have already finished. Use `vercel inspect <deployment-url>` to check real status, or watch for the task completion notification. Do not kill a running deploy process.

### Deploy previews
`npx vercel` (no `--prod`) from repo root gives a preview URL without touching production — this is the normal way to visually check a rendering change before it's pushed to `main`. Confirm the target is the `kliks-au` project before running it. **Cannot verify new background-job routes** — see the `NEXT_PUBLIC_SITE_URL` gotcha in §8.

### Preview branches (the normal way to ship anything risky)
```bash
git checkout -b preview/<name>      # work and commit here
git push -u origin preview/<name>   # builds a private preview in kliks-au; live site untouched
# after Adam says "merge":
git checkout main && git merge --ff-only preview/<name> && git push origin main
```
Find the preview URL with `gh api repos/heytadeka/kliks-au/commits/<sha>/status` and the deployments API. Previews are behind Vercel login, so an agent cannot load them; test locally instead (see the testing gotchas in §8). A Vercel "Protection Bypass for Automation" secret exported as `VERCEL_BYPASS_SECRET` would let an agent test previews - not set up yet.

---

## 3. Static Marketing Site

### Files
- `index.html` — main homepage
- `ad-junkies.html` — Ad Junkies newsletter page (subscriber count JS: base 1445 on 2026-05-26, grows 4-6/day)
- `book.html` — Strategy-call booking form (single step). On Web3Forms success it fires Meta Lead + CAPI, the Google Ads CALL conversion and a Klaviyo list sign-up, then redirects to `thanks-booking.html`. See the lead tracking map below.
- `thanks-booking.html` — thank-you page for the strategy-call booking form
- `booked.html` — Legacy confirmation page, unlinked from the live flow. It is the only page that still fires a `Schedule` Meta event, so that event never fires in practice.
- `patisserie.html` — KLIKS Patisserie sub-brand landing page (growth-audit funnel for the bakery/patisserie vertical), Web3Forms + GA4 + Meta Lead tracking
- `thanks-patisserie.html` — thank-you page for the Patisserie funnel
- `patisserie/` — design handoff reference for the Patisserie page (`Patisserie Landing.dc.html` mockup + `README.md` + `image-slot.js` helper). Not served — reference only. Same convention as the Stage Rivers design handoff used for the audit portal's Outreach board (a `.dc.html` mockup + `README.md` dropped in a feature-named folder before build).
- `privacy.html` — privacy policy. Rewritten 2026-10-07 to name every third party that receives visitor or form data (Web3Forms, Supabase, Klaviyo, Calendly, Vercel, Google PageSpeed/DataForSEO/Anthropic for audits, Meta Conversions API, Google Analytics/Ads, Meta Pixel, Microsoft Clarity, fonts/image hosts). **Update it whenever a vendor, tag or form is added or removed.**
- `thanks.html` — thank-you page for the Ad Junkies newsletter signup
- `case-studies.html` - case studies page, four cases with framed screenshots (`case-oh-my-days.png`, `case-pupcases.png`, `case-magniscan.png`, `case-occasionly.png`, plus `occasionly-logo.png`; all must stay root-level PNGs to deploy)
- `brands.html` - "The brands under Kliks" page, see the 2026-11-05 block at the top
- `mactrans.html` — one-off hand-built client report, see §5 (not a template)
- `luke-index.html` / `luke-apply.html` / `luke-results.html` — Luke funnel (separate design: Bebas Neue + DM Sans, lime green `#c8f040` accent)

### Design system (main site)
- **Background:** `#0e0d1a` (deep dark purple)
- **Background 2:** `#1a1828`
- **Purple:** `#644bff`
- **Orange / CTA:** `#ff4315` (hover: `#c42f08`)
- **Border:** `rgba(100,75,255,0.12)`
- **Headings:** Clash Display (Fontshare), weights 400/500/600/700 (Fontshare has no 800 face; a CSS `font-weight: 800` renders the 700 face)
- **Body:** Satoshi (Fontshare) — weights 400/500/700
- **Font loading rule (2026-11-05):** load each Fontshare family in its own `<link>` (`f[]=clash-display@400,500,600,700` and `f[]=satoshi@400,500,700`, each with `&display=swap`). Never combine two families in one URL: see the Fontshare cache gotcha in §8.
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
Both `index.html` and `book.html` use identical field sets: split first/last name, email, phone (optional), store URL (optional), ad spend dropdown, challenge textarea, and both submit via `fetch()` POST to the Web3Forms JSON API. After Web3Forms accepts the submission, both fire Meta Lead + CAPI and the Google Ads CALL conversion (see the tracking map below). `book.html` also adds the lead to Klaviyo and redirects to `thanks-booking.html`. **`index.html` does not call Klaviyo and has no redirect or thank-you page**: it swaps the form for an inline success message, so URL-based goals are impossible for it.

### book.html availability slots
Month slots auto-compute from `new Date()`. Current month = 0 spots (Fully booked). Next month = random 1-2 spots. Pattern matches index.html.

### Key IDs / constants
- Facebook Pixel ID: `1875112903440305`
- Web3Forms key: `8d31ed39-c2e7-429c-b4ad-fa37a5ff26e5` (routes to `wearekliks@gmail.com`)
- Klaviyo company ID: `QNNHsN`
- Klaviyo form ID: `VaHVst` (embed: `<div class="klaviyo-form-VaHVst"></div>`)
- Klaviyo **list** ID: `XqKPhV` (strategy-call leads from `book.html`; **single opt-in**, so no confirmation email goes to leads). Adding a lead via `/client/subscriptions` also subscribes them to email marketing.
- Klaviyo form ID `XV8BqD`: **unused** (belonged to the old dead `/client/form-submissions` call). Only `VaHVst` (Ad Junkies embed) is live.
- Google tag: container `GT-NC8XKMW5`, loaded as `gtag/js?id=G-57YSHYNH26` (GA4). Google Ads destination `AW-17756066541` is already a destination of that tag, so **do not add a second loader or a `gtag('config','AW-...')`**.
- Google Ads conversion labels: **AUDIT** `AW-17756066541/qc76CJ3c6pMdEO2l4JJC` (`/audit` A and B, `patisserie.html`), **CALL** `AW-17756066541/EeRcCNSR85MdEO2l4JJC` (`book.html`, homepage form). Patisserie shares the AUDIT label for now; Adam may want its own.
- Meta dataset / pixel: `1875112903440305`. Meta ad account "Kliks Digital": `1213172154204778` (not enabled for the Meta Ads MCP connector).
- Microsoft Clarity project `yekdyxtdxs` loads only inside the Next.js app (`audit/app/layout.tsx`), not on the static pages.
- Calendly URL: `https://calendly.com/kliks-hu/30min` — no longer used by `book.html` or `ad-junkies.html`; only two stale "Free Strategy Call" buttons on `privacy.html` still link to it

### Lead tracking map (as of 2026-10-07)
Every conversion fires **only inside the submit-success handler, never on a thank-you page load** (so reloads can't double count). Each Meta fire pairs a browser `fbq` call with a server-side Conversions API call through a shared `event_id` (dedup).

| Form | Page | Fires after | Then | Meta (browser + CAPI) | Google Ads | Klaviyo |
|---|---|---|---|---|---|---|
| Homepage contact | `index.html` `#contactForm` | Web3Forms success | inline success message, no redirect | `Lead`, content_name "Homepage Contact Form" | CALL | none |
| Strategy call | `book.html` | Web3Forms success | `/thanks-booking`, after ≥300ms and the Google hit (≤1s cap) and Klaviyo (≤1.5s cap) | `Lead`, "Strategy Call Booking" | CALL | list `XqKPhV` via `/client/subscriptions` |
| Patisserie audit | `patisserie.html` | Web3Forms success | `/thanks-patisserie`, same waiting rules as `/book` minus Klaviyo | `Lead`, "Patisserie Growth Audit" | AUDIT | none |
| Growth Audit (A and B) | `/audit`, `/audit/b` via `GrowthAuditForm.tsx` | `/api/audit/apply` success | `/audit/thank-you` after the Google hit (≤1s cap) | `Lead`, "Growth Audit Request" (server call is inside the apply route) | AUDIT | none |
| Ad Junkies newsletter | `ad-junkies.html` Klaviyo embed `VaHVst` | Klaviyo `klaviyoForms` `submit` event | `/thanks` | `Subscribe` (not `Lead`, so newsletter signups aren't mixed with sales leads) | none (deliberate) | the embed itself |

How it's built:
- **Meta server side:** `audit/lib/meta-capi.ts` (`sendMetaCapiEvent`, SHA-256 hashing of email/name/phone, `fbp`/`fbc`, IP and user agent) behind the public route `audit/app/api/meta-capi/route.ts` (allowed events: `Lead`, `Subscribe`, `Schedule`). Reachable at `kliks.com.au/api/meta-capi` through the first `vercel.json` rule. Needs env var `META_CAPI_ACCESS_TOKEN`. Add `?test_event_code=...` to any page URL to send events to Meta's Test Events view.
- **Google Ads:** `trackGoogleConversion(sendTo, onDone)` - try/catch, no-op without `gtag`, `onDone` always runs once (`event_callback` or a 1s fallback) so it can never block or lose a redirect. The static pages carry an inline copy each (the `vercel.json` `builds` list has no shared static JS asset, and adding one means touching routing); the Next app uses `audit/lib/google-ads.ts`.
- **Klaviyo (`book.html`):** `POST https://a.klaviyo.com/client/subscriptions?company_id=QNNHsN`, header `revision: 2026-07-15`, content type `application/vnd.api+json`, list `XqKPhV`, `custom_source` "Strategy Call - book.html". **Email marketing consent only** (omitting `subscriptions` would default a phone number into SMS marketing too). Phone is converted to E.164 (`04xx` → `+614xx`) or left off, because Klaviyo rejects the whole request on a bad number. Properties sent: `store_url`, `monthly_ad_spend`, `enquiry_comment`, `lead_source`. Runs only after Web3Forms succeeds, so the email to Adam is unchanged and goes first.
- **Thank-you pages fire only `PageView`** for Meta. `thanks-booking.html` and `thanks-patisserie.html` still fire a GA4 `generate_lead` on every load (pre-existing; it also reaches the Ads destination as an unlabelled event) - see §6.

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
`waitForCommentaryData(prospect_id)` polls `audit_data_cache` (`pagespeed_fetched_at`, `crawled_at`, `dataforseo_overview`) every 3s up to 50s. If all three show up, it records `commentary_readiness_status: 'ready'` (+ elapsed ms) on `audit_data_cache` and `generate-commentary` fires. If the cap is hit first, it records `'timeout'` instead, explicitly clears `rescan_locked_at` (since `generate-commentary` — the thing that normally clears it — never runs on this path), and commentary is **not** fired. Better to visibly skip than to silently generate against holes.

**Freshness investigation (open, see State-as-of banner and §6 item 1).** Two real bugs were found and fixed in this mechanism this pass, and neither fully explains the symptom still reproducing:
1. `rescan/route.ts` used to reset only `crawled_at` before firing the fan-out, leaving `pagespeed_fetched_at`/`dataforseo_overview` holding the prior scan's values — so the poll's "all three non-null" check could pass almost immediately using stale leftover data instead of this rescan's own fresh writes. Fixed by resetting all three. Confirmed via a 12-prospect SQL audit (`commentary_readiness_at` landing 19-55s before `pagespeed_fetched_at`) before the fix; those 12 prospects' commentary is stale and needs regenerating — see §6 item 2.
2. The rescan lock itself (below) had a genuine TOCTOU race letting two near-simultaneous requests both pass the lock check. Fixed with an atomic conditional update.
Neither fix closed a **smaller, distinct gap** (1.9-3.4s, not 19-55s) that kept reproducing afterward, including on a confirmed single, non-double-clicked rescan. Diagnostic tracing (`commentary_gen_invoked_at`, `commentary_gen_saw_pagespeed_at`, `commentary_gen_saw_tbt`, `commentary_gen_saw_speed_index` in `generate-commentary/route.ts`; `commentary_readiness_saw_pagespeed_at` in `dataforseo-enrichment/route.ts`) was added to capture what the readiness poll's read and `generate-commentary`'s own separate fresh read actually each observed, since the existing two timestamp columns can't distinguish "the poll's own read was already wrong" from "something changed between the poll and generation" from "generation read correctly and the bug is elsewhere entirely." **Not confirmed applied, no real trace captured yet** — needs one single deliberate rescan on a fresh prospect once the migration is run.

**Rescan lock.** `prospects.rescan_locked_at` (timestamptz) prevents two rescans (or a rescan and a regenerate) from interleaving their writes on the same prospect. `rescan/route.ts` now acquires it via a single atomic `UPDATE prospects SET rescan_locked_at = now() WHERE id = $1 AND (rescan_locked_at IS NULL OR rescan_locked_at < staleness_threshold) RETURNING id` (via `.update().eq().or().select()`) — checking the returned row count instead of a separate SELECT-then-check-then-UPDATE, which is what let two near-simultaneous requests both see the lock as clear before either committed (see freshness investigation above). Staleness fallback still 120s (`RESCAN_LOCK_TIMEOUT_MS`) so a crashed invocation can't orphan a prospect forever. Cleared by `generate-commentary/route.ts`'s try/finally on every exit path, or explicitly on a readiness timeout (above). **`lib/rescan-lock.ts` (`checkRescanLock` / `setRescanLock` / `clearRescanLock`, used by `regenerate-commentary/route.ts` and the one-time `regenerate-commentary-cleanup/route.ts`) still has the old, unfixed SELECT-then-UPDATE race** — flagged, not fixed this pass, lower severity since that path never re-fetches PageSpeed so it can't reproduce the freshness bug specifically. **Note: no lock, old or new, retroactively fixes data already corrupted by a pre-lock race** — `cake-in-a-box` was abandoned rather than untangled for exactly this reason.

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

### LLM Visibility Check (shipped, iterated heavily this pass)
Shows the prospect exactly what ChatGPT, Claude, and Perplexity say when asked a real customer question about their category — the whole point is surfacing "AI assistants recommend your competitors over you" as a concrete, current, screenshot-able finding.

- **Query construction** (`buildLlmVisibilityQuery()` in `lib/llm-visibility.ts`): tiered — reuses `detectLocalTarget()` (below) to check if a city is already resolvable from `location`/`niche`, in which case `"best {niche}"` needs no location inserted (true for every real prospect checked); otherwise appends `"in Australia"` (`LLM_VISIBILITY_MARKET` in `lib/config.ts`). Confirmed against 4 real prospects' actual stored niche values before building, not guessed.
- **Fetch** (`dataforseo-llm-visibility/route.ts`): fires `ai_optimization/{chat_gpt,claude,perplexity}/llm_responses/live` in parallel, synchronous (same pattern as `dataforseo-gmb-qa`, not the `task_post`/webhook pattern), wired into both `create` and `rescan` fan-outs. Not part of the commentary readiness gate. Real field shapes confirmed via DataForSEO's own docs before writing extraction code (`result[0].items[].sections[].text` for the answer, `result[0].money_spent` for real per-call cost, not the flat pricing-sheet figure) — this is the one place this pass a live diagnostic route would have helped, and one briefly existed for it (`diag-ai-visibility-temp`, deleted as housekeeping before the real build started).
- **Mention detection** (`detectMention()` in `lib/llm-visibility.ts`): case-insensitive substring search for brand name and/or domain (via `normaliseDomain()`, shared with competitor self-exclusion — this is free-text search, not domain-to-domain comparison, so it's adapted rather than reused verbatim). Stores per provider: query, full response text, `found`, matched snippet, cost, timestamp.
- **Competitor extraction/ranking** (`extractCandidateNames()` / `extractCompetitorRanking()` / `buildResponseSummary()`, all in `lib/llm-visibility.ts`): heuristic, not real NLP — there's no existing "extract unknown proper nouns from prose" utility to reuse. Bold markdown spans first (providers reliably bold recommended names), a Title-Case regex fallback for responses with no bold formatting at all (both confirmed necessary against real response shapes). Filters, each added after a real false positive was found live, not guessed in advance: a proper-noun-shape check, an "every word is generic" reject (food/flavour/occasion words, AU geography, common list-topic labels like "Occasion"/"Best for Sydney:" — three genuinely different categories, not one list), a leading-stopword strip ("Named X" → "X"), self-exclusion against the prospect's own brand. **Known, disclosed, not-fixed limitations**: "and" is ambiguous between an internal name connector and a boundary between two names (can occasionally mis-split); a real business whose every word happens to be generic ("CBD Cakes") gets filtered too, an accepted cost given the explicit bias toward under- over over-extraction; individual Sydney suburb names (not covered by the city-level `AU_CITY_MAP`) aren't recognised as geography. Audited against every real `llm_visibility_results` row in the DB at the time (6 prospects), not just the one case originally reported, before considering the filter fixes done.
- **Render** (`ReportClient.tsx`): hero stat panel ("N/{respondedCount} AI assistants recommended you" — denominator is providers that actually responded, not a hardcoded 3, so a failed provider reads "/2" not a false "/3") + ranked competitor bar chart (bar width proportional to the top entry's count, not hardcoded) + three re-skinned provider cards (badge, mentioned/not pill, one-line deterministic summary built from the same extraction, "read full response" reveals the complete markdown-rendered text — no truncation of response content anywhere, collapsed or expanded). Built to a Claude-Design handoff (option "1b — split hero"); the section title reuses this report's own existing `.sec-title` system rather than the handoff's standalone hardcoded values, for consistency with every other section's heading rhythm.
- **Markdown rendering**: all three providers can return markdown (confirmed live — Claude did, ChatGPT's clean-looking test response was incidental). Uses `react-markdown` (no existing renderer in this codebase) with inline-styled component overrides. Two bugs found and fixed while verifying: react-markdown injects a `node` prop into every custom component that must be destructured out before spreading onto a native element (needed an `ignoreRestSiblings` ESLint rule addition — the default flags the resulting unused destructured name); the matched-snippet's fixed extraction radius can cover nearly all of a short response, duplicating the full response's content in what's meant to be a one-line highlight (now suppressed when the snippet isn't meaningfully shorter than the full text).
- **Wired into Priority Actions** (`generate-commentary/route.ts`'s `priorityUserPrompt`): mention count + top competitor names named instead, feeding a system-prompt rule that this should generally rank as the top priority when the finding is bad — prompt guidance for the model's judgment, not a deterministic code-level override. Omitted from the prompt entirely (not "N/A") when there's no data. **Verified: prompt construction only** (four scenarios, no live API call touched). **Not yet verified: actual model behavior** — does Claude really rank it first when bad, does it stay in the background when good. Needs a real Anthropic call against real prospect data via Adam (see §6).
- **Schema**: `audit_data_cache.llm_visibility_results` jsonb — **confirmed applied**, real data fetched from 6 live prospects mid-pass.

### Relevant Pages (shipped, not yet verified against live data)
Shows which specific pages on the prospect's own site earn organic visibility, surfacing traffic concentration ("94% of your organic visibility sits on your homepage alone") as a distinct content-gap finding.

- **Fetch**: `dataforseo_labs/google/relevant_pages/live` added to `dataforseo-core/route.ts`'s existing Phase 1 parallel batch (same category of Labs call as the six already there — `domain_rank_overview`, `ranked_keywords`, `serp_competitors`, `bulk_traffic_estimation`, `domain_intersection`, `keywords_for_site` — not a new route). Real field shapes confirmed via DataForSEO's docs before writing code: `page_address` for URL, `metrics.organic.etv`/`.count` per page, a `result[0].total_count` distinct from the capped `items` array. `location_code` kept at 2036 (national), matching the scope `domain_rank_overview`/`ranked_keywords` already use, so the concentration stat doesn't mix scopes with the report's other organic numbers. `limit: 100`, sorted by ETV descending.
- **Concentration stat** (`resolveRelevantPagesConcentration()` in `lib/relevant-pages.ts`): computed at render time from the raw stored array, same "one shared function, never a second stat column that could drift" pattern as `resolveOrganicStats()` below. Returns `null` (section hides, no placeholder) when there's no data or no real combined ETV to compute a share from. Scoped honestly to "the top 100 pages DataForSEO returned," not a literal unbounded total — documented in code, not hidden.
- **Render**: headline stat + ranked table (page path, keyword count, est. traffic), reusing this report's existing card/table visual conventions (no design handoff for this feature, unlike LLM Visibility). Verified via 3 synthetic scenarios rendered through the actual live component locally (concentrated, distributed, no-data) — **not yet verified against a real prospect's live data**.
- **Wired into Priority Actions**: one context line (the concentration percentage), explicitly instructed as background context only, not a mandated standalone priority item.
- **Schema**: `audit_data_cache.dataforseo_relevant_pages` jsonb — **not confirmed applied**.

### Supabase schema

**`prospects`**
- `slug` (UNIQUE), `brand_name`, `store_url`, `prospect_email`, `prospect_name`, `niche`, `cta_link`, `created_at`, `last_accessed_at`, `access_count`, `is_active`, `rescan_locked_at` (timestamptz, nullable — confirmed migrated), `location`, `gmb_cid` — **the latter two are live in the DB and used by the app but are not tracked anywhere in `supabase/schema.sql`**, same gap as `monitored_domains` below. Confirmed still missing this pass; worth adding alongside it.

**`audit_content`**
- `prospect_id` FK, legacy section fields, `ai_performance_commentary`, `ai_cro_commentary`, `ai_seo_commentary`, `ai_opportunity_commentary`, `ai_closing_commentary`, `ai_priority_list` JSONB, `hook_headline` JSONB, `score_descriptions` JSONB, `ai_gmb_commentary` JSONB (`{ rating_framing, review_patterns }` — declared `text` in the Phase 2 migration, changed to `jsonb` in a later migration block once Phase 4 needed two fields — **schema change not confirmed run**, see §6)

**`audit_data_cache`**
- `prospect_id` FK (UNIQUE), `pagespeed_mobile`, `pagespeed_desktop`, `dataforseo_overview` JSONB (includes `keywords_total_count` — see "DataForSEO notes"), `dataforseo_keywords`, `dataforseo_gaps`, `dataforseo_competitors`, `dataforseo_serp_features` JSONB, `dataforseo_content_gap` JSONB, `dataforseo_keyword_trends` JSONB, `backlinks_summary` JSONB (always null — no subscription), `google_ads_planner`, `meta_ads`, `cro_checklist`, `gmb_data` JSONB (**also live but untracked in schema.sql**, see above), `crawled_at`, `pagespeed_fetched_at`, `commentary_readiness_status` / `_ms` / `_at` (text/integer/timestamptz — **confirmed applied**, no longer a no-op), `gmb_reviews` / `gmb_reviews_status` / `gmb_reviews_task_id` / `gmb_reviews_fetched_at`, `gmb_qa` / `gmb_qa_fetched_at`, `gmb_updates` / `gmb_updates_status` / `gmb_updates_task_id` / `gmb_updates_fetched_at` — **confirmed applied**, and added this pass: `llm_visibility_results` JSONB — **confirmed applied**; `dataforseo_relevant_pages` JSONB, `commentary_gen_invoked_at` / `commentary_gen_saw_pagespeed_at` / `commentary_gen_saw_tbt` / `commentary_gen_saw_speed_index` / `commentary_readiness_saw_pagespeed_at` (timestamptz/numeric, diagnostic tracing for the freshness investigation, see above) — **not confirmed applied**

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
5. Google Business Phase 4: `ALTER COLUMN ai_gmb_commentary TYPE jsonb` — **drafted, not confirmed applied.** `ai_gmb_commentary` was never written to by any code before this block existed, so this is a safe type change with no data to convert whenever it does get run.
6. LLM Visibility Check: `audit_data_cache.llm_visibility_results` jsonb — **confirmed applied** (real data fetched from 6 live prospects mid-pass, dumped and audited for false positives).
7. Relevant Pages: `audit_data_cache.dataforseo_relevant_pages` jsonb — **drafted, not confirmed applied.**
8. Freshness-investigation diagnostic tracing: `audit_data_cache.commentary_gen_invoked_at` / `commentary_gen_saw_pagespeed_at` / `commentary_gen_saw_tbt` / `commentary_gen_saw_speed_index` / `commentary_readiness_saw_pagespeed_at` — **drafted, not confirmed applied. This is the most urgent outstanding migration as of this writing** — the next session's top priority (a real single-rescan trace) depends on it being run first. Safe to drop once the freshness mechanism is confirmed and fixed.

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

**These two constants are also the exact mechanism behind the 2026-09-15 Local Service finding** — see the "Local Service audit mode" subsection further down. The ~67x drift above was two copies of an ecommerce revenue formula disagreeing with each other; the Local Service finding is that the formula itself, even correct and consistent, is an ecommerce-only assumption with no meaning for a non-ecommerce business. Piece 1 in §6 makes `ASSUMED_AOV` configurable per prospect rather than fixing the drift again.

**AOV is now per-prospect (shipped `9ce6228`, 2026-09-15).** `prospects.aov numeric` (nullable; migration `ALTER TABLE prospects ADD COLUMN IF NOT EXISTS aov numeric` was run by Adam). Set it on `/audit/admin/new` or the Edit Audit page; `create-prospect.ts`, `admin/create` and `admin/update` write it. `ReportClient.tsx` derives `const aov = prospect.aov ?? ASSUMED_AOV` and uses it at all five call sites (three `revCalc` initiatives, the "What this costs you" box and its printed "$X AOV" caption). `ASSUMED_AOV = 150` is now only the fallback, and `ASSUMED_CONVERSION_RATE = 0.015` is still fixed. Existing prospects with a null `aov` behave exactly as before. Because `lib/supabase.ts` is untyped, a missing column never fails the build - it only fails at runtime.

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
META_CAPI_ACCESS_TOKEN             (Meta Conversions API; used by lib/meta-capi.ts; confirmed working in Production)
ANTHROPIC_API_KEY
NEXT_PUBLIC_SITE_URL=https://kliks.com.au
ADMIN_JWT_SECRET
PAGESPEED_SERVICE_URL
```
`SUPABASE_SERVICE_ROLE_KEY` is marked Sensitive in Vercel — pulling env vars via CLI returns it empty. Use Vercel dashboard to read it if needed. **Standing rule: never attempt to work around this or pull the key another way.**

### Local Service audit mode — scoped, not built (2026-09-15 diagnostic)

The report template above (`ReportClient.tsx`, the AI commentary prompt, the CRO checklist, the competitor-extraction denylist) has only ever been built and tested against ecommerce/food-service prospects. A real diagnostic against a live non-ecommerce prospect (`mactrans-2` — a Gold Coast freight/haulage company, real inbound lead, real data, see §5) confirmed it is not ready to send to anything outside that niche. Findings, each independently verified against real stored data, not assumed:

1. **Hardcoded ecommerce revenue model, highest severity.** `ReportClient.tsx:29-30` hardcodes `ASSUMED_CONVERSION_RATE = 0.015` and `ASSUMED_AOV = 150`. Every dollar-impact figure on every report — the hero "Revenue you could be capturing" number and all three "what this is costing you" line items — is `traffic × 1.5% × $150 × 12`, regardless of what the business actually sells. It's not just used silently either: the report prints "...1.5% baseline CR, $150 AOV" directly on the page. For Mactrans this fired for real and would have shown a B2B freight operation an AOV assumption that describes a $150 online order.
2. **Retail language hardcoded into fixed (non-AI) template copy.** The hero fallback subtext, hero caption, and Scorecard section lead all say "store", "shoppers", "orders", "products" as static JSX text, not conditioned on niche.
3. **The AI commentary prompt itself pushes retail framing** (`generate-commentary/route.ts`) — it literally tells the model the business is "a {niche} **store**", benchmarks against "**stores** this size", and repeatedly instructs it to write about "**shoppers**". Correcting niche interpolation alone will not fix this; the prompt's own scaffolding vocabulary has to change.
4. **`AU_CITY_MAP` (`lib/local-target.ts`) has no entry for Gold Coast, or any non-capital city** — only the 8 state capitals are recognised. Empirically confirmed live consequence, not theoretical: Mactrans' stored `niche` is "freight company Gold Coast" with `location` null, which resolves non-local, which (a) produced the awkward LLM-visibility query `"best freight company Gold Coast in Australia"` instead of a real local query, (b) sent competitor/keyword discovery to the generic Australia location code (`2036`) instead of anything Gold-Coast-specific, and (c) caused "Gold Coast" itself to get extracted as a fake AI-recommended competitor in the generated priority list (`GENERIC_PLACE_TERMS` is built directly from `AU_CITY_MAP`, so a city missing from the map isn't filtered there either). Deliberately **not bundled into the Local Service build below** — Adam's call, timing undecided, revisit once Local Service audits actually start going out to non-capital-city prospects.
5. **The CRO checklist has ~7 ecommerce-only checks** (Sticky Add-to-Cart, Cart Count Indicator, Quantity Selector, Product Image Gallery, Related Products, Product Schema Markup, and the product-page framing of Reviews/Trust Badges) that can't meaningfully pass or fail for a service business. Mactrans' "4 of 20, 6 critical" CRO score is inflated by checks that don't apply to it at all.

**What's already fine, no changes needed:** the LLM-visibility query builder's core string interpolation, the Relevant Pages concentration math, the GBP/review commentary prompt, and the competitor-extraction mechanism itself (only its food-specific denylist needs a Local Service equivalent).

**Scoped build, not started, two independently shippable pieces:**
- **Piece 1 — configurable AOV (ecommerce only). DONE (`9ce6228`, live) - see §4 Revenue model.** Original scope: small. Add an AOV input on the audit creation page, replace the hardcoded `$150`/`1.5%` with a per-prospect value, sensible `$150` fallback when left blank. Fixes the "an $86-AOV cakery gets the same revenue number as everyone else" problem without needing the mode split below.
- **Piece 2 — a real "Local Service" audit type.** Large — Adam's own estimate is the same scale as the Audits/Pipeline unification (`87941d4`), and that's a fair sizing: it touches the DB schema, at least four separate admin create/edit surfaces (`admin/new`, `admin/pipeline`, `admin/outreach`, `admin/[slug]/edit`, all of which currently duplicate niche/location fields independently), a real reordering of report sections (not just a text swap — ranking/visibility findings lead instead of a dollar hero, no revenue figure at all, a new leads-lost estimate as supporting context only, no dollar value attached to it), a genuinely separate AI prompt instruction set (tested against Mactrans as the real test case), and a Local Service equivalent for the competitor denylist (or a more general non-industry-specific baseline — undecided, worth deciding during the build). Build order: diagnose exact schema/copy touchpoints first (this section is the starting point, not the finish line — the copy sweep above was not exhaustive over all ~2000 lines of `ReportClient.tsx`), then schema + dropdown, then template copy branch, then prompt branch, then denylist.

---

## 4A. Growth Audit Landing Page

Public lead-gen funnel, not the same product as the Audit Portal above — this one has no prospect record, no admin creation step, no cold outreach. A visitor lands on it from an ad, fills in a form, and becomes a new `prospects` row via the same `create-prospect.ts` used elsewhere.

### What it is
- **Variant A** — `audit/app/page.tsx`, the original build (`8778fd9`, 2026-08-28), dark theme.
- **Variant B** — `audit/app/b/page.tsx` + `audit/app/b/VariantBNav.tsx` (a client component for the mobile hamburger menu), added `7742d50` (2026-09-09), light theme, sales-focused copy, its own scrolling logo marquee.
- Both variants share `audit/app/GrowthAuditForm.tsx` (the actual lead-capture form) and post to `audit/app/api/audit/apply/route.ts`, which creates the prospect record, fires the server-side Meta CAPI Lead event, and returns success/failure. The client then fires the browser Meta Pixel Lead event and a fire-and-forget POST to Web3Forms for the notification email (Web3Forms only accepts client-side submissions on the free plan — the CRM write above is the real source of truth, the email is just a notification).

### A/B split mechanism
- `audit/middleware.ts` matches only the exact path `/` (i.e. public `/audit`) — a first-time visitor gets a random 50/50 assignment, set as a 30-day `kliks_audit_variant` cookie, and the matched variant is rewritten in server-side (not client redirected). The same visitor always sees the same variant on return.
- `audit/lib/growth-audit-cap.ts` computes the monthly cap/remaining-spots figure shown on both variants; fails open (shows full availability) if the Supabase query errors, rather than blocking the page.
- **Direct QA link, unaffected by the split:** `kliks.com.au/audit/b` always serves variant B regardless of cookie, because the middleware only matches the exact root path — confirmed live, no extra code needed for this.
- Every lead is tagged with which variant it came from, end to end: `variant` field in the `/api/audit/apply` POST body → `prospects.application_data` (Supabase) → outreach notes → the Web3Forms notification email's subject line and body (`landing_page: "Variant B"`) → a `variant` param on the GA4 `generate_lead` event. This is how conversion between the two variants actually gets compared — there's no dashboard for it, check the email subject lines or query `application_data`.

### A/B split: NOT actually running in production (found 2026-10-07)
Everything in "A/B split mechanism" above describes the *intent*. In production, every visitor to `kliks.com.au/audit` gets variant A, and nothing sets `kliks_audit_variant`:
- Five fresh requests all returned `x-vercel-cache: HIT` with **no `set-cookie`**, even with a cache-busting query string, and sending `Cookie: kliks_audit_variant=b` returned a byte-identical page (115,677 bytes). Cause: `audit/app/page.tsx` has no dynamic API use, so Next prerenders it and Vercel serves the static HTML from the CDN without invoking `middleware.ts`. (Same mechanism as the "static route silently bypasses live logic" gotcha in §8.)
- `middleware.ts` *is* compiled (`ƒ Middleware 26.4 kB` in the build output) - locally under `next start` the cookie does switch variants - but it never ran on Vercel for this route.
- **The obvious fix, `force-dynamic`, breaks `/audit`** (incident 1 in the 2026-10-07 banner), and it's unknown whether Vercel deploys `audit/middleware.ts` at all under the legacy `builds` + `routes` config (Vercel's docs say middleware is auto-discovered at the project root; this repo's lives in `audit/`).
- **Current workaround:** split ad traffic by hand - one ad set to `kliks.com.au/audit` (A) and one to `kliks.com.au/audit/b` (B). Both URLs work directly; every lead is already tagged with its variant (see above), so results can still be compared by email subject line.
- **Options if the automatic split is wanted:** (a) keep the manual split, (b) fix it properly on a preview branch with request-level testing (many GETs, cookie forced both ways), (c) migrate off the legacy `builds`/`routes` config. Do not retry (b) by pushing to `main`.

### Conversion tracking on the audit form
`GrowthAuditForm.tsx` (shared by A and B) on `/api/audit/apply` success: browser `fbq('track','Lead', {content_name:'Growth Audit Request'}, {eventID})` (the matching server CAPI call is inside the apply route), GA4 `generate_lead` with the variant, the Web3Forms notification, then the Google Ads AUDIT conversion; the redirect to `/audit/thank-you` waits for the Google hit (1s cap). The apply route creates a real Supabase prospect, so **never submit it on production to test**.

### Bugs found and fixed this pass (all confirmed live)
- **Invisible CTA text**: `.vb-root a { color: var(--orange); }` (a class+tag selector) beat `.vb-btn { color: #fff; }` (a single class) on specificity, rendering the final CTA button's text orange-on-orange. Same trap caught the nav wordmark link (`.vb-wordmark` as a plain class also lost to `.vb-root a`) — fixed the same way, with a `.vb-root a.vb-btn`-style override that wins on specificity rather than relying on source order. **Watch for this pattern in any future `.dc.html`-handoff-style page that styles a bare `a { color: ... }` globally and then reuses `<a>` for buttons/wordmarks.**
- **Mobile hero-grid overflow**: `grid-template-columns: repeat(auto-fit, minmax(360px, 1fr))` forced a 360px minimum column width, wider than a 375px phone screen minus padding — content silently clipped at the edge on narrow phones. Fixed with `minmax(min(360px, 100%), 1fr)`.
- **Mobile logo-strip layout**: converted to a proper scrolling marquee (matches the request that prompted it), which incidentally also fixed a layout bug where the label and logo list shared one flex row and could squeeze logos into a narrow column on some viewport widths.
- **Missing variant tag on the notification email**: variant was tagged in Supabase but never made it into the Web3Forms email payload — fixed, now in both the subject line and body.

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
| `bakealicious-by-gabriela` (approx) | Bakealicious by Gabriela | Google Business Phase 2 end-to-end test case (reviews/Q&A/updates all confirmed landing); also this pass's primary LLM Visibility / Relevant Pages / freshness-investigation test case — one of the 3 prospects showing the still-unresolved small readiness gap. In the 12-prospect commentary regeneration list. |
| `enze` (approx) | Enze | One of the 3 prospects showing the still-unresolved small readiness gap this pass, alongside the older ~67x revenue-figure flag above |
| `sebastien-sans-gluten` | Sebastien Sans Gluten | Rescanned 2026-08-14, confirmed single/non-double-clicked — the test case that disproved the double-fire-race theory (see State-as-of banner). Good prospect to re-check once the freshness mechanism is actually understood. |
| — | Little Cake Box | Used for an earlier data-error diagnosis, still live |
| `cake-in-a-box` | Cake In a Box | **Discrepancy found this pass, not resolved:** earlier docs say this was deleted after a pre-lock concurrent-rescan race. A live SQL query this pass returned real `llm_visibility_results` data for a prospect at this exact slug, meaning it currently exists (recreated at some point, or this note was already stale). Don't assume either the "deleted" note or this prospect's data integrity — check `/audit/admin/dashboard` directly before relying on it for anything. |
| — | Cupcake Factory | Real audit created via a path that skipped `mark-converted` at the time — now fixed for all paths, but this specific prospect's `monitored_domains` row may still show un-actioned unless manually corrected or re-triggered |
| `test-brand` | Test | Dev testing, email: wearekliks@gmail.com |
| `mactrans-2` | Mactrans Gold Coast | Real inbound freight/haulage lead, real prospect record (`niche: "freight company Gold Coast"`, `location: null`). The 2026-09-15 Local Service diagnostic's real test case — see §4's new subsection. **Its actual sent audit is not this prospect's `/audit/mactrans-2/report` page** — that template is confirmed wrong for this niche. A hand-built one-off static page was shipped instead at `/mactrans.html` (client-side email-gated to `geoffpro@yahoo.com.au`), entirely outside the normal pipeline. Don't generalize that page into a template; don't assume the real `/audit/mactrans-2/report` page is what Geoff was actually sent. |

**`raw-passion`** (Raw Passion, vegan bakery, created 2026-09-02) - the 2026-09-23 "commentary doesn't match the scores" report. Diagnosed as a transient mid-scan view; stored content was fresh and matched the current PageSpeed data. Not an example of the unresolved freshness bug.

Also seen with real `llm_visibility_results` data this pass (from the false-positive audit, not independently verified beyond that): `miss-lillys-bakery-cafe`, `bonbons-bakery`, `the-cupcake-room`.

---

## 6. Pending Tasks

### Tracking follow-ups (added 2026-10-07; do these first)
**Adam, by hand (an agent can't do these):**
- [ ] **Google Tag Assistant on the live site** (tagassistant.google.com → add `https://kliks.com.au`). Submit `/book` and the homepage form (expect label `…EeRcCNSR85MdEO2l4JJC`) and `/patisserie` (expect `…qc76CJ3c6pMdEO2l4JJC`) with a throwaway email. If testing `/audit`, it creates a real prospect - delete it afterwards. This is the only real-browser proof the Google conversions fire; the Google Ads Conversions page cannot show it because test hits have no ad click.
- [ ] **Delete leftovers from the 2026-09-22/23 live tests:** `claude-capi-test…@example.com` profiles (up to two) on the Ad Junkies Klaviyo list, the test profile(s) on list `XqKPhV` (including Adam's own `adam.nagy.mm@gmail.com` test lead), and the "CLAUDE" test emails in `wearekliks@gmail.com`. The fake Meta events can't be deleted and are harmless. About 11 labelled Google Ads test conversions were also sent on 2026-10-07 between ~14:00 and 14:30 AEDT, none with a click ID.
- [ ] **Google Ads:** under Goals → Conversions → Summary, check the Status column of the AUDIT and CALL actions after the first real ad conversion (can lag a day or more), check that no other conversion action is keyed to `generate_lead` or form submit, and check the enhanced-conversions setting (the tag sends `ec_mode=a`, i.e. automatic user-provided data is on).
- [ ] **Before restarting the Meta campaign** (paused since 2026-09-13): run one test lead with Tag Assistant open and confirm `Lead` arrives in Meta Events Manager with browser + server deduped.
- [ ] **Decide on consent wording for `/book`.** Leads are now subscribed to email marketing in Klaviyo (Accepts Marketing = true) and the form has no consent text. Not legal advice - Adam's call. Also confirm `enquiry_comment` appears on the Klaviyo profile when a message is typed (it wasn't visible in the one screenshot checked).
- [ ] Optionally disconnect git from the paused `kliks.com.au` Vercel project, and confirm `META_CAPI_ACCESS_TOKEN` and the Supabase vars live on `kliks-au`.

**Engineering:**
- [ ] **GA4 `generate_lead` fires on every load of `thanks-booking.html` and `thanks-patisserie.html`** (it also reaches the Ads destination, unlabelled). Same double-count pattern already fixed for Meta; remove it from the thank-you pages (it already fires on submit success in `book.html`/`patisserie.html`). Also check Ads has no conversion action keyed to `generate_lead`.
- [ ] The Ad Junkies handler fires `generate_lead` to GA4 on newsletter signup, which the Ads destination also receives (unlabelled). Fine unless an Ads action keys off it.
- [ ] `privacy.html`: two "Free Strategy Call" buttons (nav and CTA) still link to `calendly.com/kliks-hu/30min` while the rest of the site uses `/book`. Repoint them, then delete the Calendly paragraph from privacy §03.
- [ ] Homepage contact form has no thank-you page, so no URL-based goals; optional `/thanks-contact`.
- [ ] A/B test on `/audit` does not run in production - options in §4A.
- [ ] Report page has no "scan in progress" indicator (viewers can see fresh scores with stale commentary mid-scan), and `audit_content.updated_at` is never written. Either set it in `generate-commentary` or drop it.
- [ ] Patisserie uses the AUDIT conversion label; split it into its own Ads conversion action if Adam wants it reported separately.
- [ ] `HANDOVER.md` and `PROJECT.md` still mention Formspree/Calendly flows in places; `PROJECT.md` is older than this file - trust this file.

### Priority order (older audit-portal items, as of 2026-09-15; not re-verified since)
1. **The rescan/commentary-freshness investigation — top priority, in progress, not solved.** Run the diagnostic-tracing migration first (exact SQL in §4's "Freshness investigation" note / migration block 8 above), then trigger **one single, deliberate rescan** (not a double-click, one tab) on a fresh prospect not already in the affected-12 list. Query the new trace columns (`commentary_readiness_saw_pagespeed_at`, `commentary_gen_invoked_at`, `commentary_gen_saw_pagespeed_at`, `commentary_gen_saw_tbt`, `commentary_gen_saw_speed_index`) against the final `pagespeed_fetched_at` to see directly which stage diverges, instead of inferring from two timestamps like the last two passes did. Don't assume either of this pass's two fixes (readiness-field reset, atomic lock) was wrong to make — both were real, confirmed bugs and are correctly fixed — just that neither is *the* explanation for this specific, smaller symptom.
2. **Trigger the 12-prospect commentary regeneration** (`/api/audit/admin/regenerate-commentary-cleanup`, browser-console `fetch()` while logged into `/audit/admin`, exact snippet in the State-as-of banner), Miss Lilly's first — it's the one confirmed already sent to a real prospect. Delete the route once confirmed done for all 12.
3. **Confirm whether Enze, Cake Mail, and Miss Lilly's were actually rescanned** to correct the older ~67x revenue-formula error (separate from, and older than, item 1's investigation). Those reports are live at their URLs and any of those prospects could reopen them.
4. **Confirm the Phase 4 `ai_gmb_commentary` jsonb migration has actually been run** (`ALTER COLUMN ai_gmb_commentary TYPE jsonb USING ai_gmb_commentary::jsonb`, handed to Adam, not confirmed applied across two passes now) and verify `generate-gmb-commentary` produces real output end-to-end against production data.
5. **Confirm the `dataforseo_relevant_pages` jsonb migration** and verify the Relevant Pages section against a real prospect's live data — built and locally verified with synthetic data this pass, never checked against production.
6. **Verify LLM Visibility's actual wiring into Priority Actions against real model behavior** — a real Anthropic call is needed to confirm Claude genuinely ranks a bad AI-visibility result near the top of the generated priority list, and genuinely doesn't force a good result in. Prompt construction is verified; model judgment isn't.
7. Fix the same TOCTOU lock race in `lib/rescan-lock.ts` (used by `regenerate-commentary`) that was just fixed in `rescan/route.ts` — flagged as a spawned task this pass, lower urgency since that path can't reproduce the freshness bug.
8. **Fix `NEXT_PUBLIC_SITE_URL` for background jobs** before it causes the same "nothing fired, no error anywhere" confusion on the next new route. Proposed shape: use `VERCEL_URL` (Vercel's own automatically-provided current-deployment URL) for internal job-to-job calls, but keep `postback_url` (anything an external service like DataForSEO needs to reach) pointed at production regardless — an external service can't reach a protected preview URL no matter what this env var says.
9. Add `create table if not exists` / `ADD COLUMN IF NOT EXISTS` blocks to `supabase/schema.sql` for everything confirmed live-but-untracked: `monitored_domains`, `prospects.location`, `prospects.gmb_cid`, `audit_data_cache.gmb_data`.
10. `keywords_total_count` null root cause — confirmed intermittent (some prospects get a real count, others the capped-50 fallback), not yet root-caused.
11. Store URL normalization on save — a pasted ad-click URL currently surfaces as-is in a client-facing report rather than being cleaned to a bare domain.
12. Resolve the `cake-in-a-box` discrepancy noted in §5 — earlier docs say deleted, real data this pass says it exists. Check the admin dashboard directly.
13. Re-check whether the DataForSEO `40501 Invalid Field: location_code` error and `dataforseo-enrichment`'s own ~60s Vercel timeout warning still recur — both flagged early on, neither addressed, both may be stale given how much has changed since. **Partial update:** `64f2abd` (2026-08-17, in the undocumented gap) corrected wrong `location_code` values for the 8 existing AU cities in `AU_CITY_MAP`, which may well have been this exact 40501 error's cause — but that fix did not add coverage for any city outside those 8, see item 17 below. Whether the original 40501 symptom is actually gone is still unconfirmed.
14. Danielle's onboarding — blocked on the above being solid; revisit once the freshness investigation and Phase 4 migration are both confirmed and a few more real audits have been sent.
15. Decide whether to add a root-level `CLAUDE.md` so a fresh thread can orient itself without a full HANDOVER.md read — discussed two passes ago, not yet built, waiting on Adam to confirm he wants it.
16. ~~**Piece 1 — configurable AOV field (Ecommerce audits).**~~ **DONE 2026-09-15 (`9ce6228`, live).** See §4 Revenue model.
17. **Piece 2 — Local Service audit type.** Large, not started, scoped in full in §4. Explicitly does not include item 18 below (Adam's call).
18. **`AU_CITY_MAP` missing Gold Coast / any non-capital city** — deprioritized as a separate task from Piece 2, timing undecided, but now confirmed to have actually bitten on a real prospect (see §4). Revisit once Local Service audits are actually going out to non-capital-city prospects.

### Infrastructure
- [ ] Add `PAGESPEED_SERVICE_URL` as proper Vercel env var (hardcoded fallback works but is untidy)

### Copy / URLs
- [ ] Calendly is no longer used by `book.html` or `ad-junkies.html`; the only remaining links are the two stale buttons on `privacy.html` (see Tracking follow-ups)

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

**Lead tracking pass (2026-09-15 → 2026-10-07):**

| Hash | Message |
|---|---|
| `82ed2ea` | docs(privacy): strategy call form now really adds leads to Klaviyo |
| `6a3f203` | fix(book): actually add strategy-call leads to the Klaviyo list |
| `11464b0` | docs(privacy): name every third party that gets visitor or form data |
| `de0712b` | feat(ads): Google Ads conversion tracking on audit + call form success |
| `935d65d` | Reapply "feat(pixel): server-side Meta CAPI for contact forms + newsletter, fix double-fires" |
| `68763d2` | fix(routing): add explicit / -> /index.html rule to vercel.json |
| `eb419d0` | Revert of `6cfc536` (turned out not to be the cause of the 404s; reapplied above) |
| `6cfc536` | feat(pixel): server-side Meta CAPI for contact forms + newsletter, fix double-fires |
| `233a668` | Revert "fix(audit): force dynamic rendering on / so A/B middleware actually runs" |
| `c9087d1` | fix(audit): force dynamic rendering on / so A/B middleware actually runs (BROKE `/audit`, reverted) |
| `9ce6228` | feat(audit): add per-prospect AOV field, replace hardcoded $150 |

**2026-09-15 (earlier pass):**

| Hash | Message |
|---|---|
| `f2c6212` | feat: gate Mactrans audit behind an email check, drop his own email from CTA |
| `bb67c7e` | feat: add one-off Mactrans growth audit page |

**This pass (2026-09-09, Growth Audit variant B):**

| Hash | Message |
|---|---|
| `4740262` | fix(audit): show which landing page variant a lead came from in email |
| `8c7467e` | feat(audit): copy tweaks, scrolling logo marquee, nav hamburger for variant B |
| `468591e` | fix(audit): fix invisible CTA text, mobile logo stacking, and city |
| `2a06041` | feat(audit): add Occasionly and Magniscan to variant B logo strip |
| `7742d50` | feat(audit): add A/B split for Growth Audit landing page (variant B) |

**The undocumented month (2026-08-14 → 2026-09-09), not individually narrated above — see §4A for what the Growth Audit landing page looks like today rather than treating this as a build log:**

| Hash | Date | Message |
|---|---|---|
| `17dc22c` | 08-08 | feat(seo): add missing pages to sitemap, structured data to case studies |
| `fde33f7` | 08-08 | fix(audit): remove phone field, correct ad spend figure to $7.5M |
| `d613dcf` | 08-07 | feat(audit): add GA4 + Clarity tracking, mid-page CTA, copy fix |
| `fd1c54b` | 08-06 | fix(audit): fix hard-clipped hero glow creating a sharp line on mobile |
| `535a830` | 08-06 | feat(audit): rewrite Growth Audit page copy and layout for cold traffic conversion |
| `a6c1d5c` | 08-05 | feat(audit): add logo marquee to Growth Audit and thank-you pages |
| `804b595` | 08-04 | feat(audit): add dedicated thank-you page, fix missing background orbs |
| `8352900` | 08-04 | fix(audit): use a real navigation to reach /audit/thank-you, not router.push |
| `a11b31f` | 08-04 | fix(pipeline): close monitored_domains sync gap, guard discover endpoint |
| `cc8eaba` | 08-31 | fix(case-studies): remove Claude mention from Magniscan build details |
| `e698c03` | 08-30 | feat(case-studies): add Magniscan as a third built-in-house case study |
| `ed10a5a` | 08-30 | fix(case-studies): link closing CTA straight to the application form |
| `b19b6e2` | 08-30 | fix(homepage): size up Pupcases logo in case study cards |
| `aa08d12` | 08-30 | Merge pull request #1 from heytadeka/fix/vercel-static-png-assets |
| `5b75eca` | 08-30 | fix(deploy): include *.png in static builds so local images actually deploy |
| `b9a238d` | 08-30 | feat(homepage): add dedicated case studies page and brand logos to cards |
| `8981ed5` | 08-30 | feat(homepage): add Pupcases case study, tag Oh My Days as client work |
| `ec7fc2f` | 08-29 | fix(audit): differentiate hero from homepage, fix form contrast and mobile grid |
| `cefde9a` | 08-29 | feat(audit): support test_event_code for Meta CAPI verification |
| `9c52c59` | 08-29 | fix(audit): update Meta CAPI to v26.0 and match documented token placement |
| `be7100d` | 08-29 | feat(audit): add Meta Conversions API for Growth Audit form Leads |
| `bc987d2` | 08-29 | feat(audit): add Meta Pixel + Lead event to Growth Audit page, slim hero CTA |
| `3d2caed` | 08-28 | fix(audit): fix voice consistency and add homepage nav link on Growth Audit page |
| `d95915b` | 08-28 | feat(audit): add Form Request badge, keyword field, fix apply notification |
| `8778fd9` | 08-28 | feat(audit): build the Growth Audit landing page at /audit |
| `c3b0410` | 08-28 | fix(homepage): correct Oh My Days case study to vegan patisserie and cake delivery |
| `a52ad40` | 08-27 | feat(homepage): rewrite copy to founder-led growth-system positioning |
| `64f2abd` | 08-17 | fix(dataforseo): correct AU city location_codes causing recurring 40501 errors |
| `87941d4` | 08-17 | feat(audit): unify Audits into a real status/stage table with a shared detail panel |
| `0457149` | 08-16 | feat(audit): unify outreach status into a 5-stage model with a Viewed badge |
| `6476f79` | 08-16 | fix(audit): exclude already-opened prospects from Today's ready-to-reach-out list |
| `d21fcb1` | 08-14 | feat(audit): surface commentary-generation status on the edit page, raise readiness cap |

**Previous pass (2026-08-14, LLM Visibility / Relevant Pages):**

| Hash | Message |
|---|---|
| `2851429` | diag(audit): add tracing for the readiness/commentary-freshness investigation |
| `3127708` | fix(audit): make rescan lock acquisition atomic, closing the double-fire race |
| `d94efa6` | feat(audit): wire AI Visibility and Relevant Pages into priority-list prompt |
| `6340da5` | feat(report): add Relevant Pages traffic-concentration section |
| `0636f94` | fix(report): expand competitor-extraction false-positive filters after full DB audit |
| `75f6a44` | fix(report): reject generic dish/geography phrases from competitor ranking |
| `a183101` | feat(report): rebuild AI Search Visibility section per design handoff 1b |
| `e4a2178` | fix(audit): stop rescan readiness poll from firing commentary on stale PageSpeed data |
| `846c202` | fix(report): render LLM visibility responses as real markdown, not literal syntax |
| `50e563b` | feat(audit): LLM Visibility Check - what ChatGPT/Claude/Perplexity say about the prospect |

Note: the atomic-lock fix (`3127708`) and the tracing added on top of it (`2851429`) did **not** resolve the underlying symptom that motivated them — see §4's freshness-investigation note and §6 item 1. Both commits are still correct, verified fixes for the specific races they targeted; they're just not the whole story.

**Pass before that:**

| Hash | Message |
|---|---|
| `a906a00` | fix(audit): let to const in generate-gmb-commentary (prefer-const) |
| `cd7d5c5` | feat(report): Google Business Phase 4 - AI commentary on reviews, honest rating framing |
| `f795d21` | fix(report): truncate GBP review text on a word boundary, not mid-word |
| `6b8f4e1` | feat(report): Google Business Phase 3 - render reviews, Q&A, updates |

**Earlier:**

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

Everything before `a5d6066` (Stage Rivers board, Today tab, the original "Crawls Complete: 0" fix, the KLIKS Patisserie work) predates all passes above — treat as stable baseline, check `git log` directly if older context is needed rather than extending this table indefinitely.

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
- **A well-reasoned, verified-correct fix can still fail to resolve the actual reported symptom — don't assume it did without fresh evidence.** This pass's atomic rescan-lock fix genuinely closed a real TOCTOU race (confirmed via query construction, `.select('id')` row-count check, Postgres row-level serialization guarantee) — and a third real prospect (`sebastien-sans-gluten`) still reproduced the same symptom afterward on a confirmed single, non-double-clicked rescan. When a user reports "this is still happening" after a fix that should have worked, the right response is fresh tracing/instrumentation against real data, not a fourth plausible mechanism inferred from the same two timestamps that produced the first three theories.
- **Deleting a Next.js API route leaves a stale `.next/types` cache that makes `tsc` report phantom errors referencing the deleted route.** Happened twice this pass (temp diagnostic route, temp preview route). Fix: `rm -rf .next` before re-running `tsc` after any route deletion.
- **The PostgREST atomic-conditional-update pattern for closing TOCTOU races**: `.update({...}).eq('id', id).or('col.is.null,col.lt.<threshold>').select('id')`, then check `data.length === 0` to detect "someone else already held/updated it" — one round trip, no separate SELECT-then-UPDATE window for a race to land in. Used for `prospects.rescan_locked_at` in `rescan/route.ts` this pass; `lib/rescan-lock.ts` (used by `regenerate-commentary`) still has the older, unfixed read-then-write version — see §6.
- **`react-markdown` component overrides leak a `node` prop that must be destructured out** (`{ node, ...props }`) or it renders literally as `node="[object Object]"` in the DOM. The resulting unused `node` needs `"@typescript-eslint/no-unused-vars": ["warn", { "ignoreRestSiblings": true }]` in `.eslintrc.json` or the default rule flags it.
- **A stray `.env.local` at the repo root (outside `audit/`) is not read by anything in this codebase** — no `dotenv` dependency anywhere, and Next.js's own env loading is scoped to the `audit/` directory where `next.config.js` lives. One was found this pass containing live `ANTHROPIC_API_KEY` and Supabase credentials, confirmed never committed (`.gitignore`'s `.env*.local` pattern covered it, and a full git-history search found zero commits touching it), confirmed unused, and deleted without rotation. If a similar file turns up again: check gitignore coverage, search git history before assuming it's clean, confirm nothing reads it, then delete — don't rotate keys that were never exposed.
- **A bare `a { color: X }` rule combined with reusing `<a>` for buttons/wordmarks is a specificity trap, confirmed to have shipped invisible text twice on Growth Audit variant B (2026-09-15).** `.vb-root a { color: var(--orange) }` is a class+tag selector; a plain single class like `.vb-btn { color: #fff }` or `.vb-wordmark { color: var(--ink) }` loses to it regardless of source order, because specificity is compared before falling back to declaration order. Fix is to bump the override's own specificity (`.vb-root a.vb-btn { color: #fff }`), not to reorder the CSS. Check for this pattern in any new page that styles anchors globally and then reuses `<a>` for something that needs a different color.
- **A hardcoded per-niche assumption (a dollar figure, a checklist item, a prompt's own vocabulary) doesn't announce itself as niche-specific until tested against a real prospect outside the niche it was built for.** The entire report template, AI prompt, and CRO checklist were built and tested only against ecommerce/food-service prospects and passed every check for a year of that — the ecommerce-only assumptions (a `$150`/`1.5%` revenue model, "store"/"shopper" language baked into a prompt's own instructions, ecommerce-specific CRO checks) were only found by deliberately running a real non-ecommerce prospect through it. See §4's Local Service subsection. Same shape as the "the same number computed in more than one place, silently drifting apart" gotcha above — an assumption baked in once, silently wrong for every case it wasn't built for.
- **A city-detection map that only covers the largest N cities silently fails for everything outside it, and the failure mode isn't an error — it's a plausible-looking wrong answer.** `AU_CITY_MAP` covering only the 8 state capitals meant a real Gold Coast prospect's geo-targeting silently fell back to national scope, and its LLM-visibility query silently became a mechanically awkward one, with no error or log line marking either as degraded. Confirmed on real data, not theoretical — see §4 and §6 item 18. Worth checking for this same shape (a lookup table treated as exhaustive when it's actually "the common cases") anywhere else in the codebase that maps free text to a fixed set of known values.

- **A fully static (prerendered) route is served from Vercel's CDN and silently bypasses `middleware.ts`.** `x-vercel-cache: HIT`, no `set-cookie`, and identical bytes regardless of cookie are the tell. This is why the `/audit` A/B split never ran. `force-dynamic` is NOT a safe fix here (it re-routes `/audit` to `[slug]` under the legacy `builds` + `routes` config). See §4A.
- **In `vercel.json`, bare `/` had no rule and flaked ~50%.** `/([^/.]+)$` can't match an empty path, so `/` leaned on an undocumented default. Routes are first-match-wins. Every route/render change needs request-level testing.
- **For intermittent routing bugs, one clean round proves nothing.** After a deploy the old deployment keeps answering for ~1-2 minutes, so failures taper off. Poll many requests (50+) over a few minutes and look for a clear transition to 100% clean. A single all-200 round of 5 happened mid-incident and was noise. Also use GET, not HEAD (`curl -I` returned 200 on `/` while GETs were 404ing), and add a random query string to dodge CDN caching.
- **Klaviyo client API:** `/client/form-submissions` does not exist (404; the browser shows a CORS error because the 404 has no CORS headers). To add someone to a list from the browser use `POST /client/subscriptions?company_id=…` with a list ID, `revision: 2026-07-15`, `Content-Type: application/vnd.api+json`. That call always subscribes (consent defaults to MARKETING), the phone must be E.164 or the whole request is rejected, and a preflight (`OPTIONS`) check with `curl` creates no record, so use it to verify an endpoint without side effects.
- **Meta's pixel (`fbevents.js`) sends nothing from automated browsers** (`navigator.webdriver`). In a headless test use a normal user agent and hide `webdriver`, and stub `facebook.com/tr` so nothing is sent.
- **Google Ads conversions don't appear in the Ads UI without an ad click ID.** An empty Conversions page after test hits is the expected, good result and also means that page can't prove the tag works - use Tag Assistant. `AW-17756066541` is already a destination inside the served `gtag.js` (`__dest_aw`), so only the `conversion` event is needed. One conversion is sent as a `googleadservices` `pagead/conversion` + `ccm/conversion` pair sharing one `random` ID, plus sometimes a `doubleclick` view-through twin with the same label: that is one conversion, not three. The tag also sends unlabelled `form_start`/`form_submit`/`generate_lead`/`gtag.config` events and `form-data` pings (`ec_mode=a`) to the Ads destination.
- **Any redirect that happens right after a submit must wait for the tracking calls**, or the browser cancels them on navigation. Pattern used in `book.html`, `patisserie.html`, `GrowthAuditForm.tsx`: redirect only when a minimum grace period, the Google `event_callback` (1s fallback) and, for `/book`, the Klaviyo request (1.5s cap) have all finished.
- **The static pages can't share a JS file** (`vercel.json` `builds` only lists `*.html`, `*.png`, `blog/*.html`, sitemap and robots), so small helpers are inlined per page.
- **Local testing recipe (no real records).** Serve the repo root with a tiny Node server that maps clean URLs (`/book` → `book.html`), forwards `/audit/*` (prefix stripped) and `/_next/*` to `next start` built from the branch (start it with `env -i` so no shell secrets leak in; `audit/.env.local` holds only PageSpeed keys), and 404s every `/api/*`. Drive it with Playwright in headless Chromium, stub Web3Forms, Klaviyo writes, `facebook.com`, `/api/meta-capi` and `/api/audit/apply` with `page.route`, abort GA4 `/g/collect` and Clarity, let `googleadservices`/`doubleclick` through only if you accept real (click-ID-less) Ads hits. Measure timing from the DOM `submit` event, not from Playwright's click (the pages use `scroll-behavior: smooth`, which adds seconds). Group Ads requests by `random` to count real conversions. The harness lived in a temporary scratchpad and was not saved; rebuild it from this description.
- **Local dev cannot reach Supabase** (`audit/.env.local` has only the two PageSpeed variables), so `[growth-audit-cap] availability query failed ... supabaseUrl is required` in local logs is expected and harmless, and anything that needs the database must be verified on a deployed environment or by Adam.
- **Submitting `/audit` creates a real Supabase prospect and a notification email; `/book` creates a Klaviyo profile and an email; every form creates Meta and Google events.** Delete test records afterwards, and prefer the stubbed local recipe above.
- **Meta Ads MCP connector** (when loaded) can read dataset `1875112903440305`: `ads_get_dataset_stats` with `aggregation: event` or `event_source` gives hourly counts split BROWSER/SERVER (this is how the 2026-09-13 stop was pinned down), `ads_get_dataset_quality` gives Event Match Quality, and `ads_get_dataset_details` gives `last_fired_time` (this summary field lags; prefer the hourly stats). Every Meta Ads tool call needs a `client_conversation_id` (20 random alphanumerics, reused for the whole conversation).
- **Footers are per page, not shared.** Each page carries its own `<footer>`, so a site-wide link means editing every page (the "Kliks brands" link was added to 16, see the 2026-11-05 block for the exceptions). When you add a page, copy a current footer. The `<a>` inside a footer shares the page's own link styling, so a plain anchor next to "Privacy Policy" needs no CSS.
- **Fontshare: one `<link>` per font family, never two families in one URL (found 2026-11-05).** `api.fontshare.com` sits behind a CDN (BunnyCDN) whose cache appears to key on only the first `f[]` value (plus `display`), ignoring the rest. Whichever request fills that key first wins. If a single-family `clash-display` request got there first, our `clash-display ... &f[]=satoshi` URL was served Clash-only, Satoshi never loaded and body text fell back to Helvetica. The cached copy lives 24h plus 7 days stale-while-revalidate, so it flipped on and off. The `800` weight was NOT the cause (Fontshare has no 800 face and silently ignores it; a fresh request for the old link returns both families). Proved with unused keys: `clash-display@300,600` alone, then the same plus Satoshi, returned Clash only. A single-family URL always contains its own family, so it cannot lose it. Fixed and live (2026-11-05, commit `b56eedb`) across 19 files (index, case-studies, book, booked, privacy, thanks-booking, 9 blog pages, 4 files in `audit/`). To check a page: in headless Chrome, `document.fonts` must list Satoshi as loaded and `CSS.getPlatformFontsForNode` on a paragraph should report a custom font, not Helvetica. To test the origin, never add a junk query parameter and trust it; use a new valid `display=` value. Related, fixed 2026-11-05 (`aa9088f`): on `case-studies.html` (the only page that puts `container` on the same element as another class) `.page-header`, `.cases` and `.cta-section` used a `padding` shorthand that wiped the container's side padding, so the heading and cards touched the screen edge at 1100px and below. They now use `padding-top`/`padding-bottom`, and `.container` is `max-width: 1196px` (1100 content plus 2 x 48 padding) so desktop width is unchanged. Rule: an element that also carries `.container` must never set the `padding` shorthand. Still true on this page at 900px and below: `.cases` and `.cta-section` get no top or bottom padding, because the later mobile `.container { padding: 0 24px }` shorthand resets it (left as it was, changing it would alter mobile spacing).
- **GitHub shows two commit statuses per push** (one per connected Vercel project); the paused `kliks.com.au` one reports "failure" by design now. Judge deploy health by the `kliks-au` status and by a read-only check of the live site.

---

## 9. Owner

**Adam Nagy** — `adam.nagy.mm@gmail.com` / `wearekliks@gmail.com`
Founder, Kliks Digital. Not a full-stack dev. Can push to git, edit Supabase SQL, use Vercel dashboard.
Communication style: direct, short, no fluff. Hyphens not em dashes. No bullet-point copy. Sends tightly-scoped, single-purpose requests — one bug or one feature per message, often with an explicit build order and an explicit instruction to stop and report back rather than guess when a diagnosis is ambiguous. Diagnose-first: expects a confirmed root cause (not a plausible one) before a fix is proposed, and expects "propose before building" to mean an actual stop, not a formality. On this pass he also asked for plain-English summaries ("what are we doing and why") when sessions got long, wants new work on a preview branch with an explicit "merge" from him before anything goes live, and does not want real records created by testing.
