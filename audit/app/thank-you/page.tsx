export const metadata = {
  title: 'Thank You - Kliks Digital',
  description: 'Your Growth Audit application has been received.',
}

export default function ThankYouPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700,800&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div className="bg-base"></div>
      <div className="orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>
      <div className="grain"></div>
      <div className="vignette"></div>

      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">KLIKS<span>.</span></a>
          <a href="/" className="nav-back">&larr; Back to homepage</a>
        </div>
      </nav>

      <main className="wrap">
        <span className="success-icon">🎉</span>
        <h1>Thanks, your request has been received.</h1>
        <p>I&apos;ll review your business personally and email you about the next step.</p>
        <div className="links">
          <a href="/case-studies">See our case studies &rarr;</a>
          <a href="/">Back to homepage</a>
        </div>
      </main>

      <div className="marquee-section">
        <p className="marquee-label">Brands we&apos;ve worked with or built ourselves</p>
        <div className="marquee-track">
          <div className="marquee-inner">
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944284/bragster-logo.png" alt="Bragster" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944284/reset-logo.png" alt="Reset" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944283/tch-logo.png" alt="TCH" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/Sketcha_Logo.png" alt="Sketcha" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/pupcases_logo.png" alt="Pupcases" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/the-billion-roses.png" alt="The Billion Roses" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/bloom-de-luxe.png" alt="Bloom de Luxe" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944284/bragster-logo.png" alt="Bragster" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944284/reset-logo.png" alt="Reset" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776944283/tch-logo.png" alt="TCH" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/Sketcha_Logo.png" alt="Sketcha" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/pupcases_logo.png" alt="Pupcases" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/the-billion-roses.png" alt="The Billion Roses" /></div>
            <div className="marquee-logo"><img src="https://res.cloudinary.com/dfgyuhf8k/image/upload/q_auto/v1776943860/bloom-de-luxe.png" alt="Bloom de Luxe" /></div>
          </div>
        </div>
      </div>
    </>
  )
}

const PAGE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --purple: #644bff;
    --orange: #ff4315;
    --orange-dark: #c42f08;
    --bg: #0e0d1a;
    --bg2: #1a1828;
    --white: #ffffff;
    --muted: rgba(255,255,255,0.55);
  }
  html { scroll-behavior: smooth; }
  body {
    background: var(--bg);
    color: var(--white);
    font-family: 'Satoshi', sans-serif;
    font-size: 16px;
    line-height: 1.7;
    overflow-x: hidden;
    min-height: 100vh;
  }
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
  h1, h2, h3 { font-family: 'Clash Display', sans-serif; letter-spacing: 0.01em; line-height: 1.18; }

  .bg-base {
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(100, 75, 255, 0.10), transparent 60%),
      radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255, 67, 21, 0.05), transparent 60%);
  }
  .orbs { position: absolute; inset: -20%; z-index: 0; filter: blur(80px); opacity: 0.85; pointer-events: none; }
  .orb { position: absolute; border-radius: 50%; mix-blend-mode: screen; }
  .orb-1 {
    width: 720px; height: 720px; left: 8%; top: 4%;
    background: radial-gradient(circle at 30% 30%, rgba(100, 75, 255, 0.55), rgba(100, 75, 255, 0) 65%);
  }
  .orb-2 {
    width: 620px; height: 620px; right: 6%; top: 18%;
    background: radial-gradient(circle at 60% 40%, rgba(255, 67, 21, 0.40), rgba(255, 67, 21, 0) 65%);
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

  nav {
    position: relative;
    z-index: 10;
  }
  .nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 48px;
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
  .nav-back {
    font-size: 14px;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.2s;
  }
  .nav-back:hover { color: var(--white); }

  .wrap {
    position: relative;
    z-index: 1;
    max-width: 560px;
    margin: 0 auto;
    padding: 100px 24px 140px;
    text-align: center;
  }
  .success-icon { font-size: 52px; display: block; margin-bottom: 20px; }
  .wrap h1 { font-size: clamp(30px, 4vw, 42px); font-weight: 700; margin-bottom: 16px; }
  .wrap p { color: var(--muted); font-size: 17px; line-height: 1.7; margin-bottom: 48px; }
  .links { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .links a {
    color: var(--white);
    font-size: 15px;
    font-weight: 500;
    text-decoration: none;
    border-bottom: 1px solid rgba(255,255,255,0.15);
    padding-bottom: 2px;
    transition: border-color 0.2s;
  }
  .links a:hover { border-color: var(--orange); }
  .links a:last-child { color: var(--muted); font-weight: 400; }

  .marquee-section {
    position: relative;
    z-index: 1;
    padding: 24px 0 64px;
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

  @media (max-width: 640px) {
    .nav-inner { padding: 20px 24px; }
    .wrap { padding: 72px 24px 100px; }
  }
`
