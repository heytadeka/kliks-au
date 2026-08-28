import Script from 'next/script'
import GrowthAuditForm from './GrowthAuditForm'

export const metadata = {
  title: 'Growth Audit — Kliks Digital',
  description: 'The KLIKS Growth Audit looks at your marketing, creative, Shopify store, offer and customer journey to find the areas that deserve attention first.',
}

export default function GrowthAuditPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      {/* Meta Pixel - same ID the homepage uses, not otherwise loaded inside the Next.js app */}
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1875112903440305');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img height="1" width="1" style={{ display: 'none' }} alt="" src="https://www.facebook.com/tr?id=1875112903440305&ev=PageView&noscript=1" />
      </noscript>
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700,800&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div className="bg-base"></div>
      <div className="grain"></div>
      <div className="vignette"></div>

      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">KLIKS<span>.</span></a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="/" className="back-home-link" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>&larr; Back to homepage</a>
            <a href="#apply" className="btn nav-cta" style={{ padding: '10px 22px', fontSize: 14 }}>Apply Now</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <div className="hero-blob hero-blob-purple"></div>
        <div className="hero-content">
          <h1 className="headline">Find out what&apos;s actually holding growth back.</h1>
          <p className="hero-intro">You&apos;ve already built the brand. The next question is where the biggest growth opportunity is hiding.</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.7 }}>The KLIKS Growth Audit looks at your marketing, creative, Shopify store, offer and customer journey to find the areas that deserve attention first.</p>
          <a href="#apply" className="btn btn-lg" style={{ padding: '16px 40px', fontSize: 17 }}>Request Your Growth Audit &rarr;</a>
          <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>I review every submission personally.</p>
        </div>
      </section>

      {/* WHAT THE AUDIT LOOKS AT */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="container">
          <span className="section-label">What the audit looks at</span>
          <h2 className="section-title">We look at the whole picture.</h2>
          <div style={{ maxWidth: 680, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9, marginBottom: 56 }}>
            <p>Growth problems rarely sit in one place.</p>
            <p style={{ marginTop: 16 }}>Sometimes the ads are fine and the offer is weak. Sometimes the creative gets attention but the website loses the sale. Sometimes acquisition works, but customers never come back.</p>
            <p style={{ marginTop: 16 }}>The audit looks across the parts that actually influence growth:</p>
          </div>

          <div className="services-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="card">
              <h3>Creative &amp; Messaging</h3>
              <p>Are people getting a reason to stop, care and click?</p>
            </div>
            <div className="card">
              <h3>Paid Acquisition</h3>
              <p>Are your campaigns supporting the right products, offers and business goals?</p>
            </div>
            <div className="card">
              <h3>Shopify &amp; Conversion</h3>
              <p>Is the store making it easy for interested visitors to buy?</p>
            </div>
            <div className="card">
              <h3>Offer</h3>
              <p>Are you giving customers a strong enough reason to choose you now?</p>
            </div>
            <div className="card">
              <h3>Customer Journey</h3>
              <p>What happens between first impression and purchase?</p>
            </div>
            <div className="card">
              <h3>Retention</h3>
              <p>Are you making enough of the customers you already paid to acquire?</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU'LL GET */}
      <section>
        <div className="container">
          <span className="section-label">What you&apos;ll get</span>
          <h2 className="section-title">Clear opportunities. No 40-page marketing report.</h2>
          <div style={{ maxWidth: 680, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>
            <p>If your business is selected, I&apos;ll personally review it and highlight the areas I think deserve attention. The goal is to give you:</p>
          </div>
          <ul className="copy-list" style={{ maxWidth: 620, margin: '20px 0 32px' }}>
            <li>The biggest growth opportunities I can see</li>
            <li>Problems that may be costing you sales</li>
            <li>Creative or offer ideas worth testing</li>
            <li>Shopify and customer journey improvements</li>
            <li>A clearer idea of what should happen next</li>
          </ul>
          <div style={{ maxWidth: 680, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>
            <p>For selected brands, I&apos;ll record a short personalised video audit walking through my findings. Usually around 5-10 minutes.</p>
            <p style={{ marginTop: 16, color: 'var(--white)', fontWeight: 500 }}>Useful enough to act on. Focused enough that you&apos;ll actually watch it.</p>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="container">
          <span className="section-label">Who this is for</span>
          <h2 className="section-title">Built for brands that already have something worth growing.</h2>
          <p className="section-sub" style={{ marginBottom: 32 }}>The Growth Audit is best suited to ecommerce businesses with:</p>

          <div className="who-card" style={{ maxWidth: 620, marginBottom: 40 }}>
            <div className="who-card-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
              <ul className="copy-list">
                <li>An established product</li>
                <li>Existing customers</li>
                <li>Real sales and traction</li>
                <li>Ambition to grow</li>
                <li>Openness to changing things when there&apos;s a better way</li>
              </ul>
            </div>
          </div>

          <div style={{ maxWidth: 680, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>
            <p>You might already be running ads. You might already have an agency. You might be doing most of the marketing yourself.</p>
            <p style={{ marginTop: 16 }}>That&apos;s fine.</p>
            <div className="quote-block" style={{ marginTop: 20 }}>The important part is that there is a real business underneath it.</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section>
        <div className="container">
          <span className="section-label">How it works</span>
          <h2 className="section-title">Simple process.</h2>

          <div className="process-grid">
            <div className="card process-card">
              <div className="process-num">01</div>
              <h3>Tell me about the business</h3>
              <p>Complete the short application below. Share your store, current marketing situation and the main challenge you&apos;re trying to solve.</p>
            </div>
            <div className="card process-card">
              <div className="process-num">02</div>
              <h3>I review it personally</h3>
              <p>I&apos;ll look through the business and decide whether I think I can add something useful.</p>
            </div>
            <div className="card process-card">
              <div className="process-num">03</div>
              <h3>Selected brands receive a personalised audit</h3>
              <p>I&apos;ll record the biggest opportunities I see and explain where I would focus first.</p>
            </div>
            <div className="card process-card">
              <div className="process-num">04</div>
              <h3>We talk if it makes sense</h3>
              <p>If there looks like a strong fit, we can jump on a strategy call and talk through the business properly.</p>
            </div>
          </div>
          <p style={{ marginTop: 40, color: 'var(--muted)', fontSize: 15, lineHeight: 1.8, maxWidth: 600 }}>No awkward sales dance. If there&apos;s an opportunity to work together, we&apos;ll know pretty quickly.</p>
        </div>
      </section>

      {/* WHY I DO IT THIS WAY */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="container">
          <span className="section-label">Why I do it this way</span>
          <h2 className="section-title">I&apos;d rather understand the business before telling you what to buy.</h2>
          <div style={{ maxWidth: 680, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>
            <p>I&apos;ve spent years running campaigns and businesses. One thing that becomes obvious after enough time in this world: every business has a different bottleneck.</p>
            <p style={{ marginTop: 16 }}>Some need better creative. Some need a stronger offer. Some need the Shopify store cleaned up. Some need someone to finally connect everything together.</p>
            <p style={{ marginTop: 16, color: 'var(--white)', fontWeight: 500 }}>The audit gives me a chance to actually understand what&apos;s going on before making recommendations.</p>
          </div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section id="apply">
        <div className="container">
          <span className="section-label">Tell me about your business</span>
          <h2 className="section-title">Takes around 2 minutes.</h2>
          <p className="section-sub" style={{ marginBottom: 40 }}>I personally review every submission.</p>
          <div style={{ maxWidth: 560 }}>
            <GrowthAuditForm />
          </div>
        </div>
      </section>

      {/* EXPECTATION SETTING */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="container">
          <span className="section-label">Before you apply</span>
          <h2 className="section-title">A quick note before you apply.</h2>
          <div style={{ maxWidth: 680, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>
            <p>I deliberately keep these audits limited. A personalised review takes time, and I want to make sure the businesses I audit are ones where I can genuinely add value.</p>
            <p style={{ marginTop: 16 }}>If your business looks like a good fit, I&apos;ll be in touch. If I can already see that KLIKS isn&apos;t the right partner, I&apos;d rather be upfront about that too.</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <div className="cta-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h2 className="section-title">There&apos;s probably something inside your marketing that deserves a closer look.</h2>
          <p className="section-sub" style={{ margin: '0 auto 36px', maxWidth: 500, color: 'rgba(255,255,255,0.55)' }}>Let&apos;s find it.</p>
          <a href="#apply" className="btn btn-lg cta-section-btn">Request Your Growth Audit &rarr;</a>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-left">
            <a href="/" className="logo">KLIKS<span>.</span></a>
            <span className="footer-copy">&copy; 2026 Kliks Digital. All rights reserved.</span>
          </div>
          <div className="footer-center">
            <a href="/privacy.html">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </>
  )
}

const PAGE_CSS = `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ─── ANNOUNCEMENT BAR ─── */
    .announcement-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 1001;
      background: #0e0d1a;
      text-align: center;
      padding: 6px 24px;
      border-bottom: 1px solid rgba(100,75,255,0.15);
    }
    .announcement-bar a {
      color: #644bff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
      transition: opacity 0.2s;
    }
    .announcement-bar a:hover { opacity: 0.8; }
    .announcement-bar .bar-arrow { color: #ff4315; }

    :root {
      --purple: #644bff;
      --orange: #ff4315;
      --orange-dark: #c42f08;
      --purple-dark: #3d2dcf;
      --bg: #0e0d1a;
      --bg2: #1a1828;
      --white: #ffffff;
      --muted: rgba(255,255,255,0.55);
      --border: rgba(100,75,255,0.12);
      --cream: #fff7ef;
      --pill: rgba(255, 247, 239, 0.04);
      --pill-border: rgba(255, 247, 239, 0.10);
      --line: rgba(255, 247, 239, 0.08);
    }

    html { scroll-behavior: smooth; }

    section[id] { scroll-margin-top: 80px; }

    body {
      background: var(--bg);
      color: var(--white);
      font-family: 'Satoshi', sans-serif;
      font-size: 16px;
      line-height: 1.7;
      overflow-x: hidden;
    }

    /* Noise grain overlay */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.09;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
      background-size: 128px 128px;
    }

    /* ─── HERO BACKGROUND LAYERS ─── */
    .bg-base {
      position: absolute; inset: 0; z-index: 0;
      background:
        radial-gradient(ellipse 80% 60% at 50% 0%, rgba(100, 75, 255, 0.10), transparent 60%),
        radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255, 67, 21, 0.05), transparent 60%);
    }
    .orbs {
      position: absolute; inset: -20%; z-index: 0;
      filter: blur(80px);
      opacity: 0.85;
      pointer-events: none;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      mix-blend-mode: screen;
      will-change: transform;
    }
    .orb-1 {
      width: 720px; height: 720px;
      left: 8%; top: 4%;
      background: radial-gradient(circle at 30% 30%, rgba(100, 75, 255, 0.55), rgba(100, 75, 255, 0) 65%);
      animation: drift1 22s ease-in-out infinite alternate;
    }
    .orb-2 {
      width: 620px; height: 620px;
      right: 6%; top: 18%;
      background: radial-gradient(circle at 60% 40%, rgba(255, 67, 21, 0.40), rgba(255, 67, 21, 0) 65%);
      animation: drift2 28s ease-in-out infinite alternate;
    }
    .orb-3 {
      width: 540px; height: 540px;
      left: 38%; bottom: -10%;
      background: radial-gradient(circle at 50% 50%, rgba(100, 75, 255, 0.35), rgba(100, 75, 255, 0) 65%);
      animation: drift3 34s ease-in-out infinite alternate;
    }
    @keyframes drift1 {
      0%   { transform: translate3d(0, 0, 0) scale(1); }
      100% { transform: translate3d(120px, 80px, 0) scale(1.15); }
    }
    @keyframes drift2 {
      0%   { transform: translate3d(0, 0, 0) scale(1.05); }
      100% { transform: translate3d(-140px, 60px, 0) scale(0.92); }
    }
    @keyframes drift3 {
      0%   { transform: translate3d(0, 0, 0) scale(0.95); }
      100% { transform: translate3d(60px, -90px, 0) scale(1.1); }
    }
    .grain {
      position: fixed; inset: 0; z-index: 1;
      pointer-events: none;
      opacity: 0.18;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMjAnIGhlaWdodD0nMjIwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC45JyBudW1PY3RhdmVzPScyJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPScwIDAgMCAwIDEgIDAgMCAwIDAgMSAgMCAwIDAgMCAxICAwIDAgMCAwLjQ1IDAnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbiknLz48L3N2Zz4=");
      background-size: 220px 220px;
    }
    .vignette {
      position: fixed; inset: 0; z-index: 1;
      pointer-events: none;
      background: radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(14, 13, 26, 0.6) 100%);
    }

    /* ─── HERO EYEBROW ─── */
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 32px;
      padding: 6px 14px 6px 8px;
      border: 1px solid rgba(255, 247, 239, 0.10);
      background: rgba(255, 247, 239, 0.04);
      border-radius: 999px;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: 0.02em;
    }
    .eyebrow .live-dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: rgba(255, 67, 21, 0.15);
      display: inline-flex; align-items: center; justify-content: center;
      position: relative;
    }
    .eyebrow .live-dot::after {
      content: '';
      width: 6px; height: 6px; border-radius: 50%;
      background: #ff4315;
      box-shadow: 0 0 0 0 rgba(255, 67, 21, 0.6);
      animation: livepulse 2.2s ease-out infinite;
    }
    @keyframes livepulse {
      0%   { box-shadow: 0 0 0 0 rgba(255, 67, 21, 0.55); }
      70%  { box-shadow: 0 0 0 10px rgba(255, 67, 21, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 67, 21, 0); }
    }

    /* ─── HEADLINE WORD-DIFF ─── */
    .headline .word-diff {
      position: relative;
      font-style: italic;
      font-weight: 700;
      color: #ff4315;
      white-space: nowrap;
    }
    .headline .word-diff::after {
      content: '';
      position: absolute;
      left: 2%; right: 2%;
      bottom: 0.06em;
      height: 0.06em;
      background: #ff4315;
      border-radius: 2px;
      transform: scaleX(0);
      transform-origin: left center;
      animation: underline-in 1.4s cubic-bezier(0.65, 0, 0.35, 1) 0.6s forwards;
    }
    @keyframes underline-in {
      to { transform: scaleX(1); }
    }

    /* Typography */
    h1, h2, h3, h4 { font-family: 'Clash Display', sans-serif; letter-spacing: 0.01em; line-height: 1.18; }

    .section-label {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--orange);
      margin-bottom: 16px;
      display: block;
    }

    .section-title {
      font-size: clamp(34px, 4vw, 52px);
      font-weight: 800;
      letter-spacing: 0.01em;
      line-height: 1.18;
      margin-bottom: 20px;
    }

    .section-sub {
      font-size: 18px;
      color: var(--muted);
      max-width: 620px;
      margin-bottom: 60px;
    }

    /* Layout */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
    section { padding: 100px 0; }

    /* Fade-up animation */
    .fade-up { opacity: 0; transform: translateY(28px); transition: opacity 0.55s ease, transform 0.55s ease; }
    .fade-up.visible { opacity: 1; transform: translateY(0); }

    /* Cards */
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 40px 36px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s ease, transform 0.3s ease;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--orange);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s ease;
    }
    .card:hover { border-color: rgba(100,75,255,0.2); transform: translateY(-6px); }
    .card:hover::before { transform: scaleX(1); }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--orange);
      color: white;
      border-radius: 100px;
      padding: 16px 36px;
      font-weight: 600;
      font-family: 'Satoshi', sans-serif;
      font-size: 16px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .btn:hover { background: var(--orange-dark); transform: translateY(-2px); }
    .btn-lg { padding: 20px 48px; font-size: 18px; }

    /* Pills */
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 18px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 500;
    }
    .pill-neutral { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
    .pill-purple { background: rgba(100,75,255,0.12); border: 1px solid rgba(100,75,255,0.25); color: #a89cff; }
    .pill-orange { background: rgba(255,67,21,0.12); border: 1px solid rgba(255,67,21,0.25); color: #ff977d; text-decoration: none; }

    /* ─── NAV ─── */
    nav {
      position: fixed;
      top: 40px; left: 0; right: 0;
      z-index: 1000;
      background: rgba(14,13,26,0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.3s ease;
    }
    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 48px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      font-family: 'Clash Display', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--white);
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .logo span { color: var(--orange); }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 32px;
      list-style: none;
    }
    .nav-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-links a.nav-patisserie { color: var(--orange); }
    .nav-links a:hover { color: var(--white); }
    .nav-links .nav-cta { color: var(--white); }

    /* Hamburger */
    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      cursor: pointer;
      background: none;
      border: none;
      padding: 8px;
      z-index: 1001;
    }
    .hamburger span {
      display: block;
      width: 24px;
      height: 2px;
      background: var(--white);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    /* Mobile nav overlay */
    .nav-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: var(--bg);
      z-index: 999;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 40px;
    }
    .nav-overlay a {
      font-family: 'Clash Display', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: var(--white);
      text-decoration: none;
      transition: color 0.2s;
    }
    .nav-overlay a:hover { color: var(--orange); }
    body.nav-open .nav-overlay { display: flex; }
    body.nav-open .hamburger span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    body.nav-open .hamburger span:nth-child(2) { opacity: 0; }
    body.nav-open .hamburger span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    /* ─── HERO ─── */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
      overflow: hidden;
      padding: 160px 48px 80px;
    }
    .hero-blob {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(80px);
      opacity: 0.35;
    }
    .hero-blob-purple {
      width: 600px; height: 600px;
      background: var(--purple);
      top: -100px; left: -100px;
    }
    .hero-blob-orange {
      width: 500px; height: 500px;
      background: var(--orange);
      bottom: -80px; right: -80px;
      opacity: 0.2;
    }
    .hero-content { position: relative; z-index: 1; max-width: 860px; }
    .hero-intro {
      font-style: italic;
      color: var(--muted);
      font-size: 18px;
      margin-bottom: 28px;
    }
    .hero h1 {
      font-size: clamp(26px, 6vw, 60px);
      font-weight: 700;
      letter-spacing: 0.01em;
      line-height: 1.2;
      margin-bottom: 32px;
    }
    .hero-pills { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
    .hero-services {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 13px;
      color: var(--orange);
      margin-bottom: 36px;
      font-weight: 600;
    }

    /* ─── STATS STRIP ─── */
    /* ─── VALUE PROPS ─── */
    .value-props {
      padding: 80px 40px;
      border-top: 1px solid rgba(255,255,255,0.06);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .value-props-inner {
      max-width: 1240px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .vp-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 32px;
      transition: border-color 0.3s ease, transform 0.3s ease;
    }
    .vp-card:hover {
      border-color: rgba(100,75,255,0.2);
      transform: translateY(-6px);
    }
    .vp-icon {
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(100,75,255,0.12);
      border: 1px solid rgba(100,75,255,0.25);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
    }
    .vp-heading {
      font-family: 'Clash Display', sans-serif;
      font-size: 18px; font-weight: 600;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .vp-body {
      font-family: 'Satoshi', sans-serif;
      font-size: 14.5px;
      color: rgba(255,255,255,0.55);
      line-height: 1.6;
    }

    /* ─── MARQUEE ─── */
    .marquee-section {
      padding: 64px 0 56px;
      overflow: hidden;
      border-top: 1px solid rgba(100,75,255,0.12);
    }
    .marquee-label {
      text-align: center;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 40px;
    }
    .marquee-track {
      position: relative;
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
    }
    .marquee-inner {
      display: flex;
      width: max-content;
      animation: marquee 28s linear infinite;
    }
    .marquee-inner:hover { animation-play-state: paused; }
    @keyframes marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .marquee-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 48px;
      flex-shrink: 0;
    }
    .marquee-logo img {
      height: 54px;
      width: auto;
      filter: brightness(0) invert(1);
      opacity: 0.75;
      transition: opacity 0.2s ease;
      object-fit: contain;
    }
    .marquee-logo img:hover { opacity: 1; }

    /* ─── SERVICES ─── */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }
    .card-icon-wrap {
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(100,75,255,0.12);
      border: 1px solid rgba(100,75,255,0.25);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
    }
    .card h3 {
      font-family: 'Clash Display', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 12px;
      letter-spacing: 0.01em;
      text-align: left;
    }
    .card p { color: rgba(255,255,255,0.55); font-size: 14.5px; line-height: 1.6; text-align: left; }
    .card p + p { margin-top: 10px; }
    .card-full {
      background: linear-gradient(135deg, rgba(100,75,255,0.06) 0%, transparent 60%), #1a1828;
      border: 1px solid rgba(100,75,255,0.12);
      border-left: 3px solid #ff4315;
      border-radius: 12px;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .card-full-label {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: #ff4315; display: block; margin-bottom: 12px;
    }
    .card-full h3 {
      font-family: 'Clash Display', sans-serif;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
      letter-spacing: 0.01em;
    }
    .card-full p { color: rgba(255,255,255,0.55); font-size: 15px; line-height: 1.8; max-width: 780px; }
    .card-full p + p { margin-top: 12px; }

    /* ─── PROCESS ─── */
    .process-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    .process-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 32px;
      transition: border-color 0.3s ease, transform 0.3s ease;
    }
    .process-card:hover {
      border-color: rgba(100,75,255,0.2);
      transform: translateY(-6px);
    }
    .process-num {
      font-family: 'Clash Display', sans-serif;
      font-size: 72px;
      font-weight: 700;
      color: rgba(100,75,255,0.2);
      line-height: 1;
      margin-bottom: 12px;
    }
    .process-card h3 {
      font-family: 'Clash Display', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 10px;
      letter-spacing: 0.01em;
    }
    .process-card p { color: rgba(255,255,255,0.55); font-size: 14.5px; line-height: 1.6; }

    /* ─── RESULTS ─── */
    .results-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }
    .result-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 32px;
      transition: border-color 0.3s ease, transform 0.3s ease;
    }
    .result-card:hover {
      border-color: rgba(100,75,255,0.2);
      transform: translateY(-6px);
    }
    .metric-name {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #ff4315;
      margin-bottom: 8px;
    }
    .metric-label {
      font-family: 'Clash Display', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .result-card p {
      font-size: 14.5px;
      color: rgba(255,255,255,0.55);
      line-height: 1.6;
    }
    .advantage-card {
      background: rgba(100,75,255,0.08);
      border: 1px solid rgba(100,75,255,0.15);
      border-radius: 20px;
      padding: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
    }
    .advantage-content { flex: 1; }
    .advantage-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--orange);
      margin-bottom: 16px;
    }
    .advantage-content h3 {
      font-family: 'Clash Display', sans-serif;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .advantage-content p { color: var(--muted); font-size: 15px; line-height: 1.75; }
    .advantage-content p + p { margin-top: 12px; }
    .advantage-flags { font-size: 52px; white-space: nowrap; }

    /* ─── ABOUT ─── */
    .about-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: start;
    }
    .about-photo-wrap {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 4/5;
      background: linear-gradient(135deg, rgba(100,75,255,0.2) 0%, rgba(14,13,26,0.9) 100%), #1a1828;
      border: 1px solid rgba(204,255,0,0.25);
      box-shadow: 0 0 40px rgba(204,255,0,0.08);
    }
    .about-photo-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; pointer-events: none; }
    .about-photo-label {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: linear-gradient(to top, rgba(14,13,26,0.95), transparent);
      padding: 32px 28px 24px;
    }
    .about-photo-label strong { display: block; font-size: 18px; font-weight: 700; }
    .about-photo-label span { font-size: 14px; color: var(--muted); }
    .about-copy h2 {
      font-size: clamp(28px, 3vw, 40px);
      font-weight: 800;
      letter-spacing: 0.01em;
      margin-bottom: 24px;
    }
    .about-copy p { color: var(--muted); font-size: 16px; line-height: 1.8; margin-bottom: 20px; }
    .quote-block {
      border-left: 3px solid var(--orange);
      padding-left: 24px;
      margin: 28px 0;
      font-style: italic;
      color: var(--white);
      font-size: 16px;
      line-height: 1.7;
    }
    .about-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
    .chip {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 999px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      color: #ffffff;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    /* ─── WHO WE WORK WITH ─── */
    .who-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }
    .who-card-section p, .who-copy p { font-size: 14.5px; color: rgba(255,255,255,0.55); line-height: 1.6; }
    .who-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 32px;
      transition: border-color 0.3s ease, transform 0.3s ease;
    }
    .who-card:hover {
      border-color: rgba(100,75,255,0.2);
      transform: translateY(-6px);
    }
    .who-card-section { padding: 0; }
    .who-card-section + .who-card-section { border-top: 1px solid rgba(100,75,255,0.12); padding-top: 24px; margin-top: 24px; }
    .who-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .who-icon {
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .who-icon.who-icon-yes {
      background: rgba(100,75,255,0.2);
      color: #644bff;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .who-icon-no { width: 28px; height: 28px; background: rgba(239,68,68,0.15); color: #f87171; }
    .who-card h4 { font-family: 'Clash Display', sans-serif; font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }

    /* ─── STRAIGHT UP ─── */
    .article-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      overflow: hidden;
    }
    .article-card-inner { padding: 48px; }
    .article-tag {
      display: inline-block;
      background: rgba(100,75,255,0.1);
      border: 1px solid rgba(100,75,255,0.25);
      color: #644bff;
      border-radius: 999px;
      padding: 4px 12px;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .article-title {
      font-family: 'Clash Display', sans-serif;
      font-size: clamp(24px, 3vw, 38px);
      font-weight: 800;
      letter-spacing: 0.01em;
      margin-bottom: 24px;
    }
    .article-lead {
      font-size: 15px;
      color: rgba(255,255,255,0.55);
      margin-bottom: 28px;
      line-height: 1.8;
    }
    .quote-lg {
      position: relative;
      padding: 24px 32px;
      margin: 24px 0;
    }
    .quote-lg::before {
      content: '\\201C';
      position: absolute;
      top: -8px; left: 16px;
      font-family: 'Clash Display', sans-serif;
      font-size: 52px;
      color: #ff4315;
      opacity: 1;
      line-height: 1;
    }
    .quote-lg p {
      font-family: 'Clash Display', sans-serif;
      font-size: clamp(28px, 3.5vw, 48px);
      font-weight: 700;
      letter-spacing: 0.01em;
      color: #ffffff;
      text-shadow: 0 0 60px rgba(255,67,21,0.15);
    }
    .article-body p { color: rgba(255,255,255,0.55); font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
    .highlight-box {
      background: rgba(100,75,255,0.08);
      border: 1px solid rgba(100,75,255,0.15);
      border-radius: 10px;
      padding: 28px;
      margin: 32px 0;
    }
    .highlight-box strong { display: block; font-family: 'Clash Display', sans-serif; font-size: 16px; margin-bottom: 12px; color: #ffffff; }
    .highlight-box p { color: rgba(255,255,255,0.55); font-size: 14.5px; line-height: 1.6; margin: 0; }
    .highlight-box p + p { margin-top: 12px; }
    .author-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-top: 32px;
      margin-top: 32px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }
    .author-avatar {
      width: 44px; height: 44px;
      background: var(--orange);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }
    .author-info strong { display: block; font-size: 15px; color: #ffffff; font-weight: 600; }
    .author-info span { color: rgba(255,255,255,0.55); font-size: 13px; }

    /* ─── CTA ─── */
    .cta-section {
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .cta-glow {
      position: absolute;
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(100,75,255,0.15) 0%, transparent 70%);
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      pointer-events: none;
    }
    .cta-label { font-size: 13px; color: rgba(255,165,0,0.7); font-weight: 500; margin-bottom: 16px; }
    .cta-section h2 { font-size: clamp(34px, 4vw, 52px); font-weight: 800; letter-spacing: -0.3px; margin-bottom: 20px; }
    .cta-section .section-sub { margin: 0 auto 36px; }
    .cta-checks {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 24px;
      margin-bottom: 40px;
    }
    .cta-check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.55); }
    .cta-check::before { content: '✓'; color: #ff4315; font-weight: 700; }
    .cta-section-btn {
      position: relative;
      overflow: visible;
      z-index: 1;
    }
    .cta-section-btn::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      background: #ff4315;
      filter: blur(20px);
      opacity: 0.45;
      z-index: -1;
      animation: ctapulse 3.2s ease-in-out infinite;
    }
    @keyframes ctapulse {
      0%, 100% { opacity: 0.45; transform: scale(1); }
      50% { opacity: 0.25; transform: scale(1.08); }
    }

    /* ─── PATISSERIE TEASER ─── */
    .patisserie-teaser {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 72px 0;
    }
    .patisserie-grid {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 48px;
      align-items: center;
    }
    .patisserie-copy { max-width: 480px; }
    .patisserie-eyebrow {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--orange);
      margin-bottom: 14px;
      display: block;
    }
    .patisserie-copy h2 {
      font-size: clamp(22px, 2.6vw, 30px);
      font-weight: 700;
      letter-spacing: 0.01em;
      line-height: 1.28;
      margin-bottom: 14px;
    }
    .patisserie-copy p {
      color: var(--muted);
      font-size: 15.5px;
      line-height: 1.7;
      max-width: 46ch;
      margin-bottom: 22px;
    }
    .patisserie-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--orange);
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      transition: gap 0.2s ease, color 0.2s ease;
    }
    .patisserie-link:hover { color: var(--white); gap: 10px; }
    .patisserie-frame {
      padding: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
    }
    .patisserie-frame img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      border-radius: 10px;
      display: block;
    }

    /* ─── CONTACT ─── */
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: start;
    }
    .contact-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
    .form-group input, .form-group textarea, .form-group select {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 14px 18px;
      color: var(--white);
      font-family: 'Satoshi', sans-serif;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: rgba(100,75,255,0.4); }
    .contact-form input:focus,
    .contact-form textarea:focus,
    .contact-form select:focus {
      outline: none;
      border-color: rgba(100,75,255,0.5);
      box-shadow: 0 0 0 3px rgba(100,75,255,0.1);
    }
    .form-group textarea { min-height: 120px; resize: vertical; }
    .form-group input::placeholder, .form-group textarea::placeholder { color: rgba(255,255,255,0.3); }
    .contact-info h3 { font-family: 'Clash Display', sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 16px; letter-spacing: 0.01em; }
    .contact-info > p { color: var(--muted); font-size: 16px; line-height: 1.75; margin-bottom: 32px; }
    .contact-rows { display: flex; flex-direction: column; gap: 20px; }
    .contact-row { display: flex; align-items: flex-start; gap: 16px; }
    .contact-row-icon {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: rgba(100,75,255,0.12);
      border: 1px solid rgba(100,75,255,0.25);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .contact-row-text strong { display: block; font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 2px; }
    .contact-row-text span { color: rgba(255,255,255,0.55); font-size: 14px; }
    .send-btn {
      position: relative;
      overflow: visible;
      z-index: 1;
    }
    .send-btn::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      background: #ff4315;
      filter: blur(20px);
      opacity: 0.45;
      z-index: -1;
      animation: ctapulse 3.2s ease-in-out infinite;
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
      background-color: rgba(255,255,255,0.04);
      padding-right: 40px;
    }
    .form-group select option { background: #1a1828; color: white; }
    .form-error {
      display: none;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 14px;
      color: #f87171;
    }
    .form-success { display: none; text-align: center; padding: 48px 20px; }
    .form-success .success-icon { font-size: 52px; margin-bottom: 20px; display: block; }
    .form-success h3 { font-family: 'Clash Display', sans-serif; font-size: 26px; font-weight: 700; margin-bottom: 12px; letter-spacing: 0; }
    .form-success p { color: var(--muted); font-size: 15px; line-height: 1.7; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    /* ─── FOOTER ─── */
    footer {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 48px 0;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 24px;
    }
    .footer-left { display: flex; flex-direction: column; gap: 6px; }
    .footer-copy { font-size: 13px; color: var(--muted); }
    .footer-center { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .footer-center a { font-size: 13px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-center a:hover { color: var(--white); }
    .footer-right { display: flex; align-items: center; gap: 20px; }
    .footer-right a { color: var(--muted); text-decoration: none; font-size: 14px; transition: color 0.2s; display: flex; align-items: center; gap: 6px; }
    .footer-right a:hover { color: var(--white); }

    /* ─── RESPONSIVE ─── */
    @media (max-width: 768px) {
      .orbs { inset: -10%; }
      .orb-1 { width: 360px; height: 360px; }
      .orb-2 { width: 310px; height: 310px; }
      .orb-3 { width: 270px; height: 270px; }
      .services-grid { grid-template-columns: 1fr; }
      .card-full { padding: 28px 24px; }
      .process-grid { grid-template-columns: 1fr; }
      .results-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 900px) {
      .container { padding: 0 24px; }
      .nav-inner { padding: 0 24px; }
      .nav-links { display: none; }
      .hamburger { display: flex; }
      .back-home-link { display: none; }
      section { padding: 72px 0; }
      .services-grid { grid-template-columns: 1fr; }
      .about-grid { grid-template-columns: 1fr; }
      .who-grid { grid-template-columns: 1fr; }
      .patisserie-grid { grid-template-columns: 1fr; }
      .patisserie-frame { max-width: 320px; }
      .contact-grid { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
      .value-props { padding: 60px 24px; }
      .value-props-inner { grid-template-columns: 1fr; }
      .advantage-card { flex-direction: column; }
      .advantage-flags { font-size: 36px; }
      .article-card-inner { padding: 32px 24px; }
      .footer-inner { flex-direction: column; text-align: center; }
      .footer-center { justify-content: center; }
      .footer-right { justify-content: center; }
      .hero { min-height: 80vh; padding: 130px 24px 64px; }
      .card-full { padding: 32px 24px; }
    }

    @media (max-width: 600px) {
      .cta-checks { flex-direction: column; align-items: flex-start; padding: 0 24px; }
    }

    /* ─── COPY LIST ───
       Small orange-dot marker matching the accent language already used
       elsewhere (live-dot, who-icon circles) rather than a generic browser
       bullet - for scannable lists within otherwise-prose sections. */
    .copy-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .copy-list li {
      position: relative;
      padding-left: 26px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.7;
    }
    .copy-list li + li { margin-top: 12px; }
    .copy-list li::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 9px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--orange);
    }
`
