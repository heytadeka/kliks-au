'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveOrganicStats } from '@/lib/organic-stats'

const S = {
  bg: '#0e0d1a',
  bg2: '#1a1828',
  purple: '#644bff',
  orange: '#ff4315',
  orangeDark: '#c42f08',
  white: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  border: 'rgba(100,75,255,0.12)',
}

const MONO = "'Space Mono', ui-monospace, monospace"

// Shared revenue-model assumptions. Every dollar-impact calculation on this
// page (revCalc's three initiatives, and the "What this costs you" box) must
// use these same two constants - traffic alone isn't revenue, it becomes
// revenue via a conversion rate and an average order value. Defined once so
// the two can't silently diverge into two different formulas for what's
// meant to be the same underlying model, which is what happened before.
const ASSUMED_CONVERSION_RATE = 0.015
const ASSUMED_AOV = 150

function MetricCard({ label, value, unit, status, description, target, benchmark }: { label: string; value: string | number; unit?: string; status: 'good' | 'needs-work' | 'poor' | 'neutral'; description?: string; target?: string; benchmark?: string }) {
  const colours = { good: '#22c55e', 'needs-work': '#f97316', poor: '#ef4444', neutral: S.purple }
  const c = colours[status]
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, color: c }}>{value}{unit && <span style={{ fontSize: 16, marginLeft: 4, color: S.muted }}>{unit}</span>}</span>
      {benchmark && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.38)', marginBottom: 4, letterSpacing: '0.08em' }}>{benchmark}</span>}
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: S.muted }}>{label}</span>
      {description && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>{description}</span>}
      {target && <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em' }}>Target: {target}</span>}
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: c, background: `${c}22`, padding: '2px 8px', borderRadius: 99, alignSelf: 'flex-start', letterSpacing: '0.12em' }}>
        {status === 'good' ? 'GOOD' : status === 'needs-work' ? 'NEEDS WORK' : status === 'poor' ? 'POOR' : '-'}
      </span>
    </div>
  )
}

const SCORE_COLORS: Record<string, { c: string; soft: string; line: string }> = {
  good:         { c: '#34d296', soft: 'rgba(52,210,150,0.13)',  line: 'rgba(52,210,150,0.35)' },
  'needs-work': { c: '#f5a623', soft: 'rgba(245,166,35,0.13)',  line: 'rgba(245,166,35,0.35)' },
  poor:         { c: '#ff4315', soft: 'rgba(255,67,21,0.13)',   line: 'rgba(255,67,21,0.35)'  },
  neutral:      { c: '#644bff', soft: 'rgba(100,75,255,0.13)',  line: 'rgba(100,75,255,0.35)' },
}

const SCORE_DESC_FALLBACKS: Record<string, string> = {
  mobile:        'Slow on phones, where most shoppers browse and buy.',
  desktop:       'Desktop loads quickly but most of your traffic is mobile.',
  seo:           'You show up in search, but not yet where the buyers are.',
  accessibility: 'Readable for most visitors, with some quick wins available.',
  cro:           "Visitors aren't converting at the rate they could.",
  overall:       'A good business held back by an underperforming store.',
}

function ScoreRing({ label, pct, centerText, unitText, status, benchmark, desc, revealed }: {
  label: string
  pct: number | null
  centerText: string | number
  unitText?: string
  status: 'good' | 'needs-work' | 'poor' | 'neutral'
  benchmark?: string
  desc?: string
  revealed: boolean
}) {
  const colors = SCORE_COLORS[status] ?? SCORE_COLORS.neutral
  const circ = 339.29
  const filled = pct != null ? Math.max(0, Math.min(100, pct)) : 0
  const dashOffset = (pct != null && revealed) ? circ * (1 - filled / 100) : circ
  const badgeLabel = status === 'good' ? 'GOOD' : status === 'needs-work' ? 'NEEDS WORK' : status === 'poor' ? 'POOR' : '-'
  const ct = String(centerText)
  const isGrade = ct.length === 1 && /^[A-DF]$/.test(ct)
  const centerFontSize = isGrade ? 46 : 38
  return (
    <div className="score-card" style={{ background: S.bg2, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Corner radial glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 160, height: 160, background: `radial-gradient(circle at top right, ${colors.soft} 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
      {/* Top row: label + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '11ch' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: colors.c, background: colors.soft, border: `1px solid ${colors.line}`, padding: '3px 9px', borderRadius: 100, flexShrink: 0, marginLeft: 8 }}>{badgeLabel}</span>
      </div>
      {/* Ring */}
      <div style={{ position: 'relative', width: 130, height: 130, marginBottom: 12, zIndex: 1 }}>
        <svg width="130" height="130" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          <circle
            cx="65" cy="65" r="54" fill="none"
            stroke={colors.c} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={circ.toFixed(2)}
            strokeDashoffset={dashOffset.toFixed(2)}
            className="score-ring-prog"
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.2,0.8,0.2,1)', filter: `drop-shadow(0 0 8px ${colors.c}80)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"Clash Display", sans-serif', fontWeight: 600, fontSize: centerFontSize, color: isGrade ? colors.c : '#fff', lineHeight: 1 }}>{centerText}</span>
          {unitText && <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 3 }}>{unitText}</span>}
        </div>
      </div>
      {/* Target line */}
      {benchmark && <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: desc ? 8 : 0, position: 'relative', zIndex: 1 }}>{benchmark}</span>}
      {/* AI description */}
      {desc && <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, margin: 0, position: 'relative', zIndex: 1 }}>{desc}</p>}
    </div>
  )
}

function getStatus(value: number, thresholds: [number, number]): 'good' | 'needs-work' | 'poor' {
  if (value <= thresholds[0]) return 'good'
  if (value <= thresholds[1]) return 'needs-work'
  return 'poor'
}

function msToS(ms: number) { return (ms / 1000).toFixed(2) }

function fmtNum(n: number): string {
  const v = Math.round(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1000)}K`
  return v.toLocaleString()
}

function fmtVol(n: number): string {
  return Math.round(n).toLocaleString()
}

function cleanDomain(d: string): string {
  if (!d) return '-'
  let out = d.replace(/^https?:\/\//, '').replace(/^www\./, '')
  if (out.length > 30) out = out.slice(0, 29) + '…'
  return out
}

function AdamsTake({ text }: { text?: string | null }) {
  if (!text) return null
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderLeft: `3px solid ${S.orange}`, borderRadius: 12, padding: 24, marginTop: 24 }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 10 }}>ADAM&apos;S COMMENTS FROM KLIKS</span>
      <p style={{ color: S.white, lineHeight: 1.8, fontSize: 16, margin: 0 }}>{text}</p>
    </div>
  )
}

export default function ReportClient({ prospect, content, cache }: { prospect: any; content: any; cache: any }) {
  const ps = cache?.pagespeed_mobile
  const psDesktop = cache?.pagespeed_desktop
  const cro = cache?.cro_checklist
  const dfsOverview = cache?.dataforseo_overview
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dfsKeywords: any[] = useMemo(() => cache?.dataforseo_keywords ?? [], [cache?.dataforseo_keywords])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dfsGaps: any[] = useMemo(() => cache?.dataforseo_gaps ?? [], [cache?.dataforseo_gaps])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dfsCompetitors: any[] = useMemo(() => cache?.dataforseo_competitors ?? [], [cache?.dataforseo_competitors])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dfsContentGap: any[] = useMemo(() => cache?.dataforseo_content_gap ?? [], [cache?.dataforseo_content_gap])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seoFindings = content?.seo_findings as any[] | null
  const gmbData = cache?.gmb_data as any
  const backlinksSummary = cache?.backlinks_summary
  const gads = cache?.google_ads_planner
  const metaAds = cache?.meta_ads
  const scoreDescs = content?.score_descriptions as Record<string, string> | null
  const hookHeadline = content?.hook_headline as { line1: string; line2: string; subtext?: string } | null

  const auditDate = new Date(prospect.created_at)
  const issuedMonth = auditDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const issuedYear = auditDate.getFullYear()
  const auditRef = (() => {
    if (!prospect.id) return 'KL-0000'
    const hex = String(prospect.id).replace(/-/g, '').slice(-6)
    return `KL-${String(parseInt(hex, 16) % 10000).padStart(4, '0')}`
  })()
  const headerDomain = (prospect.store_url ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

  // Revenue calculations
  const revCalc = useMemo(() => {
    const results: any[] = []
    if (ps?.lcp) {
      const lcpS = ps.lcp / 1000
      if (lcpS > 2.5) {
        const traffic = dfsOverview?.metrics?.organic?.etv ?? 500
        // traffic -> revenue via conversion rate and AOV, same shape as the
        // "What this costs you" box - $150 is per order, not per visitor.
        const mobile = (lcpS - 2.5) * 0.07 * (traffic * ASSUMED_CONVERSION_RATE * ASSUMED_AOV * 12)
        results.push({ initiative: 'Mobile Performance', confidence: lcpS > 4 ? 'High' : 'Medium', impact: mobile, note: null })
      }
    }
    if (cro?.summary) {
      const failedHigh = cro.summary.critical_issues ?? 0
      const traffic = dfsOverview?.metrics?.organic?.etv ?? 500
      const croImpact = failedHigh * 0.03 * (traffic * ASSUMED_CONVERSION_RATE * ASSUMED_AOV * 12)
      if (croImpact > 0) {
        results.push({ initiative: 'CRO Improvements', confidence: failedHigh > 2 ? 'High' : 'Medium', impact: croImpact, note: null })
      }
    }
    if (dfsGaps?.length > 0) {
      const topGapsVol = dfsGaps.slice(0, 3).reduce((sum: number, g: any) => sum + (g.keyword_data?.keyword_info?.search_volume ?? 0), 0)
      // topGapsVol is a visitor-like quantity (search volume) here, same role
      // "traffic" plays above - same conversion-rate/AOV shape applies.
      const seoImpact = topGapsVol * 0.02 * ASSUMED_CONVERSION_RATE * ASSUMED_AOV * 12
      results.push({ initiative: 'SEO Content Gap', confidence: 'Medium', impact: seoImpact, note: null })
    }

    return results
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps, cro, dfsOverview, dfsGaps])

  const totalRevImpact = revCalc.filter(r => r.impact).reduce((sum: number, r: any) => sum + r.impact, 0)

  const kwEtv = useMemo(() => resolveOrganicStats(dfsOverview, dfsKeywords).monthlyTraffic, [dfsOverview, dfsKeywords])

  const failedByCategory = useMemo(() => {
    if (!cro?.results) return {} as Record<string, any[]>
    const groups: Record<string, any[]> = {}
    for (const item of cro.results) {
      if (!item.passed) {
        if (!groups[item.category]) groups[item.category] = []
        groups[item.category].push(item)
      }
    }
    return groups
  }, [cro])

  const passedItems = useMemo(() => {
    if (!cro?.results) return [] as any[]
    return cro.results.filter((item: any) => item.passed)
  }, [cro])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kwBuckets = useMemo(() => {
    const isBlog = (url: string) => url.includes('/blog/') || url.includes('/blogs/')
    const minVol = 100
    const winning = dfsKeywords
      .filter((kw: any) => {
        const pos = kw.ranked_serp_element?.serp_item?.rank_group
        const url = kw.ranked_serp_element?.serp_item?.url ?? ''
        const vol = kw.keyword_data?.keyword_info?.search_volume ?? 0
        return pos >= 1 && pos <= 5 && vol >= minVol && !isBlog(url)
      })
      .sort((a: any, b: any) => (a.ranked_serp_element?.serp_item?.rank_group ?? 99) - (b.ranked_serp_element?.serp_item?.rank_group ?? 99))
      .slice(0, 15)
    const close = dfsKeywords
      .filter((kw: any) => {
        const pos = kw.ranked_serp_element?.serp_item?.rank_group
        const url = kw.ranked_serp_element?.serp_item?.url ?? ''
        const vol = kw.keyword_data?.keyword_info?.search_volume ?? 0
        return pos >= 6 && pos <= 15 && vol >= minVol && !isBlog(url)
      })
      .sort((a: any, b: any) => (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0))
      .slice(0, 10)
    // Money: use dfsGaps (serp intersection) if available, otherwise fall back to dfsContentGap
    const moneySource = dfsGaps.length > 0 ? dfsGaps : dfsContentGap
    const money = [...moneySource]
      .sort((a: any, b: any) => (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0))
      .slice(0, 10)
    return { winning, close, money }
  }, [dfsKeywords, dfsContentGap, dfsGaps])

  // ── Sequential section numbers, accounts for conditional sections so there are never gaps ──
  const sectionNums = useMemo(() => {
    const map: Record<string, string> = {}
    let n = 1
    const pad = (x: number) => String(x).padStart(2, '0')
    map.scores = pad(n++)
    map.performance = pad(n++)
    map.cro = pad(n++)
    if (gmbData) map.gmb = pad(n++)
    map.ads = pad(n++)
    if (content?.section_strategy_headline || content?.section_strategy_body) map.strategy = pad(n++)
    map.seo = pad(n++)
    map.priorities = pad(n++)
    if (content?.section_seo_headline) map.seoCommentary = pad(n++)
    if (content?.ai_opportunity_commentary || content?.section_opportunity_headline) map.opportunity = pad(n++)
    if (revCalc.length > 0) map.revenue = pad(n++)
    map.appendix = pad(n++)
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmbData, content?.section_strategy_headline, content?.section_strategy_body, content?.section_seo_headline, content?.ai_opportunity_commentary, content?.section_opportunity_headline, revCalc.length])

  // ── Score ring animation ──
  const [scoresRevealed, setScoresRevealed] = useState(false)
  const scoresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setScoresRevealed(true); return }
    const el = scoresRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setScoresRevealed(true); obs.disconnect() }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── Cinematic header animation ──
  const [headerRevealed, setHeaderRevealed] = useState(false)
  const [displayRevenue, setDisplayRevenue] = useState(0)
  const hasRevenue = totalRevImpact > 100

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setHeaderRevealed(true)
      setDisplayRevenue(totalRevImpact)
      return
    }
    const t1 = setTimeout(() => setHeaderRevealed(true), 60)
    const target = totalRevImpact
    if (target <= 0) return () => clearTimeout(t1)
    let raf: number
    const t2 = setTimeout(() => {
      const startTime = performance.now()
      const dur = 1000
      function tick(now: number) {
        const elapsed = now - startTime
        if (elapsed >= dur) { setDisplayRevenue(target); return }
        const eased = 1 - Math.pow(1 - elapsed / dur, 3)
        setDisplayRevenue(Math.round(eased * target))
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, 700)
    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topCompetitor = (() => {
    const comps = cache?.dataforseo_competitors as any[] | null
    if (!comps || comps.length === 0) return null
    return comps
      .filter((c: any) => c.domain)
      .sort((a: any, b: any) => {
        const ta = a.estimated_traffic ?? a.full_domain_metrics?.organic?.etv ?? 0
        const tb = b.estimated_traffic ?? b.full_domain_metrics?.organic?.etv ?? 0
        return tb - ta
      })[0] ?? null
  })()
  const topCompDomain: string | null = topCompetitor?.domain ?? null
  const topCompTraffic: number = topCompetitor
    ? (topCompetitor.estimated_traffic ?? topCompetitor.full_domain_metrics?.organic?.etv ?? 0)
    : 0
  const lcpDisplayValue: string | null =
    (cache?.pagespeed_mobile as any)?.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue
    ?? (ps?.lcp ? `${(ps.lcp / 1000).toFixed(1)} s` : null)

  const navStyle: React.CSSProperties = {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(14,13,26,0.9)', backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${S.border}`,
    padding: '0 24px', height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      {/* Texture overlays */}
      <div className="grain" />
      <div className="scan-lines" />

      {/* Sticky nav */}
      <nav style={navStyle}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <span style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 600, color: S.white }}>{prospect.brand_name}</span>
        <a href={prospect.cta_link || '/book'} style={{ background: S.orange, color: '#fff', borderRadius: 100, padding: '10px 24px', textDecoration: 'none', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}>Book a call</a>
      </nav>

      <div>

        {/* ── Global styles ── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
          @keyframes scanSweep { 0%{top:-2px;opacity:0} 4%{opacity:1} 90%{opacity:1} 100%{top:calc(100% + 2px);opacity:0} }
          @keyframes blink { 50% { opacity: .25 } }
          /* header animation */
          .hdr-el { opacity: 0; transform: translateY(12px); transition: opacity 0.55s ease, transform 0.55s ease; }
          .hdr-el.revealed { opacity: 1; transform: translateY(0); }
          /* score rings */
          .scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
          .score-card { transition: transform 0.2s ease, border-color 0.4s; }
          .score-card:hover { transform: translateY(-3px); }
          /* grain + scan overlays */
          .grain { position: fixed; inset: 0; pointer-events: none; z-index: 200; opacity: .05; mix-blend-mode: overlay;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
          .scan-lines { position: fixed; inset: 0; pointer-events: none; z-index: 199; opacity: .4;
            background: repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,.18) 3px, transparent 4px); mix-blend-mode: multiply; }
          /* layout */
          .wrap { max-width: 1200px; margin: 0 auto; padding: 0 40px; position: relative; }
          .bg2-section { background: #1a1828; }
          .divider { height: 1px; background: rgba(255,255,255,0.09); max-width: 1200px; margin: 0 auto; }
          /* hero */
          .hero { padding: 38px 0 120px; position: relative; overflow: hidden; }
          .hero-grid { position: absolute; inset: 0; z-index: 0;
            background-image: linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px);
            background-size: 64px 64px; mask-image: radial-gradient(120% 90% at 70% 0%, #000 0%, transparent 70%); opacity: .5; }
          .hero-glow { position: absolute; z-index: 0; width: 760px; height: 760px; border-radius: 50%;
            background: radial-gradient(circle, rgba(100,75,255,.34), transparent 62%); top: -280px; right: -160px; filter: blur(20px); }
          .hero-glow-o { background: radial-gradient(circle, rgba(255,67,21,.20), transparent 64%); top: 240px; left: -260px; width: 620px; height: 620px; position: absolute; z-index: 0; border-radius: 50%; }
          .hero .wrap { z-index: 2; position: relative; }
          /* topbar */
          .topbar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 60px; }
          .logo { display: flex; align-items: center; gap: 13px; font-family: 'Clash Display', sans-serif; font-weight: 600; font-size: 22px; color: #fff; letter-spacing: -.01em; text-decoration: none; }
          .logo .mark { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #644bff, #ff4315); display: grid; place-items: center; position: relative; box-shadow: 0 0 24px rgba(100,75,255,.5); flex-shrink: 0; }
          .logo .mark::after { content: ""; width: 11px; height: 11px; border: 2.5px solid #fff; border-radius: 50%; display: block; }
          .topmeta { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .22em; color: rgba(255,255,255,0.38); text-align: right; line-height: 2; }
          /* confidential pills */
          .confidential { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; margin-bottom: 42px; }
          .conf-pill { border: 1px solid rgba(255,255,255,0.14); padding: 7px 14px; border-radius: 100px; color: rgba(255,255,255,0.72); font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .1em; }
          .conf-pill.live { color: #ff4315; border-color: rgba(255,67,21,.4); display: inline-flex; align-items: center; gap: 8px; }
          .conf-pill.live::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ff4315; box-shadow: 0 0 10px #ff4315; animation: blink 1.6s infinite; }
          /* hook */
          .hook { font-family: 'Clash Display', sans-serif; font-weight: 500; color: #fff; letter-spacing: -.02em; line-height: 1.04; font-size: clamp(38px, 6.2vw, 82px); max-width: 16ch; margin-bottom: 30px; }
          .hook .hl { color: #ff4315; }
          .hero-sub { font-size: clamp(18px, 1.6vw, 22px); color: rgba(255,255,255,0.72); max-width: 54ch; line-height: 1.55; margin: 0; }
          /* hero figure */
          .hero-figure { margin-top: 84px; display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: end; border-top: 1px solid rgba(255,255,255,0.14); padding-top: 46px; }
          .fig-label { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: .26em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 20px; }
          .fig-num { font-family: 'Clash Display', sans-serif; font-weight: 600; color: #fff; letter-spacing: -.03em; line-height: .86; font-size: clamp(86px, 17vw, 230px); background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,.62)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
          .fig-num .per { font-size: .26em; color: #ff4315; -webkit-text-fill-color: #ff4315; letter-spacing: 0; margin-left: .05em; }
          .fig-note { font-size: 17px; color: rgba(255,255,255,0.55); max-width: 30ch; text-align: right; padding-bottom: 18px; margin: 0; }
          /* section shell */
          .section-pad { padding: 118px 0; }
          .sec-head { margin-bottom: 64px; max-width: 760px; }
          .eyebrow-row { display: flex; align-items: baseline; gap: 20px; margin-bottom: 26px; }
          .sec-num-label { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: .2em; color: #ff4315; }
          .kicker { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: .32em; text-transform: uppercase; color: rgba(255,255,255,0.38); display: inline-flex; align-items: center; gap: 12px; }
          .kicker .dot { width: 6px; height: 6px; background: #ff4315; border-radius: 50%; box-shadow: 0 0 12px #ff4315; flex-shrink: 0; }
          .sec-title { font-family: 'Clash Display', sans-serif; font-weight: 600; color: #fff; line-height: 1.02; letter-spacing: -.01em; font-size: clamp(34px, 4.6vw, 60px); margin: 0; }
          .sec-lead { font-size: clamp(18px, 1.5vw, 21px); color: rgba(255,255,255,0.72); max-width: 60ch; margin-top: 22px; margin-bottom: 0; line-height: 1.55; }
          /* CRO two-column */
          .cro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
          .cro-col { border: 1px solid rgba(255,255,255,0.09); border-radius: 20px; padding: 36px; background: #1a1828; }
          .cro-col.miss { background: linear-gradient(180deg, rgba(255,67,21,.06), transparent), #1a1828; border-color: rgba(255,67,21,.18); }
          .cro-col h3 { font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 24px; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 12px; }
          .cro-col .cro-sub { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 28px; }
          .cro-item-new { display: flex; gap: 16px; padding: 17px 0; border-top: 1px solid rgba(255,255,255,0.09); }
          .cro-item-new:first-of-type { border-top: none; }
          .cro-mk { flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; margin-top: 1px; font-size: 13px; font-weight: 700; }
          .cro-mk.ok { background: rgba(52,210,150,.15); color: #34d296; border: 1px solid rgba(52,210,150,.35); }
          .cro-mk.no { background: rgba(255,67,21,.13); color: #ff4315; border: 1px solid rgba(255,67,21,.35); }
          .cro-item-h { color: #fff; font-weight: 500; font-size: 16.5px; margin-bottom: 3px; }
          .cro-item-p { font-size: 14.5px; color: rgba(255,255,255,0.55); line-height: 1.45; margin: 0; }
          /* Revenue summary */
          .rev { background: linear-gradient(160deg, #171430, #0e0d1a 70%); border: 1px solid rgba(255,255,255,0.14); border-radius: 28px; padding: 64px; position: relative; overflow: hidden; }
          .rev::before { content: ""; position: absolute; width: 560px; height: 560px; border-radius: 50%; top: -260px; right: -160px; background: radial-gradient(circle, rgba(100,75,255,.3), transparent 62%); filter: blur(10px); }
          .rev > * { position: relative; z-index: 1; }
          .rev-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 60px; align-items: center; }
          .rev-total .rl { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: .24em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 18px; }
          .rev-total .rn { font-family: 'Clash Display', sans-serif; font-weight: 600; font-size: clamp(80px, 11vw, 148px); color: #fff; line-height: .85; letter-spacing: -.03em; background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,.62)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
          .rev-total .rn .per { font-size: .22em; color: #ff4315; -webkit-text-fill-color: #ff4315; margin-left: .05em; }
          .rev-total .rsub { font-size: 17px; color: rgba(255,255,255,0.72); margin-top: 26px; max-width: 34ch; }
          .rev-bars { display: flex; flex-direction: column; gap: 24px; }
          .rbar .rbar-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
          .rbar .rbar-top .t { color: #fff; font-weight: 500; font-size: 16px; }
          .rbar .rbar-top .v { font-family: 'Clash Display', sans-serif; font-weight: 600; color: #fff; font-size: 19px; }
          .rbar .track { height: 10px; border-radius: 100px; background: rgba(255,255,255,.07); overflow: hidden; }
          .rbar .track i { display: block; height: 100%; border-radius: 100px; transition: width 1.5s cubic-bezier(.2,.8,.2,1); }
          .rbar .rbar-note { font-size: 13.5px; color: rgba(255,255,255,0.55); margin-top: 8px; }
          .rb1 i { background: linear-gradient(90deg, #ff4315, #ff7a4d); }
          .rb2 i { background: linear-gradient(90deg, #644bff, #9b87ff); }
          .rb3 i { background: linear-gradient(90deg, #ff4315, #ffae00); }
          /* CTA */
          .cta-section { padding: 128px 0 110px; text-align: center; position: relative; overflow: hidden; }
          .cta-glow-el { position: absolute; width: 760px; height: 540px; border-radius: 50%; left: 50%; top: 30%; transform: translateX(-50%); background: radial-gradient(circle, rgba(255,67,21,.16), transparent 64%); filter: blur(16px); z-index: 0; pointer-events: none; }
          .cta-section .wrap { z-index: 2; position: relative; }
          .cta-heading { font-family: 'Clash Display', sans-serif; font-weight: 600; font-size: clamp(46px, 7vw, 96px); color: #fff; letter-spacing: -.03em; line-height: .98; margin-bottom: 30px; }
          .cta-body { font-size: clamp(18px, 1.6vw, 21px); color: rgba(255,255,255,0.72); max-width: 50ch; margin: 0 auto 44px; }
          .cta-btn-new { display: inline-flex; align-items: center; gap: 14px; background: #ff4315; color: #fff; font-family: 'Satoshi', sans-serif; font-weight: 700; font-size: 18px; padding: 21px 38px; border-radius: 100px; text-decoration: none; box-shadow: 0 18px 50px -12px rgba(255,67,21,.6); transition: transform .3s, box-shadow .3s; }
          .cta-btn-new:hover { transform: translateY(-3px); box-shadow: 0 26px 60px -12px rgba(255,67,21,.75); }
          .cta-btn-new .arr { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,.22); display: grid; place-items: center; font-size: 14px; }
          .sign { margin-top: 72px; display: flex; align-items: center; justify-content: center; gap: 20px; }
          .sign .ph { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #644bff, #ff4315); display: grid; place-items: center; font-family: 'Clash Display', sans-serif; font-weight: 600; color: #fff; font-size: 22px; flex: 0 0 auto; border: 2px solid rgba(255,255,255,.16); }
          .sign .who .nm { font-family: 'Clash Display', sans-serif; font-weight: 500; color: #fff; font-size: 19px; }
          .sign .who .rl { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-top: 3px; }
          /* site footer */
          .site-footer { border-top: 1px solid rgba(255,255,255,0.09); padding: 40px 0; }
          .site-footer .wrap { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
          .site-footer .fmeta { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,0.38); }
          /* reduced motion */
          @media (prefers-reduced-motion: reduce) {
            .hdr-el { opacity: 1 !important; transform: none !important; transition: none !important; }
            .hdr-scan { display: none !important; }
            .conf-pill.live::before { animation: none !important; }
            .score-ring-prog { transition: none !important; }
            .score-card:hover { transform: none !important; }
            .rbar .track i { transition: none !important; }
          }
          /* responsive */
          @media (max-width: 900px) {
            .wrap { padding: 0 24px; }
            .scores-grid { grid-template-columns: repeat(2, 1fr); }
            .cro-grid { grid-template-columns: 1fr; }
            .rev { padding: 40px 28px; }
            .rev-grid { grid-template-columns: 1fr; gap: 44px; }
            .hero-figure { grid-template-columns: 1fr; gap: 8px; }
            .fig-note { text-align: left; max-width: 40ch; }
            .section-pad { padding: 84px 0; }
            .topmeta { display: none; }
          }
          @media (max-width: 600px) {
            .scores-grid { grid-template-columns: repeat(2, 1fr); }
            .hook { font-size: clamp(32px, 8vw, 48px); }
          }
        `}</style>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-glow" />
          <div className="hero-glow-o" />
          {/* Scan line, plays once on mount */}
          {headerRevealed && (
            <div className="hdr-scan" style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,67,21,0.85) 35%, rgba(100,75,255,0.9) 65%, transparent 100%)',
              boxShadow: '0 0 10px rgba(255,67,21,0.5), 0 0 20px rgba(100,75,255,0.3)',
              animation: 'scanSweep 1.2s cubic-bezier(0.4,0,0.2,1) forwards',
              zIndex: 10, pointerEvents: 'none',
            }} />
          )}
          <div className="wrap">
            {/* Top bar */}
            <div className={`topbar hdr-el${headerRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.05s', justifyContent: 'flex-end' }}>
              <div className="topmeta">
                GROWTH AUDIT &nbsp;/&nbsp; <strong style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 400 }}>NO. {auditRef}</strong><br />
                ISSUED <strong style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 400 }}>{issuedMonth} {issuedYear}</strong> &nbsp;/&nbsp; VALID 30 DAYS
              </div>
            </div>

            {/* Confidential pills */}
            <div className={`confidential hdr-el${headerRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.2s' }}>
              <span className="conf-pill live">Live findings</span>
              <span className="conf-pill">Prepared for {prospect.brand_name}</span>
              <span className="conf-pill">{headerDomain}</span>
              {prospect.niche && <span className="conf-pill">{prospect.niche}</span>}
            </div>

            {/* Hook headline */}
            <div className={`hdr-el${headerRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.35s' }}>
              {hookHeadline ? (
                <h1 className="hook">
                  {hookHeadline.line1} <span className="hl">{hookHeadline.line2}</span>
                </h1>
              ) : (
                <h1 className="hook">
                  Your growth, mapped. <span className="hl">Here&apos;s where the wins are.</span>
                </h1>
              )}
              {hookHeadline?.subtext ? (
                <p className="hero-sub">{hookHeadline.subtext}</p>
              ) : (
                <p className="hero-sub">We ran {headerDomain} through every signal Google and real shoppers use to judge a store. Here is what is costing you orders, and what it is worth to fix.</p>
              )}
            </div>

            {/* Hero figure */}
            <div className={`hero-figure hdr-el${headerRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.55s' }}>
              {hasRevenue ? (
                <div>
                  <div className="fig-label">Revenue you could be capturing</div>
                  <div className="fig-num">
                    ${fmtNum(displayRevenue)}<span className="per">/yr</span>
                  </div>
                </div>
              ) : kwEtv > 0 ? (
                <div>
                  <div className="fig-label">Monthly organic visitors analysed</div>
                  <div className="fig-num">{fmtNum(kwEtv)}</div>
                </div>
              ) : null}
              <p className="fig-note">
                <strong style={{ color: '#fff', fontWeight: 500 }}>Same traffic. Same products.</strong> A store that finally keeps up with the people already trying to buy from you.
              </p>
            </div>
          </div>
        </section>

        <div className="divider" />

        {/* ── Audit Scores ── */}
        <section className="section-pad bg2-section" id="scores">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.scores}</span>
                <span className="kicker"><span className="dot" />The Scorecard</span>
              </div>
              <h2 className="sec-title">Six scores that decide<br />whether people buy.</h2>
              <p className="sec-lead">We graded your store the way Google and your shoppers do. Higher is better. Anything glowing orange is leaking money right now.</p>
            </div>
            <div ref={scoresRef} className="scores-grid">
            {(() => {
              const val = ps?.performance_score != null ? Math.round(ps.performance_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <ScoreRing key="mob" label="Mobile Performance" pct={val} centerText={val != null ? val : '--'} unitText="/100" status={st} benchmark="Target: 90+" desc={scoreDescs?.mobile ?? SCORE_DESC_FALLBACKS.mobile} revealed={scoresRevealed} />
            })()}
            {(() => {
              const val = psDesktop?.performance_score != null ? Math.round(psDesktop.performance_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <ScoreRing key="desk" label="Desktop Performance" pct={val} centerText={val != null ? val : '--'} unitText="/100" status={st} benchmark="Target: 90+" desc={scoreDescs?.desktop ?? SCORE_DESC_FALLBACKS.desktop} revealed={scoresRevealed} />
            })()}
            {(() => {
              const val = ps?.seo_score != null ? Math.round(ps.seo_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <ScoreRing key="seo" label="SEO Score" pct={val} centerText={val != null ? val : '--'} unitText="/100" status={st} benchmark="Target: 90+" desc={scoreDescs?.seo ?? SCORE_DESC_FALLBACKS.seo} revealed={scoresRevealed} />
            })()}
            {(() => {
              const val = ps?.accessibility_score != null ? Math.round(ps.accessibility_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <ScoreRing key="a11y" label="Accessibility" pct={val} centerText={val != null ? val : '--'} unitText="/100" status={st} benchmark="Target: 90+" desc={scoreDescs?.accessibility ?? SCORE_DESC_FALLBACKS.accessibility} revealed={scoresRevealed} />
            })()}
            {(() => {
              const passed = cro?.summary?.passed
              const total = cro?.summary?.total ?? 20
              const ringPct = passed != null ? (passed / total * 100) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = passed == null ? 'neutral' : passed >= 16 ? 'good' : passed >= 10 ? 'needs-work' : 'poor'
              return <ScoreRing key="cro-score" label="CRO Score" pct={ringPct} centerText={passed != null ? passed : '--'} unitText={passed != null ? `/${total}` : undefined} status={st} benchmark="Most stores: 14-16/20" desc={scoreDescs?.cro ?? SCORE_DESC_FALLBACKS.cro} revealed={scoresRevealed} />
            })()}
            {(() => {
              const total = cro?.summary?.total ?? 20
              const passed = cro?.summary?.passed
              const ringPct = passed != null ? (passed / total * 100) : null
              const grade = ringPct == null ? '--' : ringPct > 85 ? 'A' : ringPct > 70 ? 'B' : ringPct > 55 ? 'C' : 'D'
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = grade === 'A' ? 'good' : grade === 'B' ? 'needs-work' : grade === 'C' || grade === 'D' ? 'poor' : 'neutral'
              return <ScoreRing key="cro-grade" label="Overall CRO" pct={ringPct} centerText={grade} status={st} benchmark="Target: B or above" desc={scoreDescs?.overall ?? SCORE_DESC_FALLBACKS.overall} revealed={scoresRevealed} />
            })()}
          </div>
          </div>
        </section>

        <div className="divider" />

        {/* ── Performance ── */}
        <section className="section-pad" id="performance">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.performance}</span>
                <span className="kicker"><span className="dot" />Speed, In Plain English</span>
              </div>
              <h2 className="sec-title">How fast your store<br />actually feels.</h2>
              <p className="sec-lead">Google watches these signals to decide if your store feels fast. A slow store is the most expensive problem you cannot see.</p>
            </div>

            {ps ? (
              <>
                {topCompDomain && lcpDisplayValue && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', margin: '0 0 24px 0', fontStyle: 'italic' }}>
                    {topCompDomain} is one of your top competitors in organic search. Your mobile load time is {lcpDisplayValue} - industry leaders load in under 2.5s.
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <MetricCard label="LCP" value={ps.lcp ? msToS(ps.lcp) : '-'} unit="s" status={ps.lcp ? getStatus(ps.lcp / 1000, [2.5, 4]) : 'neutral'} description="Largest Contentful Paint - how fast your main content loads" target="<2.5s" />
                  <MetricCard label="FCP" value={ps.fcp ? msToS(ps.fcp) : '-'} unit="s" status={ps.fcp ? getStatus(ps.fcp / 1000, [1.8, 3]) : 'neutral'} description="First Contentful Paint - when the first element appears" target="<1.8s" />
                  <MetricCard label="CLS" value={ps.cls != null ? ps.cls.toFixed(3) : '-'} status={ps.cls != null ? getStatus(ps.cls, [0.1, 0.25]) : 'neutral'} description="Cumulative Layout Shift - how much the page jumps around" target="<0.1" />
                  <MetricCard label="TBT" value={ps.tbt ? Math.round(ps.tbt) : '-'} unit="ms" status={ps.tbt ? getStatus(ps.tbt, [200, 600]) : 'neutral'} description="Total Blocking Time - how long the page is unresponsive" target="<200ms" />
                  <MetricCard label="Speed Index" value={ps.speed_index ? msToS(ps.speed_index) : '-'} unit="s" status={ps.speed_index ? getStatus(ps.speed_index / 1000, [3.4, 5.8]) : 'neutral'} description="How quickly content is visually complete" target="<3.4s" />
                  <MetricCard label="TTI" value={ps.tti ? msToS(ps.tti) : '-'} unit="s" status={ps.tti ? getStatus(ps.tti / 1000, [3.8, 7.3]) : 'neutral'} description="Time to Interactive - when the page is fully usable" target="<3.8s" />
                </div>


                {ps.lcp && ps.lcp / 1000 > 2.5 && (() => {
                  const lcpS = ps.lcp / 1000
                  const traffic = dfsOverview?.metrics?.organic?.etv ?? 500
                  // Each second over 2.5s costs ~7% in conversions
                  const monthlyRevLoss = Math.round((lcpS - 2.5) * 0.07 * traffic * ASSUMED_CONVERSION_RATE * ASSUMED_AOV)
                  return (
                    <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.2)', borderLeft: `3px solid ${S.orange}`, borderRadius: 12, padding: 24 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 8 }}>WHAT THIS COSTS YOU</span>
                      <p style={{ color: S.white, lineHeight: 1.7, marginBottom: 8, fontSize: 16 }}>
                        At <strong>{lcpS.toFixed(2)}s</strong> load time, you&apos;re estimated to be losing{' '}
                        <strong style={{ color: S.orange }}>${monthlyRevLoss.toLocaleString()}/month</strong> in revenue to slow page speed alone.
                      </p>
                      <p style={{ color: S.muted, fontSize: 13 }}>Based on 7% conversion loss per second over 2.5s, {traffic.toLocaleString()} monthly visitors, {(ASSUMED_CONVERSION_RATE * 100).toFixed(1)}% baseline CR, ${ASSUMED_AOV} AOV.</p>
                    </div>
                  )
                })()}

                <AdamsTake text={content?.ai_performance_commentary} />
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[...Array(6)].map((_, i) => <div key={i} style={{ height: 120, borderRadius: 12, background: 'rgba(100,75,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
              </div>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── CRO ── */}
        <section className="section-pad bg2-section" id="cro">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.cro}</span>
                <span className="kicker"><span className="dot" />Turning Visits Into Orders</span>
              </div>
              <h2 className="sec-title">What makes a visitor<br />actually check out.</h2>
              {topCompDomain && (
                <p className="sec-lead">You are already doing a lot right. The gaps below are the difference between someone browsing and someone buying.{' '}
                  <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.85em' }}>Stores like {topCompDomain} typically pass 17–18 of these checks.</span>
                </p>
              )}
              {!topCompDomain && (
                <p className="sec-lead">You are already doing a lot right. The gaps below are the difference between someone browsing and someone buying.</p>
              )}
            </div>

            {cro?.results ? (
              <>
                <div className="cro-grid">
                  {/* Left, passed items */}
                  <div className="cro-col">
                    <h3>
                      <span className="cro-mk ok" style={{ width: 26, height: 26 }}>✓</span>
                      Working for you
                    </h3>
                    <div className="cro-sub">{passedItems.length} strong foundation{passedItems.length !== 1 ? 's' : ''}</div>
                    {(passedItems as any[]).slice(0, 8).map((item: any) => (
                      <div key={item.id} className="cro-item-new">
                        <span className="cro-mk ok">✓</span>
                        <div>
                          <div className="cro-item-h">{item.label}</div>
                          {item.fix && <p className="cro-item-p">{item.fix}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right, failed items */}
                  <div className="cro-col miss">
                    <h3>
                      <span className="cro-mk no" style={{ width: 26, height: 26 }}>!</span>
                      Missing, and costly
                    </h3>
                    <div className="cro-sub">
                      {Object.values(failedByCategory).flat().length} fix{Object.values(failedByCategory).flat().length !== 1 ? 'es' : ''}, mostly under a week each
                    </div>
                    {(Object.values(failedByCategory).flat() as any[]).slice(0, 8).map((item: any) => (
                      <div key={item.id} className="cro-item-new">
                        <span className="cro-mk no">✕</span>
                        <div>
                          <div className="cro-item-h">{item.label}</div>
                          {item.fix && <p className="cro-item-p">{item.fix}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <AdamsTake text={content?.ai_cro_commentary} />
              </>
            ) : (
              <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <p style={{ color: S.muted }}>{cro?.error ? 'Automated CRO scan could not complete for this store. Manual review recommended.' : 'CRO scan in progress...'}</p>
              </div>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── GMB ── */}
        {gmbData && (
          <><section className="section-pad" id="gmb">
            <div className="wrap">
              <div className="sec-head">
                <div className="eyebrow-row">
                  <span className="sec-num-label">{sectionNums.gmb}</span>
                  <span className="kicker"><span className="dot" />Local Presence</span>
                </div>
                <h2 className="sec-title">Google Business Profile</h2>
              </div>

              {gmbData.found ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Left, profile stats */}
                  <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
                    <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 48, fontWeight: 700, color: S.white, lineHeight: 1 }}>
                      {gmbData.rating != null ? gmbData.rating.toFixed(1) : '-'}
                    </div>
                    {gmbData.rating != null && (
                      <div style={{ fontSize: 20, margin: '8px 0', letterSpacing: 2 }}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} style={{ color: S.orange }}>{i < Math.round(gmbData.rating) ? '★' : '☆'}</span>
                        ))}
                      </div>
                    )}
                    <p style={{ color: S.muted, fontSize: 14, margin: '6px 0 16px' }}>
                      {gmbData.review_count != null ? `${gmbData.review_count.toLocaleString()} Google reviews` : 'No reviews data'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {gmbData.category && (
                        <span style={{ background: 'rgba(100,75,255,0.12)', color: S.purple, borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' }}>
                          {gmbData.category}
                        </span>
                      )}
                      {gmbData.address && (
                        <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>{gmbData.address}</p>
                      )}
                      <div>
                        {gmbData.is_claimed
                          ? <span style={{ fontFamily: MONO, background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '3px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>✓ Verified</span>
                          : <span style={{ fontFamily: MONO, background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: 99, padding: '3px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>! Unclaimed</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Right, benchmark context */}
                  <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                      Stores with 4.5+ stars convert 28% better than those below 4.0.{' '}
                      {gmbData.rating != null
                        ? <>Your rating of <strong style={{ color: S.white }}>{gmbData.rating.toFixed(1)}</strong> puts you {gmbData.rating >= 4.0 ? 'above' : 'below'} the ecommerce average.</>
                        : 'Connect your Google account for precise conversion benchmarks.'
                      }
                    </p>
                    {gmbData.review_count != null && gmbData.review_count < 50 && (
                      <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.15)', borderLeft: `3px solid ${S.orange}`, borderRadius: 8, padding: '12px 16px' }}>
                        <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                          Fewer than 50 reviews limits your local search visibility. Most category leaders have 100+.
                        </p>
                      </div>
                    )}
                    {gmbData.review_count != null && gmbData.review_count >= 100 && (
                      <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderLeft: '3px solid #22c55e', borderRadius: 8, padding: '12px 16px' }}>
                        <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                          Strong review count. This is a trust signal worth highlighting in your ads.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.2)', borderLeft: `3px solid ${S.orange}`, borderRadius: 12, padding: 24 }}>
                  <p style={{ color: S.white, lineHeight: 1.7, fontSize: 16, margin: 0 }}>
                    No Google Business Profile detected for <strong>{prospect.brand_name}</strong>.{' '}
                    This means you&apos;re invisible in local search and Google Maps.{' '}
                    Setting up a free profile could add significant local visibility.
                  </p>
                </div>
              )}
            </div>
          </section>
          <div className="divider" /></>
        )}

        {/* ── Ads ── */}
        <section className="section-pad bg2-section" id="ads">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.ads}</span>
                <span className="kicker"><span className="dot" />Paid Media</span>
              </div>
              <h2 className="sec-title">Ads and Creative</h2>
            </div>

            {metaAds && !metaAds.error ? (
              <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Meta Ad Library</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Active Ads', value: metaAds.active_ads },
                    { label: 'Total Ads Found', value: metaAds.total_ads },
                  ].map(item => (
                    <div key={item.label} style={{ background: S.bg, borderRadius: 8, padding: 16 }}>
                      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 24, fontWeight: 700, color: S.white }}>{item.value}</div>
                      <div style={{ fontSize: 13, color: S.muted }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {metaAds.oldest_active_date && (() => {
                  const daysOld = Math.floor((Date.now() - new Date(metaAds.oldest_active_date).getTime()) / (1000 * 60 * 60 * 24))
                  if (daysOld > 90) return (
                    <div style={{ background: 'rgba(255,67,21,0.05)', border: `1px solid rgba(255,67,21,0.2)`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                      <p style={{ color: S.orange, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Creative fatigue risk detected.</p>
                      <p style={{ color: S.muted, fontSize: 14 }}>Ads running this long typically see rising CPMs and declining CTR.</p>
                    </div>
                  )
                  return null
                })()}

                {metaAds.active_ads < 3 && (
                  <div style={{ background: 'rgba(255,67,21,0.05)', border: `1px solid rgba(255,67,21,0.2)`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                    <p style={{ color: S.orange, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Limited creative testing.</p>
                    <p style={{ color: S.muted, fontSize: 14 }}>Top DTC brands typically run 6-12 active ad variations.</p>
                  </div>
                )}

                {metaAds.active_ads >= 5 && metaAds.oldest_active_date && Math.floor((Date.now() - new Date(metaAds.oldest_active_date).getTime()) / (1000 * 60 * 60 * 24)) <= 30 && (
                  <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: 16 }}>
                    <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>Active creative testing detected.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
                <p style={{ color: S.muted, fontSize: 14 }}>Meta Ad Library data unavailable for this brand.</p>
              </div>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── Ad Strategy (legacy) ── */}
        {(content?.section_strategy_headline || content?.section_strategy_body) && (
          <><section className="section-pad" id="strategy">
            <div className="wrap">
              <div className="sec-head">
                <div className="eyebrow-row">
                  <span className="sec-num-label">{sectionNums.strategy}</span>
                  <span className="kicker"><span className="dot" />Ad Strategy</span>
                </div>
                <h2 className="sec-title">{content?.section_strategy_headline || 'Ad Strategy'}</h2>
              </div>
              {content?.section_strategy_body && (
                <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.section_strategy_body}</p>
              )}
            </div>
          </section>
          <div className="divider" /></>
        )}

        {/* ── SEO ── */}
        <section className="section-pad" id="seo">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.seo}</span>
                <span className="kicker"><span className="dot" />Where You Stand In Search</span>
              </div>
              <h2 className="sec-title">You show up. Just not<br />where the buyers are.</h2>
            </div>

            {dfsOverview ? (
              <>
                {topCompDomain && topCompTraffic > 0 && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', margin: '0 0 24px 0', fontStyle: 'italic' }}>
                    {topCompDomain} receives an estimated {Math.round(topCompTraffic).toLocaleString()} monthly visitors from organic search. Closing even 20% of that gap is worth targeting.
                  </p>
                )}
                {(() => {
                  const { keywordCount: kwCount, monthlyTraffic: kwEtv } = resolveOrganicStats(dfsOverview, dfsKeywords)
                  const refDomains = dfsOverview.metrics?.referring_domains ?? 0
                  const backlinksUnavailable = !backlinksSummary || Object.keys(backlinksSummary).length === 0

                  const cards = [
                    {
                      label: 'Organic Keywords', value: kwCount.toLocaleString(),
                      context: kwCount < 100
                        ? 'Below average for ecommerce - most stores your size rank for 200+'
                        : kwCount <= 500 ? 'Average organic footprint'
                        : 'Strong organic presence',
                    },
                    {
                      label: 'Est. Monthly Traffic', value: fmtNum(kwEtv),
                      context: kwEtv < 5000
                        ? 'Low organic traffic - significant growth opportunity'
                        : kwEtv <= 20000 ? 'Moderate traffic - room to grow'
                        : 'Strong organic traffic',
                    },
                    {
                      label: 'Est. Traffic Value', value: `$${fmtNum(Math.round(kwEtv * 1.2))}`,
                      context: 'What this traffic would cost in Google Ads',
                    },
                    ...(backlinksUnavailable ? [] : [{
                      label: 'Referring Domains',
                      value: refDomains.toLocaleString(),
                      context: refDomains < 20
                        ? 'Very few backlinks - authority building needed'
                        : refDomains <= 100 ? 'Building authority - keep going'
                        : 'Good backlink profile',
                    }]),
                  ]

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length === 4 ? 2 : 3}, 1fr)`, gap: 16, marginBottom: 40 }}>
                      {cards.map(item => (
                        <div key={item.label} style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 20px' }}>
                          <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700, color: S.white }}>{item.value}</div>
                          <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{item.label}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8, lineHeight: 1.45 }}>{item.context}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* SEO Findings */}
                {seoFindings && seoFindings.length > 0 && (() => {
                  const severityColour = (s: string) => s === 'CRITICAL' ? '#ef4444' : s === 'WARNING' ? '#f97316' : '#22c55e'
                  const severityBadgeBg = (s: string) => s === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : s === 'WARNING' ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)'
                  return (
                    <div style={{ marginBottom: 40 }}>
                      <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: S.orange, marginBottom: 16, marginTop: 40 }}>SEO Findings</p>
                      {seoFindings.map((f: any, i: number) => {
                        const col = severityColour(f.severity)
                        return (
                          <div key={i} style={{ background: S.bg2, borderRadius: 12, padding: '18px 20px 18px 24px', marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: col }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: S.white }}>{f.title}</span>
                              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 20, background: severityBadgeBg(f.severity), color: col }}>{f.severity}</span>
                            </div>
                            {f.detail && (
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6, lineHeight: 1.5 }}>
                                <span style={{ fontFamily: MONO, color: col, fontWeight: 700, fontSize: 10, letterSpacing: '0.16em', marginRight: 8 }}>DETAIL</span>
                                {f.detail}
                              </p>
                            )}
                            {f.fix && (
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 0, lineHeight: 1.5 }}>
                                <span style={{ fontFamily: MONO, color: S.orange, fontWeight: 700, fontSize: 10, letterSpacing: '0.16em', marginRight: 8 }}>FIX</span>
                                {f.fix}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {(kwBuckets.winning.length > 0 || kwBuckets.close.length > 0 || kwBuckets.money.length > 0) && (
                  <div style={{ marginBottom: 40 }}>
                    {kwBuckets.winning.length > 0 && (
                      <div style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                          <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, margin: 0 }}>Winning</h3>
                          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.16em' }}>POSITIONS 1-5</span>
                        </div>
                        <p style={{ color: S.muted, fontSize: 13, marginBottom: 14 }}>Rankings worth protecting and doubling down on.</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                              <tr style={{ background: S.bg }}>
                                {(['Keyword', 'Searches/mo', 'Position'] as const).map((h, idx) => (
                                  <th key={h} style={{ padding: '10px 14px', textAlign: idx === 0 ? 'left' : 'right', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {kwBuckets.winning.map((kw: any, i: number) => {
                                return (
                                  <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                    <td style={{ padding: '10px 14px', color: S.white }}>
                                      {kw.keyword_data?.keyword}
                                    </td>
                                    <td style={{ padding: '10px 14px', color: S.muted, textAlign: 'right' }}>{fmtVol(kw.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                                    <td style={{ padding: '10px 14px', color: '#22c55e', fontWeight: 600, textAlign: 'right' }}>#{kw.ranked_serp_element?.serp_item?.rank_group}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {kwBuckets.close.length > 0 && (
                      <div style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                          <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, margin: 0 }}>Close</h3>
                          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: S.orange, letterSpacing: '0.16em' }}>POSITIONS 6-15</span>
                        </div>
                        <p style={{ color: S.muted, fontSize: 13, marginBottom: 14 }}>One push away from significantly more traffic.</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                              <tr style={{ background: S.bg }}>
                                {(['Keyword', 'Searches/mo', 'Position'] as const).map((h, idx) => (
                                  <th key={h} style={{ padding: '10px 14px', textAlign: idx === 0 ? 'left' : 'right', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {kwBuckets.close.map((kw: any, i: number) => {
                                return (
                                  <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                    <td style={{ padding: '10px 14px', color: S.white }}>
                                      {kw.keyword_data?.keyword}
                                    </td>
                                    <td style={{ padding: '10px 14px', color: S.muted, textAlign: 'right' }}>{fmtVol(kw.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                                    <td style={{ padding: '10px 14px', color: S.orange, fontWeight: 600, textAlign: 'right' }}>#{kw.ranked_serp_element?.serp_item?.rank_group}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SERP Battleground table */}
                {(() => {
                  const serpData = cache?.dataforseo_serp_features as any
                  const serpItems: any[] = serpData?.items ?? []
                  const serpTarget2: string = serpData?.target2 ?? ''
                  if (!serpData || serpItems.length === 0) return null

                  const rankColor = (r: number | null) => {
                    if (r == null) return 'rgba(255,255,255,0.4)'
                    if (r <= 3) return '#22c55e'
                    if (r <= 10) return '#f97316'
                    return 'rgba(255,255,255,0.4)'
                  }

                  const sorted = [...serpItems]
                    .sort((a: any, b: any) => {
                      const ar = a.first_domain_serp_element?.rank_group ?? 999
                      const ac = a.second_domain_serp_element?.rank_group ?? 999
                      const br = b.first_domain_serp_element?.rank_group ?? 999
                      const bc = b.second_domain_serp_element?.rank_group ?? 999
                      const aWin = ar < ac ? 0 : 1
                      const bWin = br < bc ? 0 : 1
                      if (aWin !== bWin) return aWin - bWin
                      const aVol = a.keyword_data?.keyword_info?.search_volume ?? 0
                      const bVol = b.keyword_data?.keyword_info?.search_volume ?? 0
                      return bVol - aVol
                    })
                    .slice(0, 15)

                  return (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: S.white }}>Battleground</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: S.purple, textTransform: 'uppercase' as const, letterSpacing: '0.16em', marginLeft: 12 }}>HEAD TO HEAD</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                        Keywords where you and {serpTarget2} both show up on Google. Your position vs theirs.
                      </p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                          <thead>
                            <tr style={{ background: S.bg }}>
                              {(['Keyword', 'Searches/mo', 'Your Position', 'Their Position', 'Advantage'] as const).map((h, idx) => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: idx === 0 ? 'left' : 'right', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((item: any, i: number) => {
                              const kw = item.keyword_data?.keyword ?? ''
                              const vol = item.keyword_data?.keyword_info?.search_volume ?? 0
                              const myRank: number | null = item.first_domain_serp_element?.rank_group ?? null
                              const theirRank: number | null = item.second_domain_serp_element?.rank_group ?? null
                              let advantage: React.ReactNode
                              if (myRank == null || theirRank == null) {
                                advantage = <span style={{ color: S.muted }}>-</span>
                              } else if (myRank < theirRank) {
                                advantage = <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ You</span>
                              } else if (myRank > theirRank) {
                                advantage = <span style={{ color: 'rgba(255,255,255,0.35)' }}>↑ Them</span>
                              } else {
                                advantage = <span style={{ color: S.muted }}>=</span>
                              }
                              return (
                                <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                  <td style={{ padding: '10px 14px', color: S.white }}>{kw}</td>
                                  <td style={{ padding: '10px 14px', color: S.muted, textAlign: 'right' }}>{vol > 0 ? fmtVol(vol) : '-'}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', color: rankColor(myRank), fontWeight: 600 }}>{myRank != null ? `#${myRank}` : '-'}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', color: rankColor(theirRank), fontWeight: 600 }}>{theirRank != null ? `#${theirRank}` : '-'}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>{advantage}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {dfsCompetitors.length > 0 && (() => {
                  const prospectEtv = dfsOverview?.metrics?.organic?.etv ?? 0
                  const competitorTotalEtv = dfsCompetitors.slice(0, 5).reduce((sum: number, c: any) => sum + (c.estimated_traffic ?? c.full_domain_metrics?.organic?.etv ?? 0), 0)
                  const gap = competitorTotalEtv - prospectEtv
                  return gap > 1000 ? (
                    <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.2)', borderLeft: `3px solid ${S.orange}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 8 }}>COMPETITOR TRAFFIC GAP</span>
                      <p style={{ color: S.white, lineHeight: 1.7, fontSize: 16 }}>
                        Your top competitors combined receive{' '}
                        <strong style={{ color: S.orange }}>{fmtNum(gap)} more monthly visitors</strong> than you.
                        {' '}That&apos;s {fmtNum(gap)} potential customers seeing a competitor first.
                      </p>
                    </div>
                  ) : null
                })()}

                {dfsCompetitors.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Top Competitors</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: S.bg }}>
                            {['Domain', 'Est. Traffic', 'Avg Position', 'Visibility', 'KW Overlap'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dfsCompetitors.slice(0, 5).map((comp: any, i: number) => {
                            const etv = comp.estimated_traffic ?? comp.full_domain_metrics?.organic?.etv ?? 0
                            const avgPos = comp.avg_position != null ? `#${comp.avg_position.toFixed(1)}` : '-'
                            const vis = comp.visibility != null ? comp.visibility.toFixed(1) : '-'
                            return (
                              <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                <td style={{ padding: '10px 14px', color: S.white }}>{comp.domain}</td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>{etv > 0 ? fmtNum(etv) : '-'}</td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>{avgPos}</td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>{vis}</td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>{comp.intersections?.toLocaleString() ?? '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {kwBuckets.money.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                      <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, margin: 0 }}>Money</h3>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: S.purple, letterSpacing: '0.16em' }}>COMPETITOR GAP</span>
                    </div>
                    <p style={{ color: S.muted, fontSize: 13, marginBottom: 14 }}>High-intent keywords your competitors rank for. You don&apos;t yet.</p>
                    {(() => {
                      const topGap = kwBuckets.money
                        .filter((g: any) => (g.keyword_data?.keyword_info?.search_volume ?? 0) >= 100)
                        .sort((a: any, b: any) => (b.keyword_data?.keyword_info?.search_volume ?? 0) - (a.keyword_data?.keyword_info?.search_volume ?? 0))[0] ?? null
                      if (!topGap) return null
                      const kwStr = topGap.keyword_data?.keyword ?? topGap.keyword ?? ''
                      const vol = topGap.keyword_data?.keyword_info?.search_volume ?? 0
                      const estimatedVisitors = Math.round(vol * 0.05)
                      return (
                        <div style={{ background: 'rgba(255,67,21,0.08)', border: '1px solid rgba(255,67,21,0.25)', borderRadius: 16, padding: '24px 28px', marginBottom: 16 }}>
                          <p style={{ fontSize: 17, fontWeight: 600, color: S.white, margin: 0 }}>
                            One page targeting &ldquo;{kwStr}&rdquo; could bring {estimatedVisitors.toLocaleString()} more visitors a month.
                          </p>
                          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6, marginBottom: 0 }}>
                            Your competitors already rank for it ({vol.toLocaleString()} searches/month in Australia). You don&apos;t have a single page targeting it.
                          </p>
                        </div>
                      )
                    })()}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: S.bg }}>
                            {(['Keyword', 'Searches/mo', 'Competition', 'CPC', 'Top Competitor'] as const).map((h, idx) => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: idx === 0 ? 'left' : 'right', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kwBuckets.money.filter((gap: any) => (gap.keyword_data?.keyword_info?.search_volume ?? 0) > 0).map((gap: any, i: number) => {
                            const cpc = gap.keyword_data?.keyword_info?.cpc
                            return (
                            <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                              <td style={{ padding: '10px 14px', color: S.white }}>{gap.keyword_data?.keyword ?? gap.keyword}</td>
                              <td style={{ padding: '10px 14px', color: S.muted, textAlign: 'right' }}>{fmtVol(gap.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                              <td style={{ padding: '10px 14px', color: S.muted, textAlign: 'right' }}>{(() => { const compVal = parseFloat(gap?.keyword_data?.keyword_info?.competition); return isNaN(compVal) ? '-' : Math.round(compVal * 100) })()}</td>
                              <td style={{ padding: '10px 14px', color: S.muted, textAlign: 'right' }}>{cpc != null && cpc > 0 ? `$${cpc.toFixed(2)}` : '-'}</td>
                              <td style={{ padding: '10px 14px', color: S.muted, fontSize: 12, textAlign: 'right' }}>{cleanDomain(dfsCompetitors[0]?.domain ?? '')}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {kwBuckets.money.filter((gap: any) => (gap.keyword_data?.keyword_info?.search_volume ?? 0) > 0).length === 0 && (
                      <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                        Keyword volume data is still processing for this store. Check back after the next rescan.
                      </div>
                    )}
                  </div>
                )}

                {dfsGaps.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Keyword Gap Analysis</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: S.bg }}>
                            {['Keyword', 'Volume', 'Competition', 'CPC'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dfsGaps.map((kw: any, i: number) => {
                            const comp = kw.keyword_data?.keyword_info?.competition ?? 0
                            const compLabel = comp < 0.33 ? 'LOW' : comp < 0.66 ? 'MEDIUM' : 'HIGH'
                            const compColor = comp < 0.33 ? '#22c55e' : comp < 0.66 ? S.orange : '#ef4444'
                            return (
                              <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                <td style={{ padding: '10px 14px', color: S.white }}>{kw.keyword_data?.keyword}</td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>{fmtNum(kw.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                                <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 600, color: compColor }}>{compLabel}</span></td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>${(kw.keyword_data?.keyword_info?.cpc ?? 0).toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {gads && !gads.error && gads.keyword_ideas?.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <p style={{ color: S.muted, fontSize: 13, marginBottom: 16 }}>Source: Google Ads Planner - category-level search intelligence to complement organic findings.</p>
                    <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Category and Keyword Opportunity</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: S.bg }}>
                            {['Keyword', 'Avg Monthly Searches', 'Competition', 'Top of Page Bid'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gads.keyword_ideas.slice(0, 10).map((kw: any, i: number) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                              <td style={{ padding: '10px 14px', color: S.white }}>{kw.keyword}</td>
                              <td style={{ padding: '10px 14px', color: S.muted }}>{(kw.avg_monthly_searches ?? 0).toLocaleString()}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: kw.competition === 'LOW' ? '#22c55e' : kw.competition === 'HIGH' ? '#ef4444' : S.orange }}>{kw.competition}</span>
                              </td>
                              <td style={{ padding: '10px 14px', color: S.muted }}>${kw.low_top_of_page_bid?.toFixed(2)} - ${kw.high_top_of_page_bid?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {gads?.error === 'not_configured' && (
                  <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, marginTop: 24 }}>
                    <p style={{ color: S.muted, fontSize: 14 }}>Google Ads Planner data requires API configuration. Contact hello@kliks.com.au to enable.</p>
                  </div>
                )}

                <AdamsTake text={content?.ai_seo_commentary} />
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {[...Array(4)].map((_, i) => <div key={i} style={{ height: 88, borderRadius: 12, background: 'rgba(100,75,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
              </div>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── Priority Actions ── */}
        <section className="section-pad bg2-section" id="priorities">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.priorities}</span>
                <span className="kicker"><span className="dot" />Priority Actions</span>
              </div>
              <h2 className="sec-title">Your top 3 fixes<br />this month.</h2>
              <p className="sec-lead">Based on your actual data. Highest impact first.</p>
            </div>

            {content?.ai_priority_list?.priorities ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(content.ai_priority_list.priorities as any[]).map((p: any) => (
                  <div key={p.number} style={{ background: S.bg2, border: `1px solid ${S.border}`, borderLeft: `3px solid ${S.purple}`, borderRadius: 12, padding: 28, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: S.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 700, color: '#fff' }}>{p.number}</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8, color: S.white }}>{p.title}</h3>
                      <p style={{ fontSize: 15, color: '#22c55e', fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>{p.impact}</p>
                      <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6 }}><span style={{ color: S.white, fontWeight: 600 }}>This week:</span> {p.next_step}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <p style={{ color: S.muted, fontSize: 14 }}>Run a data scan to generate your priority action list.</p>
              </div>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── SEO Commentary (legacy) ── */}
        {content?.section_seo_headline && (
          <><section className="section-pad" id="seo-commentary">
            <div className="wrap">
              <div className="sec-head">
                <div className="eyebrow-row">
                  <span className="sec-num-label">{sectionNums.seoCommentary}</span>
                  <span className="kicker"><span className="dot" />Search Opportunity</span>
                </div>
                <h2 className="sec-title">{content.section_seo_headline}</h2>
              </div>
              {content?.section_seo_body && <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.section_seo_body}</p>}
            </div>
          </section>
          <div className="divider" /></>
        )}

        {/* ── Biggest Opportunity ── */}
        {(content?.ai_opportunity_commentary || content?.section_opportunity_headline) && (
          <><section className="section-pad" id="opportunity">
            <div className="wrap">
              <div className="sec-head">
                <div className="eyebrow-row">
                  <span className="sec-num-label">{sectionNums.opportunity}</span>
                  <span className="kicker"><span className="dot" />Your Biggest Opportunity</span>
                </div>
                <h2 className="sec-title">{content?.section_opportunity_headline || 'Where to focus next.'}</h2>
              </div>
              {content?.ai_opportunity_commentary ? (
                <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.ai_opportunity_commentary}</p>
              ) : (
                content?.section_opportunity_body && <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.section_opportunity_body}</p>
              )}
            </div>
          </section>
          <div className="divider" /></>
        )}

        {/* ── Revenue Summary ── */}
        {revCalc.length > 0 && (
          <><section className="section-pad bg2-section" id="revenue">
            <div className="wrap">
              <div className="sec-head">
                <div className="eyebrow-row">
                  <span className="sec-num-label">{sectionNums.revenue}</span>
                  <span className="kicker"><span className="dot" />The Bottom Line</span>
                </div>
                <h2 className="sec-title">What fixing all of it<br />is actually worth.</h2>
              </div>
              <div className="rev">
                <div className="rev-grid">
                  <div className="rev-total">
                    <div className="rl">Twelve-month opportunity</div>
                    <div className="rn">${fmtNum(totalRevImpact)}<span className="per">/yr</span></div>
                    <p className="rsub">A conservative estimate. Same traffic, same products, just a store that finally keeps up with demand you already have.</p>
                  </div>
                  <div className="rev-bars">
                    {revCalc.map((row, i) => {
                      const maxImpact = Math.max(...revCalc.map((r: any) => r.impact ?? 0))
                      const pct = maxImpact > 0 ? Math.round((row.impact / maxImpact) * 100) : 0
                      return (
                        <div key={i} className={`rbar rb${i + 1}`}>
                          <div className="rbar-top">
                            <span className="t">{row.initiative}</span>
                            <span className="v">${fmtNum(row.impact)}</span>
                          </div>
                          <div className="track"><i style={{ width: `${pct}%` }} /></div>
                          <div className="rbar-note">
                            {row.initiative === 'Mobile Performance' && 'Recovering shoppers who leave before your store loads.'}
                            {row.initiative === 'CRO Improvements' && 'Turning more of your existing visitors into paid orders.'}
                            {row.initiative === 'SEO Content Gap' && 'Showing up for searches with buyers already attached.'}
                            {' '}<span style={{ display: 'inline-block', fontFamily: MONO, fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(155,140,255,0.13)', color: 'rgba(155,140,255,0.75)', letterSpacing: '0.08em', fontWeight: 600, verticalAlign: 'middle' }}>Modelled estimate</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <p style={{ color: S.muted, fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>Estimates based on industry benchmarks and public data. Actual results depend on execution, offer quality, and market conditions.</p>
            </div>
          </section>
          <div className="divider" /></>
        )}

        {/* ── Data Confidence ── */}
        <section className="section-pad" id="appendix">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow-row">
                <span className="sec-num-label">{sectionNums.appendix}</span>
                <span className="kicker"><span className="dot" />Appendix</span>
              </div>
              <h2 className="sec-title">Data confidence summary.</h2>
            </div>
            <style>{`.conf-action{display:table-cell}@media(max-width:640px){.conf-action{display:none}}`}</style>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: S.bg }}>
                    {(['Metric', 'Status', 'Source'] as const).map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                    ))}
                    <th className="conf-action" style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.16em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>Action Required</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Mobile Performance Score', status: ps ? 'Verified' : 'Pending', source: 'Google PSI API', action: 'None' },
                    { metric: 'Desktop Performance Score', status: psDesktop ? 'Verified' : 'Pending', source: 'Google PSI API', action: 'None' },
                    { metric: 'Core Web Vitals (LCP/FCP/TBT/CLS)', status: ps ? 'Verified' : 'Pending', source: 'Google PSI API', action: 'None' },
                    { metric: 'CRO Elements Audit', status: cro?.results ? 'Verified' : cro?.error ? 'Failed' : 'Pending', source: 'Automated Site Crawl', action: 'None' },
                    { metric: 'Organic Keywords', status: dfsOverview ? 'Verified' : 'Pending', source: 'DataForSEO Labs API', action: 'None' },
                    { metric: 'Competitor Analysis', status: dfsCompetitors.length > 0 ? 'Verified' : 'Pending', source: 'DataForSEO Labs API', action: 'None' },
                    { metric: 'Content Gap Analysis', status: dfsContentGap.length > 0 ? 'Verified' : 'Pending', source: 'DataForSEO Labs API', action: 'None' },
                    { metric: 'AI Commentary', status: content?.ai_opportunity_commentary ? 'Verified' : 'Pending', source: 'Claude AI', action: 'None' },
                    { metric: 'Category Keyword Intelligence', status: gads && !gads.error ? 'Verified' : 'Not Connected', source: 'DataForSEO + Google Ads Planner', action: gads?.error ? 'Configure API' : 'None' },
                    { metric: 'Meta Ad Library', status: metaAds && !metaAds.error ? 'Verified' : 'Not Connected', source: 'Meta Ad Library API', action: metaAds?.error ? 'Configure API' : 'None' },
                    { metric: 'Google Analytics 4', status: 'Not Connected', source: 'GA4 API', action: 'Connect data source' },
                    { metric: 'Google Search Console', status: 'Not Connected', source: 'GSC API', action: 'Connect data source' },
                    { metric: 'Klaviyo Email Data', status: 'Not Connected', source: 'Klaviyo API', action: 'Connect data source' },
                    { metric: 'Meta Ads Performance', status: 'Not Connected', source: 'Meta Graph API', action: 'Connect data source' },
                    { metric: 'Shopify Store Data', status: 'Not Connected', source: 'Shopify Admin API', action: 'Connect data source' },
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                      <td style={{ padding: '10px 14px', color: S.white }}>{row.metric}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', padding: '3px 8px', borderRadius: 99, background: row.status === 'Verified' ? 'rgba(34,197,94,0.12)' : 'rgba(255,67,21,0.12)', color: row.status === 'Verified' ? '#22c55e' : S.orange }}>{row.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: S.muted }}>{row.source}</td>
                      <td className="conf-action" style={{ padding: '10px 14px', color: S.muted }}>{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: S.muted, fontSize: 13, fontStyle: 'italic', marginTop: 16 }}>Connect data sources above to unlock precise, account-level insights beyond public data benchmarks.</p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section">
          <div className="cta-glow-el" />
          <div className="wrap">
            <h2 className="cta-heading">Let&apos;s go<br />get it.</h2>
            <p className="cta-body">
              {content?.ai_closing_commentary || content?.section_closing_body || `I put this together because I think ${prospect.brand_name} is leaving real money on the table, and most of it is fixable inside 90 days. If that is worth twenty minutes, I will walk you through exactly where to start.`}
            </p>
            <a href={prospect.cta_link || '/book'} className="cta-btn-new">
              <span className="arr">↗</span>
              Book your 20-minute call
            </a>

            <div className="sign">
              <div className="ph">AN</div>
              <div className="who">
                <div className="nm">Adam Nagy</div>
                <div className="rl">Founder · Kliks Digital</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="site-footer">
          <div className="wrap">
            <a href="/" className="logo">
              <span className="mark" />
              KLIKS
            </a>
            <div className="fmeta">
              Confidential · Prepared for {prospect.brand_name} · Audit No. {auditRef}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
