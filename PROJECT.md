# Kliks Digital — Project Summary
**kliks.com.au** | Last updated: April 2026

---

## Files

| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Main agency homepage | ✅ Complete |
| `ad-junkies.html` | Ad Junkies newsletter landing page | ✅ Complete |
| `privacy.html` | Privacy policy | ✅ Complete |
| `book.html` | Strategy call booking page | ✅ Complete |

---

## index.html

**What it is:** Full agency homepage.

**Sections (top to bottom):**
- Fixed nav with blur backdrop
- Hero — "Grow your Shopify store. Not your workload."
- Stats strip — 4-column icon + text bar
- Logo marquee — infinite scroll, 8 brand logos
- Services — Ads, Shopify, Creative Strategy + outsourced team card
- Process — 4-step grid (Audit, The List, Execute, Scale)
- Results — 4 metric cards with plain-English headers
- About — Adam photo + founder copy
- Who we work with — fit/not fit card
- Straight Up — agency advice article card
- CTA section — scarcity + checkmarks
- Contact form — Formspree
- Footer

**All CTAs point to:** `book.html` (not directly to Calendly)

**Contact form endpoint:** `https://formspree.io/f/mzdyragl` — verified and working.
- Note: Formspree is only used for the contact form on `index.html`. All other forms (Ad Junkies signups, strategy call leads) run through Klaviyo, which is the primary long-term solution.

---

## ad-junkies.html

**What it is:** Newsletter signup landing page for Ad Junkies.

**Sections:**
- Hero with eyebrow "The Ad Junkies"
- What's inside — 3 cards
- Social proof quote
- Second signup CTA
- Who writes it — Adam bio
- Footer CTA → book.html

**Newsletter signup forms:** Klaviyo embed
- Form ID: `VaHVst`
- Embed code: `<div class="klaviyo-form-VaHVst"></div>`
- Klaviyo JS loaded with public key: `QNNHsN`

**Action required:** In Klaviyo form builder, set the Success step on form `VaHVst` to show a thank-you message (or redirect as preferred).

---

## privacy.html

**What it is:** Plain English privacy policy.

**Covers:**
1. What data we collect (contact form + Calendly)
2. How we use it
3. Third parties — Formspree + Calendly (both GDPR-compliant)
4. Cookies — none currently, GA4/Meta Pixel noted as future
5. Your rights — deletion via hello@kliks.com.au
6. Contact

---

## book.html

**What it is:** Dedicated strategy call booking page. Distraction-free — logo and back link only, no full nav.

**Layout:** Two-column — copy/availability left, form right.

**Left column includes:**
- Boutique/quality-over-quantity copy
- Dynamic availability widget (JS config at top of file)
- Trust checkmarks

**Form fields:**
- First name (required)
- Last name
- Email (required)
- Phone (optional)
- Shopify store URL (optional)
- Monthly ad spend — dropdown (required)
- Main challenge — textarea

**Form submission flow:**
1. JS posts to Klaviyo Client API (`client/form-submissions`)
2. Success screen shows for 1.8 seconds
3. Auto-redirects to Calendly
4. If Klaviyo fails silently, redirect still fires — user is never blocked

**Klaviyo form ID:** `XV8BqD`
**Klaviyo embed code:** `<div class="klaviyo-form-XV8BqD"></div>`
**Klaviyo public API key:** `QNNHsN`
**Calendly URL:** TBD — a dedicated AU timezone Calendly will be created. Current placeholder in code: `https://calendly.com/kliks-hu/30min`. Replace in `book.html` (JS config + success screen link) once the AU link is live.

**Action required:** In Klaviyo form builder, set the Success step on form `XV8BqD` to redirect to the AU Calendly URL once confirmed.

### Updating availability each month
Open `book.html` and find the config block near the bottom of the file:

```javascript
const AVAILABILITY = {
  current: { month: 'April', spots: 0 },
  next:    { month: 'May',   spots: 2 }
};
```

- `spots: 0` = shows "Fully booked" with strikethrough
- `spots: 2` = shows "2 spots left" in green
- Update both `month` names and `spots` numbers at the start of each month

---

## Design System

### Colours
| Name | Hex | Used for |
|------|-----|---------|
| Purple | `#644bff` | Accents, glows, card borders |
| Orange | `#ff4315` | CTAs, section labels, highlights |
| Orange dark | `#c42f08` | Button hover state |
| Purple dark | `#3d2dcf` | Deeper purple accents |
| Background | `#0e0d1a` | Main page background |
| Background 2 | `#1a1828` | Alternating section background |
| White | `#ffffff` | Headings, body text |
| Muted text | `rgba(255,255,255,0.55)` | Subtext, descriptions |
| Border | `rgba(100,75,255,0.12)` | Card and section borders |

### Fonts
```html
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap" rel="stylesheet">
```
- Headings: `Clash Display`
- Body: `Satoshi`

### Type scale
- Hero H1: `clamp(44px, 6vw, 80px)`, weight 800, letter-spacing `-2px`
- Section titles: `clamp(34px, 4vw, 52px)`, weight 800, letter-spacing `-0.3px`
- Section labels (orange, uppercase): `12px`, weight 600, letter-spacing `0.12em`
- Body: `16px`, line-height `1.7`
- Muted sub: `18px`, color `rgba(255,255,255,0.55)`

### Buttons
- Background: `#ff4315`
- Border radius: `100px` (full pill)
- Padding: `16px 36px` (large variant: `20px 48px`)
- Font weight: `600`
- Hover: background `#c42f08`, `translateY(-2px)`

### Cards
- Background: `rgba(255,255,255,0.03)`
- Border: `1px solid rgba(255,255,255,0.07)`
- Border radius: `20px`
- Padding: `40px 36px`
- Hover: orange top bar sweeps in (`::before`, `scaleX 0 to 1`), `translateY(-6px)`, border brightens to `rgba(100,75,255,0.2)`

### Effects
- **Noise grain:** fixed `body::before` overlay, opacity `0.09`, SVG fractal noise, pointer-events none
- **Nav blur:** `backdrop-filter: blur(12px)`, background `rgba(14,13,26,0.85)`, darkens to `rgba(14,13,26,0.95)` on scroll
- **Hero glow:** radial purple blob, `filter: blur(80px)`, opacity `0.35`, position absolute
- **Fade-up on scroll:** `.fade-up` starts `opacity 0` + `translateY(28px)`, transitions to visible via IntersectionObserver, staggered `80ms` per element

### Copy rules
- No em dashes — use commas or hyphens
- No bullet points in card body copy — prose only
- Tone: founder talking to founder, not agency pitch

---

## External Assets

### Adam Nagy photo (GIF)
```
https://cdn.shopify.com/s/files/1/0733/0693/1363/files/adam-ads.gif?v=1776520792
```
Used in: `index.html` (About section), `ad-junkies.html` (Who writes it)

> Note: This GIF is currently hosted on a Shopify CDN. If that account is closed, re-upload the file to a permanent host (Cloudinary, Vercel, or any CDN) and update the `src` in both files.

### Logo marquee images (index.html)
All hosted on kliks.com.au CDN:
```
https://kliks.com.au/cdn/shop/files/Flutterly_logo.png
https://kliks.com.au/cdn/shop/files/Fitzroy_Manor_logo.png
https://kliks.com.au/cdn/shop/files/sketcha_logo.png
https://kliks.com.au/cdn/shop/files/black_white_grow_logo.png
https://kliks.com.au/cdn/shop/files/logos_cozy_home_760digital_adam_nagy_7.png
https://kliks.com.au/cdn/shop/files/logos_cozy_home_760digital_adam_nagy_8.png
https://kliks.com.au/cdn/shop/files/logos_cozy_home_760digital_adam_nagy_9.png
https://kliks.com.au/cdn/shop/files/icare_group_slicky_logo.png
```
CSS: `filter: brightness(0) invert(1)`, `opacity: 0.6`, hover `opacity: 1`

---

## Third-Party Services

| Service | Used for | Key ID / URL |
|---------|---------|--------------|
| Formspree | Contact form on index.html only | `https://formspree.io/f/mzdyragl` — verified and working |
| Klaviyo | Ad Junkies signups + strategy call leads | Public key: `QNNHsN` |
| Klaviyo JS loader | In `<head>` of ad-junkies.html + book.html | `<script async src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=QNNHsN"></script>` |
| Klaviyo form — Ad Junkies | Newsletter embed on ad-junkies.html | Form ID: `VaHVst` — embed: `<div class="klaviyo-form-VaHVst"></div>` |
| Klaviyo form — Strategy Call | API target on book.html | Form ID: `XV8BqD` — embed: `<div class="klaviyo-form-XV8BqD"></div>` |
| Calendly | Call booking after book.html form | TBD — AU timezone link to be created. Placeholder: `https://calendly.com/kliks-hu/30min` |
| Fontshare | Clash Display + Satoshi fonts | CDN via `api.fontshare.com` |

---

## Social Links

| Platform | URL |
|----------|-----|
| Instagram | https://www.instagram.com/kliks.digital |
| TikTok | https://www.tiktok.com/@adjunkies |
| Hungarian site | https://kliks.hu |

---

## Deployment (Vercel + VentraIP)

1. GitHub repo: `heytadeka/kliks-au` (same setup as kliks.hu)
2. Init git, commit all 4 files, push to repo
3. Connect to Vercel — Framework: Other, no build command, no output directory
4. Add custom domain `kliks.com.au` in Vercel settings
5. Update DNS at VentraIP (same process as kliks.hu):
   - `A` record: `@` → `76.76.21.21`
   - `CNAME`: `www` → `cname.vercel-dns.com`
6. Confirm site is live

---

## Outstanding Actions Before Go-Live

- [ ] Create AU-specific Calendly link (AU timezone), then replace placeholder in `book.html` (JS config + success screen) and update Klaviyo form `XV8BqD` Success step redirect
- [ ] Set Klaviyo Ad Junkies form (`VaHVst`) Success step to a thank-you message
- [ ] Deploy to Vercel and connect `kliks.com.au` domain
- [ ] Update DNS at VentraIP
- [ ] Update `book.html` availability config at the start of each month
