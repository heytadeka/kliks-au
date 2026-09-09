import Script from 'next/script'
import GrowthAuditForm from '../GrowthAuditForm'
import { getGrowthAuditAvailability } from '@/lib/growth-audit-cap'

export const metadata = {
  title: 'Free Growth Audit - Kliks Digital',
  description: 'A free growth audit of your ads, store and retention, done personally by Adam, not a template or an automated report.',
}

const BRAND_LOGOS = [
  { name: 'Bragster', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944284/bragster-logo.png' },
  { name: 'Reset', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944284/reset-logo.png' },
  { name: 'TCH', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944283/tch-logo.png' },
  { name: 'Sketcha', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/Sketcha_Logo.png' },
  { name: 'Pupcases', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/pupcases_logo.png' },
  { name: 'The Billion Roses', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/the-billion-roses.png' },
  { name: 'Bloom de Luxe', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/bloom-de-luxe.png' },
  { name: 'Occasionly', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/v1783077834/wordmark-charcoal_lpykw4.png' },
  { name: 'Magniscan', src: 'https://res.cloudinary.com/dfgyuhf8k/image/upload/v1788926791/magniscan_logo_learss.png' },
]

// Layout reference only, not a real client's data - see README note below.
// Swap for a real screenshot or short muted loop of an actual redacted
// audit once Adam has one ready (he's still producing that creative).
const SAMPLE_REPORT = {
  brand: 'Sample Brand',
  scope: 'Reviewed 62 days of Meta and Google data, the full Shopify funnel on desktop and mobile, and the current email and SMS flows.',
  metrics: [
    { label: 'Blended ROAS', value: '2.14' },
    { label: 'Est. POAS', value: '0.86', negative: true },
    { label: 'Mobile CVR', value: '1.1%' },
  ],
  recoverable: '$18.4k',
  findings: [
    { n: '01', title: 'Meta account is fragmented across 14 ad sets', tag: 'Paid media', body: 'Spend is split so thin that no ad set leaves the learning phase. Consolidating into three campaigns with broad targeting should lift delivery efficiency inside a fortnight.', impact: 'High', effort: 'Low' },
    { n: '02', title: 'Mobile product page pushes the add to cart below three scrolls', tag: 'Shopify CRO', body: 'Ninety one percent of your traffic is mobile and the buy box sits under a long description block. Moving price, reviews and add to cart above the fold is the single cheapest win here.', impact: 'High', effort: 'Medium' },
    { n: '03', title: 'Browse abandonment flow is switched off', tag: 'Retention', body: 'Welcome and cart flows are live, browse abandonment is not. On your traffic volume that is a few thousand dollars of recoverable revenue a month, sitting idle.', impact: 'Medium', effort: 'Low' },
    { n: '04', title: 'Creative is all product on white, no founder or UGC angle', tag: 'Creative', body: 'Every top spending ad is a studio shot. Nothing tests the story or the problem, so you have no read on which angle actually sells. Three new concepts are outlined on page nine.', impact: 'Medium', effort: 'Medium' },
  ],
}

export default async function GrowthAuditVariantB() {
  const { total, remaining, monthLabel } = await getGrowthAuditAvailability()
  const spotsFraction = `${remaining} of ${total}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      {/* Meta Pixel - same ID as variant A, needed here too since GrowthAuditForm's
          Lead fire depends on window.fbq already existing */}
      <Script id="fb-pixel-b" strategy="afterInteractive">
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
      {/* Tags this pageview/session as variant B in GA4 - variant A carries no
          such event, so a landing page with none is variant A by inference. */}
      <Script id="ga4-variant-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'audit_variant_view', variant: 'B' });`}
      </Script>

      <link rel="preconnect" href="https://api.fontshare.com" />
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700,800&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div className="vb-root">
        <div className="vb-grain" />

        <nav className="vb-nav">
          <div className="vb-nav-inner">
            <div className="vb-wordmark">KLIKS<span>.</span></div>
            <div className="vb-pill">
              <span className="vb-dot" />
              <span>{spotsFraction} audits left</span>
            </div>
          </div>
        </nav>

        <section className="vb-hero">
          <div className="vb-blob vb-blob-purple" />
          <div className="vb-blob vb-blob-orange" />
          <div className="vb-hero-grid">
            <div>
              <div className="vb-eyebrow"><span>Free growth audit, {monthLabel}</span></div>
              <h1 className="vb-h1">Find out exactly why your Shopify store is leaving money on the table.</h1>
              <p className="vb-sub">A free growth audit of your ads, store and retention, done personally by Adam, not a template or an automated report.</p>
              <div className="vb-capsules">
                <span className="vb-capsule">$7.5M ad spend managed</span>
                <span className="vb-capsule">15 years in ecommerce</span>
                <span className="vb-capsule">Shopify only</span>
              </div>
              <p className="vb-capnote">We cap it at {total} a month because each one takes about three hours. The next batch opens on the first.</p>
            </div>

            <div id="audit-form" className="vb-form-card">
              <div className="vb-form-head">Request your free audit</div>
              <p className="vb-form-sub">Your name, email, store URL and a couple of optional details. No call required to receive it.</p>
              <GrowthAuditForm variant="b" />
              <p className="vb-form-note">{spotsFraction} left this month. We only need read access, nothing is changed in your store.</p>
            </div>
          </div>
        </section>

        <section className="vb-deliverable">
          <div className="vb-section-inner">
            <div className="vb-deliverable-head">
              <div style={{ maxWidth: '60ch' }}>
                <div className="vb-eyebrow-label">See the actual deliverable</div>
                <h2 className="vb-h2">This is what lands in your inbox.</h2>
                <p className="vb-body-p">A real audit, lightly redacted. Findings ranked by what they are costing you, each one with the fix and the effort it takes.</p>
              </div>
              <span className="vb-hint">Hover to pause</span>
            </div>

            <div className="vb-frame">
              <div className="vb-frame-bar">
                <span className="vb-frame-dot" /><span className="vb-frame-dot" /><span className="vb-frame-dot" />
                <span className="vb-frame-name">kliks-growth-audit-sample.pdf</span>
              </div>
              <div className="vb-scroll">
                <div className="vb-track">
                  <div className="vb-report-kicker">Kliks growth audit / prepared by Adam Nagy</div>
                  <div className="vb-report-title">{SAMPLE_REPORT.brand}<span className="vb-orange">.</span> store and paid media review</div>
                  <p className="vb-body-p" style={{ maxWidth: '60ch', marginBottom: 34 }}>{SAMPLE_REPORT.scope}</p>

                  <div className="vb-metric-grid">
                    {SAMPLE_REPORT.metrics.map(m => (
                      <div className="vb-metric-card" key={m.label}>
                        <div className="vb-metric-label">{m.label}</div>
                        <div className="vb-metric-value" style={m.negative ? { color: '#d62828' } : undefined}>{m.value}</div>
                      </div>
                    ))}
                    <div className="vb-metric-card vb-metric-card-orange">
                      <div className="vb-metric-label vb-metric-label-orange">Recoverable / mo</div>
                      <div className="vb-metric-value vb-orange">{SAMPLE_REPORT.recoverable}</div>
                    </div>
                  </div>

                  <div className="vb-eyebrow-label" style={{ marginBottom: 20 }}>Findings, ranked by cost</div>

                  {SAMPLE_REPORT.findings.map(f => (
                    <div className="vb-finding" key={f.n}>
                      <div className="vb-finding-num">{f.n}</div>
                      <div>
                        <div className="vb-finding-head">
                          <span className="vb-finding-title">{f.title}</span>
                          <span className="vb-tag">{f.tag}</span>
                        </div>
                        <p className="vb-finding-body">{f.body}</p>
                        <div className="vb-finding-meta">
                          <span>Impact {f.impact}</span>
                          <span>Effort {f.effort}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="vb-first30">
                    <div className="vb-eyebrow-label vb-purple">First 30 days</div>
                    <p>Consolidate to three campaigns, rebuild the mobile product page above the fold, and turn the browse abandonment flow back on. Everything else waits until these three are live.</p>
                  </div>
                </div>
                <div className="vb-fade" />
              </div>
            </div>
          </div>
        </section>

        <section className="vb-logos">
          <div className="vb-section-inner vb-logos-row">
            <span className="vb-logos-label">Brands we have built or worked with</span>
            <div className="vb-logos-list">
              {BRAND_LOGOS.map(b => (
                <img key={b.name} src={b.src} alt={b.name} className="vb-logo-img" />
              ))}
            </div>
          </div>
        </section>

        <section className="vb-founder">
          <div className="vb-section-inner vb-founder-grid">
            <div className="vb-founder-photo-wrap">
              <div className="vb-founder-glow" />
              <img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/v1784785244/adam.nagy.photojpg_rr4djf.jpg" alt="Adam Nagy, Kliks founder" className="vb-founder-photo" />
            </div>
            <div style={{ maxWidth: '60ch' }}>
              <div className="vb-eyebrow-label">Who does the audit</div>
              <h2 className="vb-h2-block">Adam Nagy, and nobody else.</h2>
              <p className="vb-body-p" style={{ marginBottom: 16 }}>Fifteen years in ecommerce, roughly $7.5M in ad spend managed, and my own Shopify brands running on the same playbook. I have burned my own money on the mistakes I look for in your store.</p>
              <p className="vb-body-p" style={{ marginBottom: 26 }}>You get my read on it, in writing, whether or not we ever work together. No pitch deck, no retainer talk unless you raise it.</p>
              <div className="vb-capsules">
                <span className="vb-capsule vb-capsule-alt">Founder, Kliks Digital</span>
                <span className="vb-capsule vb-capsule-alt">Meta, Google, TikTok</span>
              </div>
            </div>
          </div>
        </section>

        <section className="vb-final-cta">
          <div className="vb-blob vb-blob-final" />
          <div className="vb-final-inner">
            <h2 className="vb-h2">{spotsFraction} audits left this month.</h2>
            <p className="vb-sub" style={{ margin: '0 auto 34px' }}>Once they are taken, the next batch opens on the first. Takes about a minute to ask for yours.</p>
            <div className="vb-final-btn-wrap">
              <a href="#audit-form" className="vb-btn vb-btn-lg">Request my free audit</a>
            </div>
            <p className="vb-qualifier">Shopify stores spending $3k or more a month</p>
          </div>
        </section>

        <footer className="vb-footer">
          <div className="vb-section-inner vb-footer-inner">
            <div className="vb-wordmark" style={{ fontSize: 16 }}>KLIKS<span>.</span></div>
            <span className="vb-hint">Melbourne and Budapest / kliks.com.au</span>
          </div>
        </footer>
      </div>
    </>
  )
}

const PAGE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .vb-root {
    --bg: #f7f6f9;
    --bg2: #eeecf3;
    --orange: #ff4315;
    --orange-dark: #c42f08;
    --orange-on-tint: #c42f08;
    --purple: #644bff;
    --purple-light: #4a33d6;
    --ink: #14131f;
    --muted: rgba(20,19,31,0.72);
    --muted-soft: rgba(20,19,31,0.68);
    --faint: rgba(20,19,31,0.34);
    --surface: rgba(20,19,31,0.035);
    --border: rgba(20,19,31,0.08);
    --border-2: rgba(20,19,31,0.12);
    --pill-bg: rgba(20,19,31,0.04);
    --pill-border: rgba(20,19,31,0.1);
    position: relative;
    width: 100%;
    min-height: 100%;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Satoshi', sans-serif;
    overflow-x: hidden;
  }
  .vb-root a { color: var(--orange); text-decoration: none; }
  .vb-root a:hover { color: var(--ink); }
  html { scroll-behavior: smooth; }
  #audit-form { scroll-margin-top: 100px; }

  .vb-grain {
    position: fixed; inset: 0; z-index: 3; pointer-events: none; opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  @keyframes vbDrift { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.12); } 100% { transform: translate(0,0) scale(1); } }
  @keyframes vbPulse { 0% { box-shadow: 0 0 0 0 rgba(255,67,21,0.45); } 70% { box-shadow: 0 0 0 10px rgba(255,67,21,0); } 100% { box-shadow: 0 0 0 0 rgba(255,67,21,0); } }
  @keyframes vbReport { 0% { transform: translateY(0); } 8% { transform: translateY(0); } 92% { transform: translateY(calc(-100% + 470px)); } 100% { transform: translateY(calc(-100% + 470px)); } }

  .vb-nav {
    position: sticky; top: 0; z-index: 5;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    background: rgba(247,246,249,0.86);
    border-bottom: 1px solid rgba(20,19,31,0.09);
  }
  .vb-nav-inner { max-width: 1200px; margin: 0 auto; padding: 16px 48px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .vb-wordmark { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -0.5px; }
  .vb-wordmark span { color: var(--orange); }
  .vb-pill { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 100px; background: var(--pill-bg); border: 1px solid var(--pill-border); backdrop-filter: blur(6px); font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
  .vb-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--orange); animation: vbPulse 3.2s ease-in-out infinite; }

  .vb-hero { position: relative; overflow: hidden; }
  .vb-blob { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
  .vb-blob-purple { top: -140px; left: -120px; width: 520px; height: 520px; background: rgba(100,75,255,0.16); animation: vbDrift 18s ease-in-out infinite; }
  .vb-blob-orange { top: 180px; right: -160px; width: 460px; height: 460px; background: rgba(255,67,21,0.12); animation: vbDrift 24s ease-in-out infinite reverse; }
  .vb-blob-final { bottom: -200px; left: 50%; margin-left: -320px; width: 640px; height: 520px; background: rgba(255,67,21,0.12); animation: vbDrift 22s ease-in-out infinite; }

  .vb-hero-grid { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 76px 48px 84px; display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 56px; align-items: start; }

  .vb-eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 9px 18px; border-radius: 100px; background: rgba(255,67,21,0.1); border: 1px solid rgba(255,67,21,0.28); backdrop-filter: blur(6px); margin-bottom: 28px; }
  .vb-eyebrow span { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--orange-on-tint); }

  .vb-h1 { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: clamp(36px, 4vw, 58px); line-height: 1.06; letter-spacing: -2px; margin-bottom: 22px; text-wrap: pretty; }
  .vb-sub { font-size: 18px; line-height: 1.65; color: var(--muted); margin-bottom: 32px; max-width: 52ch; }
  .vb-capsules { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  .vb-capsule { padding: 8px 14px; border-radius: 100px; background: var(--pill-bg); border: 1px solid var(--pill-border); font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
  .vb-capsule-alt { background: rgba(20,19,31,0.035); }
  .vb-capnote { font-size: 13px; line-height: 1.65; color: var(--muted-soft); max-width: 52ch; }

  .vb-form-card { padding: 36px; border-radius: 20px; background: #fff; border: 1px solid rgba(20,19,31,0.09); box-shadow: 0 24px 60px rgba(20,19,31,0.1); }
  .vb-form-head { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 24px; letter-spacing: -0.3px; margin-bottom: 6px; }
  .vb-form-sub { font-size: 14.5px; color: var(--muted); line-height: 1.6; margin-bottom: 26px; }
  .vb-form-note { font-size: 13px; color: var(--muted-soft); line-height: 1.6; margin-top: 16px; text-align: center; }

  /* Reused GrowthAuditForm, restyled for the light card */
  .vb-form-card .contact-form { display: flex; flex-direction: column; gap: 16px; }
  .vb-form-card .form-group { display: flex; flex-direction: column; gap: 8px; }
  .vb-form-card .form-group label { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted-soft); }
  .vb-form-card .form-group input, .vb-form-card .form-group select, .vb-form-card .form-group textarea {
    background: rgba(20,19,31,0.04); border: 1px solid var(--border-2); border-radius: 10px;
    padding: 14px 16px; color: var(--ink); font-family: 'Satoshi', sans-serif; font-size: 15px; outline: none; width: 100%;
  }
  .vb-form-card .form-group input::placeholder, .vb-form-card .form-group textarea::placeholder { color: rgba(20,19,31,0.35); }
  .vb-form-card .form-group input:focus, .vb-form-card .form-group select:focus, .vb-form-card .form-group textarea:focus { border-color: rgba(100,75,255,0.45); box-shadow: 0 0 0 3px rgba(100,75,255,0.1); }
  .vb-form-card .form-group select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(20,19,31,0.45)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; padding-right: 40px; }
  .vb-form-card .form-group select option { background: #fff; color: var(--ink); }
  .vb-form-card .form-group textarea { min-height: 100px; resize: vertical; }
  .vb-form-card .form-error { background: rgba(214,40,40,0.08); border: 1px solid rgba(214,40,40,0.2); border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #d62828; }
  .vb-form-card .btn, .vb-form-card .send-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
    background: var(--orange); color: #fff; border: none; border-radius: 100px; padding: 18px 32px;
    font-family: 'Satoshi', sans-serif; font-weight: 600; font-size: 17px; cursor: pointer; transition: background 0.2s ease, transform 0.2s ease;
    position: relative; animation: vbPulse 3.2s ease-in-out infinite;
  }
  .vb-form-card .btn:hover { background: var(--orange-dark); transform: translateY(-2px); }
  .vb-form-card .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; animation: none; }
  .vb-form-card .contact-form > p:last-child { font-size: 13px; color: var(--muted-soft); text-align: center; margin-top: 4px; }

  .vb-section-inner { max-width: 1200px; margin: 0 auto; padding: 96px 48px; }
  .vb-deliverable { position: relative; z-index: 2; background: var(--bg2); border-top: 1px solid rgba(20,19,31,0.08); }
  .vb-deliverable-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 38px; }
  .vb-eyebrow-label { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--orange); margin-bottom: 16px; }
  .vb-eyebrow-label.vb-purple { color: var(--purple-light); }
  .vb-h2 { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: clamp(34px, 4vw, 52px); line-height: 1.1; letter-spacing: -0.3px; margin-bottom: 14px; text-wrap: pretty; }
  .vb-h2-block { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: clamp(28px, 3vw, 36px); line-height: 1.12; letter-spacing: -0.3px; margin-bottom: 18px; }
  .vb-body-p { font-size: 16px; line-height: 1.75; color: var(--muted); }
  .vb-hint { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted-soft); }

  .vb-frame { border-radius: 20px; border: 1px solid var(--border-2); background: var(--surface); overflow: hidden; box-shadow: 0 18px 50px rgba(20,19,31,0.09); }
  .vb-frame-bar { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--border); background: rgba(20,19,31,0.02); }
  .vb-frame-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(20,19,31,0.18); }
  .vb-frame-name { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--muted-soft); margin-left: 12px; }
  .vb-scroll { height: 470px; overflow: hidden; position: relative; }
  .vb-track { padding: 46px 54px 60px; animation: vbReport 26s ease-in-out infinite alternate; }
  .vb-frame:hover .vb-track { animation-play-state: paused; }
  @media (prefers-reduced-motion: reduce) { .vb-track { animation: none; transform: translateY(0); } }
  .vb-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 90px; background: linear-gradient(to top, #e9e7ef, rgba(233,231,239,0)); pointer-events: none; }

  .vb-report-kicker { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--purple-light); margin-bottom: 18px; }
  .vb-report-title { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 40px; line-height: 1.1; letter-spacing: -1px; margin-bottom: 12px; }
  .vb-orange { color: var(--orange); }

  .vb-metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 38px; }
  .vb-metric-card { padding: 20px; border-radius: 16px; background: rgba(20,19,31,0.03); border: 1px solid var(--border); }
  .vb-metric-card-orange { background: rgba(255,67,21,0.1); border-color: rgba(255,67,21,0.24); }
  .vb-metric-label { font-family: 'Space Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted-soft); margin-bottom: 10px; }
  .vb-metric-label-orange { color: var(--orange-on-tint); }
  .vb-metric-value { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 30px; }

  .vb-finding { display: grid; grid-template-columns: 52px 1fr; gap: 20px; padding: 24px 0; border-top: 1px solid var(--border); }
  .vb-finding-num { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 26px; color: var(--faint); }
  .vb-finding-head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 10px; }
  .vb-finding-title { font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 19px; }
  .vb-tag { padding: 5px 11px; border-radius: 100px; background: rgba(100,75,255,0.12); border: 1px solid rgba(100,75,255,0.25); font-family: 'Space Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--purple-light); }
  .vb-finding-body { color: var(--muted); font-size: 14.5px; line-height: 1.7; margin-bottom: 12px; max-width: 66ch; }
  .vb-finding-meta { display: flex; flex-wrap: wrap; gap: 22px; font-family: 'Space Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted-soft); }

  .vb-first30 { margin-top: 34px; padding: 28px 30px; border-radius: 16px; background: rgba(100,75,255,0.08); border: 1px solid rgba(100,75,255,0.2); }
  .vb-first30 p { color: rgba(20,19,31,0.72); font-size: 15px; line-height: 1.75; max-width: 64ch; }

  .vb-logos { position: relative; z-index: 2; border-top: 1px solid rgba(20,19,31,0.08); border-bottom: 1px solid rgba(20,19,31,0.08); }
  .vb-logos-row { padding: 44px 48px; display: flex; flex-wrap: wrap; align-items: center; gap: 28px 44px; }
  .vb-logos-label { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted-soft); white-space: nowrap; }
  .vb-logos-list { display: flex; flex-wrap: wrap; align-items: center; gap: 18px 40px; flex: 1; }
  .vb-logo-img { height: 26px; width: auto; object-fit: contain; filter: brightness(0); opacity: 0.55; transition: opacity 0.25s ease; }
  .vb-logo-img:hover { opacity: 1; }

  .vb-founder { position: relative; z-index: 2; background: var(--bg2); border-top: 1px solid rgba(20,19,31,0.08); }
  .vb-founder-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 52px; align-items: center; }
  .vb-founder-photo-wrap { max-width: 300px; position: relative; }
  .vb-founder-glow { position: absolute; inset: -18px; border-radius: 24px; background: rgba(100,75,255,0.16); filter: blur(40px); pointer-events: none; }
  .vb-founder-photo { position: relative; display: block; width: 100%; height: 340px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border-2); }

  .vb-final-cta { position: relative; overflow: hidden; }
  .vb-final-inner { position: relative; z-index: 2; max-width: 760px; margin: 0 auto; padding: 100px 48px; text-align: center; }
  .vb-final-btn-wrap { display: inline-block; border-radius: 100px; animation: vbPulse 3.2s ease-in-out infinite; }
  .vb-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--orange); color: #fff; border-radius: 100px; padding: 18px 40px; font-weight: 600; font-size: 17px; transition: background 0.2s ease, transform 0.2s ease; }
  .vb-btn:hover { background: var(--orange-dark); transform: translateY(-2px); color: #fff; }
  .vb-btn-lg { padding: 20px 48px; font-size: 18px; }
  .vb-qualifier { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted-soft); margin-top: 26px; }

  .vb-footer { position: relative; z-index: 2; border-top: 1px solid rgba(20,19,31,0.09); }
  .vb-footer-inner { padding: 30px 48px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }

  @media (max-width: 900px) {
    .vb-section-inner { padding: 72px 24px; }
    .vb-hero-grid { padding: 60px 24px 64px; }
    .vb-nav-inner { padding: 16px 24px; }
    .vb-logos-row, .vb-footer-inner { padding: 30px 24px; }
  }
`
