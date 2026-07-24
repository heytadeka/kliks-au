# Handoff: KLIKS Patisserie Landing Page

## Overview
A landing page for kliks.com.au/patisserie — a new vertical of Kliks Digital targeting premium patisserie, cake and dessert brand founders in Sydney. Sells a "growth audit" lead-gen offer.

## About the Design Files
The file in this bundle (`Patisserie Landing.dc.html`) is a **design reference built in HTML** — a prototype showing intended look, layout and content, not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, plain static site, etc.) using its established patterns — or, if no environment exists yet, choose the most appropriate framework and implement there. Do not literally ship the prototype's HTML/inline-styles as-is.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final. Recreate pixel-perfectly using the target codebase's conventions (CSS framework, component library, etc. — inline styles in the prototype should become normal CSS/classes/styled-components in the real build).

## Visual Direction
Swiss International Typographic Style / Bauhaus-influenced: strong visible grid, bold geometric sans-serif type as the primary graphic device (not photography-led), high contrast palette, large confident flat color blocks, no rounded corners, no card/box chrome, no gradients or shadows.

## Design Tokens
- **Cream (base bg):** `#f2ede3`
- **Ink (primary text / dark blocks):** `#16140f`
- **Accent (cherry red):** `#c1272d`
- **Muted ink (secondary text):** `rgba(22,20,15,0.68)` (also `.55`/`.62` for smaller labels)
- **Rule/line color:** `rgba(22,20,15,0.15)` (section dividers), `rgba(22,20,15,0.2)` (grid dividers)
- **Cream on ink, muted:** `rgba(242,237,227,0.7–0.85)`
- **Display font:** Archivo, weights 700/800/900 (Google Fonts) — used for all headlines, numbers, section titles
- **Body font:** Inter, weights 400/500/600/700 (Google Fonts) — used for paragraphs, labels, form fields
- **Type scale:** Hero H1 `clamp(38px,6.2vw,84px)`; section H2 `clamp(30px,4.4vw,56px)`; sub-headings `clamp(24–34px)`; body `15.5–20px`; eyebrow labels `13px` uppercase, `0.18em` tracking
- **No border-radius anywhere** (all corners square); no box-shadows; no gradients
- **Max content width:** `1400px`, side padding `clamp(20px,4vw,48px)`
- **Section vertical padding:** `clamp(64px,9vw,120px)` (hero/CTA slightly larger)

## Screens / Views
Single scrolling page, one continuous flow:

1. **Nav** — sticky top, 84px tall, cream bg, bottom rule. Left: "KLIKS" (Archivo 900) + vertical divider + "PATISSERIE" (small red uppercase tracked label). Right: text links (Growth Engine, First 90 Days, Why KLIKS) + solid ink "Request Audit" button (square corners).

2. **Hero** — 2-col grid (~1.6fr text / 1fr image), bottom-aligned. Left: red eyebrow label "GROWTH SYSTEMS — FOR PATISSERIE & DESSERT BRANDS", giant H1 "Built a great food brand? Now build the system behind growth.", subhead paragraph, red CTA button "Request your free growth audit →". Right: 4:5 image module (duotone/grayscale-treated patisserie photo) with small uppercase caption below ("Fig. 01 — Product, treated").

3. **Problem (01)** — 2-col grid: left column narrow red eyebrow "01 — The Problem", right column heading "You built the product. Growth needs another system." + one body paragraph (exact copy below). Top-bordered section.

4. **Growth Engine (02)** — Full-width heading "The KLIKS Growth Engine". Below it, a 4-column grid with a top rule and vertical rules between every column (no cards/boxes). Each column: large red Archivo number (01–04), bold uppercase title, body copy. Columns: **Store, Attention, Creative, Retention** (exact copy below). Grid uses `repeat(auto-fit,minmax(230px,1fr))` so it reflows to fewer columns on narrow widths, keeping the rule-divider treatment.

5. **Who It's For (03)** — 2-col grid (text ~1fr / image ~0.85fr, image on the right on wide screens). Red eyebrow "03 — Fit", heading "Built for founders who already have something special.", one body paragraph. Square 1:1 image module (duotone) with caption "Fig. 02 — Storefront, treated".

6. **First 90 Days (04)** — Heading "The first 90 days". 3-column grid (`auto-fit,minmax(240px,1fr)`), each column has a thick top rule (3px solid ink), a red "Month N" label, and a bold statement line. Months 1–3 (exact copy below).

7. **Why KLIKS (05)** — Full-bleed **ink background block** (`#16140f`), cream text. Heading "Why KLIKS". 4-column rule-divided grid (same visual system as Growth Engine but in cream-on-ink) with red numbers 01–04 and one bold statement per point (no body copy, just the phrase).

8. **Growth Audit Form (06)** — 2-col grid: left = red eyebrow "06 — Start Here", heading "Start with a growth audit", intro paragraph. Right = form, laid out as paired fields per row, each field is a label (small uppercase caption) above a bottom-border-only input (no boxes, no rounded corners, ink 2px underline, transparent background). Fields: Name, Email / Business Name, Instagram Handle / Website URL, Monthly Revenue Range (select, custom-styled with a text-based caret) — then full-width textarea "What's the biggest challenge right now?" — then red CTA button "Request your free growth audit →".

9. **Final CTA** — Full-bleed **accent (red) background block**, centered text, max-width 1000px. Heading "Ready to build the next stage of your brand?", body paragraph, inverted (cream bg / ink text) CTA button "Request your free growth audit →".

10. **Footer** — Simple bottom rule, small muted text: "KLIKS Patisserie — A vertical of Kliks Digital" (left) and "Sydney, Australia" (right).

## Exact Copy
**Hero H1:** Built a great food brand? Now build the system behind growth.
**Hero subhead:** KLIKS helps ambitious patisserie and dessert brands improve their website, advertising and customer journey so they can grow without adding more pressure to the founder.
**Hero/all primary CTAs:** Request your free growth audit

**Problem heading:** You built the product. Growth needs another system.
**Problem body:** Running a patisserie is already a full-time job. Between production, staff, suppliers, customers and daily operations, marketing often becomes something that happens whenever there is time. Meanwhile the website doesn't fully showcase the brand, the ads are inconsistent, the social content doesn't tell the full story, and existing customers aren't being brought back. KLIKS helps build the digital growth system behind the business.

**Growth Engine (heading: "The KLIKS Growth Engine"):**
- 01 Store — Turn your website into a better sales tool. We improve the Shopify experience, product pages, ordering journey and landing pages.
- 02 Attention — Bring more people to the brand. We build and manage Meta and Google campaigns, testing offers and audiences.
- 03 Creative — Give people a reason to stop and care. We help develop campaign ideas, content direction and seasonal concepts.
- 04 Retention — Create more value from existing customers. We build email systems, customer journeys and seasonal campaigns.

**Who It's For heading:** Built for founders who already have something special.
**Who It's For body:** KLIKS works best with brands that already have strong product quality, loyal customers, a physical presence and a real desire to grow, especially cake brands, patisseries, dessert businesses and premium food brands.

**First 90 Days (heading: "The first 90 days"):**
- Month 1 — Understand the business. Output is the KLIKS Growth Roadmap.
- Month 2 — Build and test.
- Month 3 — Improve what works.

**Why KLIKS (heading: "Why KLIKS"):** 01 Founder-led · 02 Ecommerce experience · 03 Real understanding of food businesses, through a family bakery background · 04 Creative-first thinking.

**Growth Audit heading:** Start with a growth audit
**Growth Audit intro:** The audit reviews website experience, customer journey, marketing opportunities and growth potential.
**Form fields:** Name, Email, Business Name, Instagram Handle, Website URL, Monthly Revenue Range (select: Under $20k/month, $20k–$50k/month, $50k–$100k/month, $100k–$250k/month, $250k+/month), "What's the biggest challenge right now?" (textarea).

**Final CTA heading:** Ready to build the next stage of your brand?
**Final CTA body:** Your product already has value. Now it needs a digital system that helps more people discover it.

## Interactions & Behavior
- Nav links are in-page anchor scrolls (`#engine`, `#process`, `#why`, `#audit`).
- All CTA buttons point to the audit form section/anchor.
- No animations, transitions, or hover effects were specified beyond standard link/button hover (should follow the target codebase's link conventions — e.g. link color shifts to the accent red on hover).
- The form has no client-side submit logic in the prototype (static mockup) — real implementation needs actual form handling/validation and a submission endpoint (fields: name, email, business name, Instagram handle, website URL, monthly revenue range, biggest challenge free-text).
- Responsive behavior: layout uses CSS Grid with `auto-fit`/`minmax` and `clamp()` for fluid type/spacing rather than fixed breakpoints — columns naturally collapse to fewer columns (down to 1) as viewport narrows. No horizontal scrolling or clipped text at any width; recreate this fluid behavior rather than hard breakpoints if possible, or translate to the target CSS framework's breakpoint system if that's the codebase convention.

## Assets
Two image placeholders (both currently empty design-tool placeholders, not real photography):
1. Hero image — "Patisserie product shot", 4:5 aspect ratio, duotone/grayscale treatment (`filter: grayscale(1) contrast(1.1) brightness(0.95)`).
2. Who-it's-for image — "Patisserie interior", 1:1 aspect ratio, same duotone treatment.

Real photography needs to be sourced/shot and dropped in; apply the duotone/grayscale filter treatment to match the graphic system. Fonts are loaded from Google Fonts (Archivo, Inter) — no other external assets.

## Files
- `Patisserie Landing.dc.html` — the full design reference (view in a browser; all styles are inline).
- `image-slot.js` — a design-tool-only placeholder component used for the two image slots in the prototype; **do not port this into production**, replace with real `<img>` tags.
