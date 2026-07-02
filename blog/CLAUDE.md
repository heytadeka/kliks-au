# Kliks Digital Blog - Writing Rules

This file is auto-loaded by Claude Code when working in the blog/ directory. Follow every rule below without being asked.

---

## Brand config

- **Brand:** Kliks Digital
- **Site:** kliks.com.au
- **Voice:** Direct, confident, no fluff. Founder-to-founder. Short sentences. No warmup.
- **Audience:** Australian Shopify store owners spending on paid ads
- **Author:** Adam Nagy, Founder, Kliks Digital
- **Author photo:** `https://cdn.shopify.com/s/files/1/0733/0693/1363/files/adam-ads.gif?v=1776520792`
- **Primary CTA:** `/book` (Free Strategy Call, 30 minutes, no obligation)
- **Secondary CTA:** `/audit` (Free audit report)

---

## Copy rules (non-negotiable)

- **No em dashes. Ever.** Not in headlines, body, comments, captions, schema, or JSON. Use a hyphen (-) or comma instead. Before finishing any file, grep for `—` and `–` and remove every instance.
- **Australian English** in all body copy: optimisation (not optimization), colour (not color), behaviour (not behavior), recognise (not recognize), etc. URL slugs may use US spelling if that is the dominant search term.
- No bullet points in intro or hero copy. Prose only.
- No fluff openers ("In today's digital landscape..."). Answer the question in the first sentence.
- Specific numbers always beat vague claims. "70% of Shopify traffic is mobile" beats "most traffic is mobile".
- Cite sources inline where a stat benefits from attribution.

---

## Research process (run before every post)

Use the DataForSEO MCP (tools prefixed `mcp__b3286aa0-9ae5-46a6-8391-be3ba8a5d6d9__`):

1. `dataforseo_labs_google_keyword_overview` - AU location (location_name: "Australia", language_code: "en") for primary keyword and 4-6 variants. Check search volume, trend, difficulty, intent.
2. `serp_organic_live_advanced` - AU location, `people_also_ask_click_depth: 3`. Note: what's ranking, what gaps exist, which PAA questions to use in the FAQ block.
3. `dataforseo_labs_google_related_keywords` - for supporting keyword cluster.

Run all three in parallel.

---

## Post structure (every post, in this order)

```
<head>
  - Meta title (~55 chars), meta description (~155 chars with primary keyword)
  - Canonical URL
  - Open Graph tags
  - Article JSON-LD (author: Adam Nagy, publisher: Kliks Digital, datePublished)
  - FAQPage JSON-LD (use exact PAA questions from DataForSEO SERP research)
  - Facebook Pixel (ID: 1875112903440305)
  - Fonts: Clash Display + Satoshi (Fontshare) + Space Mono (Google Fonts)
</head>

<body>
  - grain + vignette divs (fixed, z-index 1)
  - Announcement bar (fixed, z-index 1001)
  - Nav (fixed, z-index 1000) - links to /#services, /#process, /#results, /#about, /blog, /book CTA
  - Mobile nav overlay
  - <main class="article-page"> (padding-top: 152px)
    - Article hero: [post-tag] + H1 with .accent span (italic + orange on key phrase) + post-meta (author, date, read time)
    - Article body (max-width 780px, centered):
      - Answer-first opening paragraph (first 150 words directly answer the post's core question)
      - 3-card stat row (.stat-row) with key numbers
      - H2 sections (question-style: "Why does...", "How do you...", "What is...")
      - Callout boxes (.callout) for key takeaways
      - Numbered reason list (.reason-list) or step list (.step-list) as appropriate
      - FAQ section (using exact PAA questions, full answers)
      - Author block (Adam's photo, name, bio)
      - CTA block (drives to /book or /audit)
  - Footer
  - Hamburger JS (3 lines)
</body>
```

---

## Typography (must match index.html exactly)

Global heading rule - include this in every blog post `<style>`:
```css
h1, h2, h3, h4 { font-family: 'Clash Display', sans-serif; letter-spacing: 0.01em; line-height: 1.18; }
```

| Element | Size | Weight | Notes |
|---|---|---|---|
| Post H1 (.post-title) | clamp(30px, 4.5vw, 52px) | 800 | letter-spacing: 0.01em, line-height: 1.18. Key phrase in `<span class="accent">` = italic + #ff4315 |
| Article H2 | clamp(24px, 3.2vw, 36px) | 800 | letter-spacing: 0.01em, line-height: 1.18 |
| Article H3 | 18px | 600 | Satoshi font ok for inline H3s |
| Body text | 17px | 400 | color: rgba(255,255,255,0.80), line-height: 1.85 |
| Labels/tags | 10-11px | 700 | Space Mono, letter-spacing: 0.12em, uppercase |

---

## Design tokens

```css
--orange: #ff4315;
--orange-dark: #c42f08;
--purple: #644bff;
--bg: #0e0d1a;
--bg2: #1a1828;
--white: #ffffff;
--muted: rgba(255,255,255,0.55);
--border: rgba(100,75,255,0.12);
```

Cards: `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12-16px`

Callout: `background: rgba(100,75,255,0.08); border: 1px solid rgba(100,75,255,0.2); border-radius: 12px`

Post tag pill: `background: rgba(100,75,255,0.1); border: 1px solid rgba(100,75,255,0.25); color: #a89cff`

---

## SEO + GEO checklist (before every push)

- [ ] Primary keyword in: H1, first paragraph, one H2, URL slug, meta title, meta description
- [ ] Meta title ~55 chars, meta description ~155 chars
- [ ] Answer-first opening: core question answered in first 150 words
- [ ] FAQPage JSON-LD with exact PAA questions from SERP research
- [ ] Article JSON-LD with author, publisher, datePublished, keywords (AU spelling)
- [ ] Question-style H2s (each self-contained, quotable out of context)
- [ ] Specific numbers with sources
- [ ] No em dashes: `grep "—\|–" filename` must return nothing
- [ ] Author block with Adam's photo present
- [ ] CTA drives to /book (or /audit for audit-specific posts)
- [ ] blog/index.html updated with new post card

---

## Routing (already live, do not change vercel.json)

- `/blog` - serves `blog/index.html`
- `/blog/[slug]` - serves `blog/[slug].html`
- `blog/*.html` already in vercel builds

---

## Adding a new post: checklist

1. Create `blog/[slug].html` (copy structure from existing post)
2. Update `blog/index.html` - add a new `.blog-card` block at the top of `.blog-grid`
3. Commit both files together: `git add blog/[slug].html blog/index.html`
4. Push: `git push origin main`

---

## Images policy

Skip generic stock and AI-generated inline images. The structural elements (stat cards, callout boxes, numbered lists, step badges) break up text without undermining credibility. Add images only when:
- Real client screenshots (Shopify Analytics, PageSpeed results, ad account data)
- Branded OG/social card image (title + logo on dark background)

---

## Existing posts

| Slug | Title | Published | Primary keyword |
|---|---|---|---|
| shopify-conversion-rate-optimization | Why Your Shopify Store's Conversion Rate Is Making Your Ad Spend Worthless | 2026-07-02 | shopify conversion rate optimisation |
| performance-max-vs-standard-shopping-shopify | Performance Max vs Standard Shopping for Shopify: The Decision Framework Nobody Gives You | 2026-07-02 | performance max vs standard shopping shopify |
| meta-ads-roas-shopify | Your Meta Ads ROAS Is Lying to You. Here's the Number That Actually Matters. | 2026-07-02 | blended ROAS shopify / meta ads ROAS shopify |
