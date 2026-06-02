'use client'

import { useMemo } from 'react'

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

function SectionLabel({ children }: { children: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 12 }}>{children}</span>
}

function GhostNumber({ n }: { n: string }) {
  return <span style={{ position: 'absolute', top: -16, left: -8, fontFamily: '"Clash Display", sans-serif', fontSize: 72, fontWeight: 700, color: 'rgba(100,75,255,0.15)', lineHeight: 1, zIndex: 0, userSelect: 'none', pointerEvents: 'none' }}>{n}</span>
}

function SectionWrap({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ position: 'relative', marginBottom: 80 }}>
      {children}
    </section>
  )
}

function MetricCard({ label, value, unit, status, description, target }: { label: string; value: string | number; unit?: string; status: 'good' | 'needs-work' | 'poor' | 'neutral'; description?: string; target?: string }) {
  const colours = { good: '#22c55e', 'needs-work': '#f97316', poor: '#ef4444', neutral: S.purple }
  const c = colours[status]
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, color: c }}>{value}{unit && <span style={{ fontSize: 16, marginLeft: 4, color: S.muted }}>{unit}</span>}</span>
      <span style={{ fontSize: 13, color: S.muted }}>{label}</span>
      {description && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>{description}</span>}
      {target && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>Target: {target}</span>}
      <span style={{ fontSize: 11, fontWeight: 600, color: c, background: `${c}22`, padding: '2px 8px', borderRadius: 99, alignSelf: 'flex-start', letterSpacing: '0.05em' }}>
        {status === 'good' ? 'GOOD' : status === 'needs-work' ? 'NEEDS WORK' : status === 'poor' ? 'POOR' : '-'}
      </span>
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

function AdamsTake({ text }: { text?: string | null }) {
  if (!text) return null
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderLeft: `3px solid ${S.orange}`, borderRadius: 12, padding: 24, marginTop: 24 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 10 }}>ADAM&apos;S COMMENTS FROM KLIKS</span>
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
  const keywordTrends: any[] = useMemo(() => cache?.dataforseo_keyword_trends ?? [], [cache?.dataforseo_keyword_trends])
  // backlinksSummary removed - backlinks subscription not available
  const gads = cache?.google_ads_planner
  const metaAds = cache?.meta_ads


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trendMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const t of keywordTrends) {
      if (t.keyword && t.delta != null) map.set(t.keyword, t.delta)
    }
    return map
  }, [keywordTrends])

  const createdDate = new Date(prospect.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  // Revenue calculations
  const revCalc = useMemo(() => {
    const results: any[] = []
    if (ps?.lcp) {
      const lcpS = ps.lcp / 1000
      if (lcpS > 2.5) {
        const traffic = dfsOverview?.metrics?.organic?.etv ?? 500
        const mobile = (lcpS - 2.5) * 0.07 * (traffic * 150 * 12)
        results.push({ initiative: 'Mobile Performance', confidence: lcpS > 4 ? 'High' : 'Medium', impact: mobile, note: null })
      }
    }
    if (cro?.summary) {
      const failedHigh = cro.summary.critical_issues ?? 0
      const traffic = dfsOverview?.metrics?.organic?.etv ?? 500
      const croImpact = failedHigh * 0.03 * (traffic * 150 * 12)
      if (croImpact > 0) {
        results.push({ initiative: 'CRO Improvements', confidence: failedHigh > 2 ? 'High' : 'Medium', impact: croImpact, note: null })
      }
    }
    if (dfsGaps?.length > 0) {
      const topGapsVol = dfsGaps.slice(0, 3).reduce((sum: number, g: any) => sum + (g.keyword_data?.keyword_info?.search_volume ?? 0), 0)
      const seoImpact = topGapsVol * 0.02 * 150 * 12
      results.push({ initiative: 'SEO Content Gap', confidence: 'Medium', impact: seoImpact, note: null })
    }

    const oldAd = metaAds?.oldest_active_date
      ? Math.floor((Date.now() - new Date(metaAds.oldest_active_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    results.push({
      initiative: 'Creative Refresh',
      confidence: 'Qualitative',
      impact: null,
      note: oldAd > 90 ? 'Creative fatigue risk detected - rising CPMs likely.' : 'No immediate flag detected.',
    })

    return results
  }, [ps, cro, dfsOverview, dfsGaps, metaAds])

  const totalRevImpact = revCalc.filter(r => r.impact).reduce((sum: number, r: any) => sum + r.impact, 0)

  const croGroups = useMemo(() => {
    if (!cro?.results) return {}
    const groups: Record<string, any[]> = {}
    for (const item of cro.results) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const movementSummary = useMemo(() => {
    if (keywordTrends.length === 0) return null
    let gaining = 0, stable = 0, losing = 0
    for (const kw of [...kwBuckets.winning, ...kwBuckets.close]) {
      const kwStr = kw.keyword_data?.keyword ?? ''
      const delta = trendMap.get(kwStr)
      if (delta == null) { stable++; continue }
      if (delta > 0) gaining++
      else if (delta < 0) losing++
      else stable++
    }
    return { gaining, stable, losing }
  }, [kwBuckets, trendMap, keywordTrends])

  const navStyle: React.CSSProperties = {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(14,13,26,0.9)', backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${S.border}`,
    padding: '0 24px', height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      {/* Sticky header */}
      <nav style={navStyle}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <span style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 600, color: S.white }}>{prospect.brand_name}</span>
        <a href={prospect.cta_link || '/book'} style={{ background: S.orange, color: '#fff', borderRadius: 100, padding: '10px 24px', textDecoration: 'none', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}>Book a call</a>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 120px' }}>

        {/* Intro card */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 24, padding: 32, marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <SectionLabel>GROWTH AUDIT</SectionLabel>
            <span style={{ color: S.muted, fontSize: 13 }}>{createdDate}</span>
          </div>
          <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 8 }}>{prospect.brand_name}</h1>
          <a href={prospect.store_url} target="_blank" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>{prospect.store_url}</a>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
            {[`Niche: ${prospect.niche}`, `Created: ${createdDate}`, 'Confidential'].map(t => (
              <span key={t} style={{ background: 'rgba(100,75,255,0.08)', border: `1px solid ${S.border}`, borderRadius: 99, padding: '4px 14px', fontSize: 13, color: S.muted }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Audit Scores */}
        <div style={{ marginBottom: 64 }}>
          <SectionLabel>AUDIT SCORES</SectionLabel>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 6 }}>Audit Scores</h2>
          <p style={{ color: S.muted, fontSize: 13, marginBottom: 24 }}>Scores based on Lighthouse analysis &amp; industry benchmarks.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {(() => {
              const val = ps?.performance_score != null && ps.performance_score > 0 ? Math.round(ps.performance_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <MetricCard key="mob" label="Mobile Performance" value={val != null ? val : '--'} unit="/100" status={st} />
            })()}
            {(() => {
              const val = psDesktop?.performance_score != null && psDesktop.performance_score > 0 ? Math.round(psDesktop.performance_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <MetricCard key="desk" label="Desktop Performance" value={val != null ? val : '--'} unit="/100" status={st} />
            })()}
            {(() => {
              const val = ps?.seo_score != null && ps.seo_score > 0 ? Math.round(ps.seo_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <MetricCard key="seo" label="SEO Score" value={val != null ? val : '--'} unit={val != null ? '/100' : undefined} status={st} />
            })()}
            {(() => {
              const val = ps?.accessibility_score != null && ps.accessibility_score > 0 ? Math.round(ps.accessibility_score) : null
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = val == null ? 'neutral' : val >= 90 ? 'good' : val >= 50 ? 'needs-work' : 'poor'
              return <MetricCard key="a11y" label="Accessibility" value={val != null ? val : '--'} unit={val != null ? '/100' : undefined} status={st} />
            })()}
            {(() => {
              const passed = cro?.summary?.passed
              const total = cro?.summary?.total ?? 20
              const val = passed != null ? `${passed}/${total}` : '--'
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = passed == null ? 'neutral' : passed >= 16 ? 'good' : passed >= 10 ? 'needs-work' : 'poor'
              return <MetricCard key="cro-score" label="CRO Score" value={val} status={st} />
            })()}
            {(() => {
              const total = cro?.summary?.total ?? 20
              const passed = cro?.summary?.passed
              const pct = passed != null ? (passed / total * 100) : null
              const grade = pct == null ? '--' : pct > 85 ? 'A' : pct > 70 ? 'B' : pct > 55 ? 'C' : 'D'
              const st: 'good' | 'needs-work' | 'poor' | 'neutral' = grade === 'A' ? 'good' : grade === 'B' ? 'needs-work' : grade === 'C' || grade === 'D' ? 'poor' : 'neutral'
              return <MetricCard key="cro-grade" label="Overall CRO" value={grade} status={st} />
            })()}
          </div>
        </div>

        {/* CRO Score Summary */}
        {cro?.summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 64 }}>
            {[
              { label: 'CRO Score', value: `${cro.summary.passed}/20`, color: cro.summary.passed >= 16 ? '#22c55e' : cro.summary.passed >= 10 ? S.orange : '#ef4444' },
              { label: 'Critical Issues', value: cro.summary.critical_issues, color: cro.summary.critical_issues > 0 ? '#ef4444' : '#22c55e' },
              { label: 'Warnings', value: cro.summary.warnings, color: cro.summary.warnings > 0 ? S.orange : '#22c55e' },
              { label: 'Opportunities', value: cro.summary.opportunities, color: S.purple },
            ].map(item => (
              <div key={item.label} style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, marginBottom: 64, textAlign: 'center', color: S.muted }}>
            {cro?.error ? 'CRO scan unavailable' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: S.orange, animation: 'pulse 1.5s infinite', display: 'inline-block' }} />CRO scan in progress...</span>}
          </div>
        )}

        {/* SECTION 01 - PERFORMANCE */}
        <SectionWrap id="performance">
          <GhostNumber n="01" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>PERFORMANCE</SectionLabel>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 32 }}>Core Web Vitals</h2>

            {ps ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <MetricCard label="LCP" value={ps.lcp ? msToS(ps.lcp) : '-'} unit="s" status={ps.lcp ? getStatus(ps.lcp / 1000, [2.5, 4]) : 'neutral'} description="Largest Contentful Paint — how fast your main content loads" target="<2.5s" />
                  <MetricCard label="FCP" value={ps.fcp ? msToS(ps.fcp) : '-'} unit="s" status={ps.fcp ? getStatus(ps.fcp / 1000, [1.8, 3]) : 'neutral'} description="First Contentful Paint — when the first element appears" target="<1.8s" />
                  <MetricCard label="CLS" value={ps.cls != null ? ps.cls.toFixed(3) : '-'} status={ps.cls != null ? getStatus(ps.cls, [0.1, 0.25]) : 'neutral'} description="Cumulative Layout Shift — how much the page jumps around" target="<0.1" />
                  <MetricCard label="TBT" value={ps.tbt ? Math.round(ps.tbt) : '-'} unit="ms" status={ps.tbt ? getStatus(ps.tbt, [200, 600]) : 'neutral'} description="Total Blocking Time — how long the page is unresponsive" target="<200ms" />
                  <MetricCard label="Speed Index" value={ps.speed_index ? msToS(ps.speed_index) : '-'} unit="s" status={ps.speed_index ? getStatus(ps.speed_index / 1000, [3.4, 5.8]) : 'neutral'} description="How quickly content is visually complete" target="<3.4s" />
                  <MetricCard label="TTI" value={ps.tti ? msToS(ps.tti) : '-'} unit="s" status={ps.tti ? getStatus(ps.tti / 1000, [3.8, 7.3]) : 'neutral'} description="Time to Interactive — when the page is fully usable" target="<3.8s" />
                </div>


                {ps.lcp && ps.lcp / 1000 > 2.5 && (
                  <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.2)', borderLeft: `3px solid ${S.orange}`, borderRadius: 12, padding: 24 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 8 }}>WHAT THIS COSTS YOU</span>
                    <p style={{ color: S.white, lineHeight: 1.7, marginBottom: 8 }}>Every second of load delay costs roughly 7% in conversions. At a $150 average order, slow load times are a direct revenue leak.</p>
                    <p style={{ color: S.muted, fontSize: 13 }}>Based on Google research and industry conversion benchmarks.</p>
                  </div>
                )}

                <AdamsTake text={content?.ai_performance_commentary} />
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[...Array(6)].map((_, i) => <div key={i} style={{ height: 120, borderRadius: 12, background: 'rgba(100,75,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
              </div>
            )}
          </div>
        </SectionWrap>

        {/* SECTION 02 - CRO */}
        <SectionWrap id="cro">
          <GhostNumber n="02" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>CONVERSION RATE OPTIMISATION</SectionLabel>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 32 }}>CRO Checklist</h2>

            {cro?.results ? (
              <>
                {Object.entries(croGroups).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: 32 }}>
                    <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 600, color: S.muted, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{category}</h3>
                    {(items as any[]).map((item, i) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                        background: i % 2 === 0 ? S.bg2 : S.bg,
                        borderLeft: `3px solid ${item.passed ? '#22c55e' : item.importance === 'high' ? '#ef4444' : item.importance === 'medium' ? S.orange : S.muted}`,
                        borderRadius: 8, marginBottom: 2,
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.passed ? '✓' : '✗'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 15, color: item.passed ? S.white : S.muted }}>{item.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 99, background: item.importance === 'high' ? 'rgba(239,68,68,0.12)' : item.importance === 'medium' ? 'rgba(249,115,22,0.12)' : 'rgba(100,75,255,0.12)', color: item.importance === 'high' ? '#ef4444' : item.importance === 'medium' ? '#f97316' : S.purple }}>{item.importance.toUpperCase()}</span>
                          </div>
                          {!item.passed && item.fix && (
                            <p style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                              <span style={{ fontWeight: 700, color: S.orange, marginRight: 4 }}>FIX:</span>
                              <span style={{ color: 'rgba(255,100,50,0.8)' }}>{item.fix}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <div style={{
                  borderRadius: 12, padding: 24, marginTop: 24,
                  border: `1px solid ${cro.summary.passed >= 16 ? '#22c55e' : cro.summary.passed >= 10 ? S.purple : S.orange}`,
                  boxShadow: `0 0 24px ${cro.summary.passed >= 16 ? 'rgba(34,197,94,0.08)' : cro.summary.passed >= 10 ? 'rgba(100,75,255,0.08)' : 'rgba(255,67,21,0.08)'}`,
                  background: S.bg2,
                }}>
                  <p style={{ fontSize: 16, lineHeight: 1.7 }}>
                    <strong>{cro.summary.passed} of 20</strong> ecommerce CRO signals detected on {prospect.brand_name}.{' '}
                    {cro.summary.passed < 10 ? 'Significant conversion optimisation opportunity identified.' : cro.summary.passed <= 15 ? 'Room for meaningful improvement across key conversion signals.' : 'Strong CRO foundation detected.'}
                  </p>
                </div>

                <AdamsTake text={content?.ai_cro_commentary} />
              </>
            ) : (
              <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <p style={{ color: S.muted }}>{cro?.error ? 'Automated CRO scan could not complete for this store. Manual review recommended.' : 'CRO scan in progress...'}</p>
              </div>
            )}
          </div>
        </SectionWrap>

        {/* SECTION 03 - ADS */}
        <SectionWrap id="ads">
          <GhostNumber n="03" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>WHAT I NOTICED</SectionLabel>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 20 }}>Ads and Creative</h2>

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
        </SectionWrap>

        {/* SECTION 04 - AD STRATEGY (legacy manual content, only shown if populated) */}
        {(content?.section_strategy_headline || content?.section_strategy_body) && (
          <SectionWrap id="strategy">
            <GhostNumber n="04" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <SectionLabel>AD STRATEGY</SectionLabel>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 20 }}>Ad Strategy</h2>
              {content?.section_strategy_headline && (
                <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 22, fontWeight: 600, marginBottom: 16 }}>{content.section_strategy_headline}</h3>
              )}
              {content?.section_strategy_body && (
                <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.section_strategy_body}</p>
              )}
            </div>
          </SectionWrap>
        )}

        {/* SECTION 05 - SEO */}
        <SectionWrap id="seo">
          <GhostNumber n="05" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>ORGANIC SEARCH</SectionLabel>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 32 }}>SEO Audit</h2>

            {dfsOverview ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>
                  {(() => {
                    const overviewCount = dfsOverview.metrics?.organic?.count ?? 0
                    const overviewEtv = dfsOverview.metrics?.organic?.etv ?? 0
                    const kwCount = overviewCount > 0 ? overviewCount : dfsKeywords.length
                    const kwEtv = overviewEtv > 0 ? overviewEtv : dfsKeywords.reduce((sum: number, kw: any) => sum + (kw.keyword_data?.keyword_info?.search_volume ?? 0), 0)
                    const refDomains = dfsOverview.metrics?.referring_domains ?? 0
                    return [
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
                      {
                        label: 'Referring Domains', value: refDomains.toLocaleString(),
                        context: refDomains < 20
                          ? 'Very few backlinks - authority building needed'
                          : refDomains <= 100 ? 'Building authority - keep going'
                          : 'Good backlink profile',
                      },
                    ]
                  })().map(item => (
                    <div key={item.label} style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 20px' }}>
                      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700, color: S.white }}>{item.value}</div>
                      <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8, lineHeight: 1.45 }}>{item.context}</div>
                    </div>
                  ))}
                </div>

                {(kwBuckets.winning.length > 0 || kwBuckets.close.length > 0 || kwBuckets.money.length > 0) && (
                  <div style={{ marginBottom: 40 }}>
                    {/* Keyword movement summary */}
                    {movementSummary && (kwBuckets.winning.length > 0 || kwBuckets.close.length > 0) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
                        {[
                          { label: 'Gaining', count: movementSummary.gaining, color: '#22c55e', border: '#22c55e', icon: '↑', insight: 'Rankings improving' },
                          { label: 'Stable', count: movementSummary.stable, color: S.muted, border: 'rgba(255,255,255,0.2)', icon: '→', insight: 'Holding position' },
                          { label: 'Losing', count: movementSummary.losing, color: '#ef4444', border: '#ef4444', icon: '↓', insight: 'Rankings slipping - needs attention' },
                        ].map(item => {
                          const isProminentLosing = item.label === 'Losing' && movementSummary.losing > movementSummary.gaining
                          return (
                            <div key={item.label} style={{
                              background: S.bg2,
                              border: `1px solid ${S.border}`,
                              borderLeft: `3px solid ${item.border}`,
                              borderRadius: 12,
                              padding: '18px 20px',
                              boxShadow: isProminentLosing ? '0 0 16px rgba(239,68,68,0.1)' : undefined,
                            }}>
                              <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: isProminentLosing ? 32 : 26, fontWeight: 700, color: item.color }}>{item.icon} {item.count}</div>
                              <div style={{ fontSize: 13, color: S.white, marginTop: 4, fontWeight: 600 }}>{item.label}</div>
                              <div style={{ fontSize: 12, color: isProminentLosing ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.35)', marginTop: 6, lineHeight: 1.4 }}>{item.insight}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {kwBuckets.winning.length > 0 && (
                      <div style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                          <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, margin: 0 }}>Winning</h3>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', letterSpacing: '0.08em' }}>POSITIONS 1-5</span>
                        </div>
                        <p style={{ color: S.muted, fontSize: 13, marginBottom: 14 }}>Rankings worth protecting and doubling down on.</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                              <tr style={{ background: S.bg }}>
                                {['Keyword', 'Position', 'Monthly Volume', 'Movement'].map(h => (
                                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {kwBuckets.winning.map((kw: any, i: number) => {
                                const delta = trendMap.get(kw.keyword_data?.keyword ?? '')
                                return (
                                  <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                    <td style={{ padding: '10px 14px', color: S.white }}>{kw.keyword_data?.keyword}</td>
                                    <td style={{ padding: '10px 14px', color: '#22c55e', fontWeight: 600 }}>{kw.ranked_serp_element?.serp_item?.rank_group}</td>
                                    <td style={{ padding: '10px 14px', color: S.muted }}>{fmtNum(kw.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                      {delta == null ? <span style={{ color: S.muted }}>—</span>
                                        : delta > 0 ? <span style={{ color: '#22c55e', fontWeight: 600 }}>↑ +{delta}</span>
                                        : delta < 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>↓ {delta}</span>
                                        : <span style={{ color: S.muted }}>→</span>}
                                    </td>
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
                          <span style={{ fontSize: 11, fontWeight: 600, color: S.orange, letterSpacing: '0.08em' }}>POSITIONS 6-15</span>
                        </div>
                        <p style={{ color: S.muted, fontSize: 13, marginBottom: 14 }}>One push away from significantly more traffic.</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                              <tr style={{ background: S.bg }}>
                                {['Keyword', 'Position', 'Monthly Volume', 'Movement'].map(h => (
                                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {kwBuckets.close.map((kw: any, i: number) => {
                                const delta = trendMap.get(kw.keyword_data?.keyword ?? '')
                                return (
                                  <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                    <td style={{ padding: '10px 14px', color: S.white }}>{kw.keyword_data?.keyword}</td>
                                    <td style={{ padding: '10px 14px', color: S.orange, fontWeight: 600 }}>{kw.ranked_serp_element?.serp_item?.rank_group}</td>
                                    <td style={{ padding: '10px 14px', color: S.muted }}>{fmtNum(kw.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                      {delta == null ? <span style={{ color: S.muted }}>—</span>
                                        : delta > 0 ? <span style={{ color: '#22c55e', fontWeight: 600 }}>↑ +{delta}</span>
                                        : delta < 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>↓ {delta}</span>
                                        : <span style={{ color: S.muted }}>→</span>}
                                    </td>
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

                {dfsCompetitors.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Top Competitors</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: S.bg }}>
                            {['Domain', 'Est. Traffic', 'KW Overlap'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dfsCompetitors.slice(0, 5).map((comp: any, i: number) => {
                            const etv = comp.estimated_traffic ?? comp.full_domain_metrics?.organic?.etv ?? 0
                            return (
                              <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                                <td style={{ padding: '10px 14px', color: S.white }}>{comp.domain}</td>
                                <td style={{ padding: '10px 14px', color: S.muted }}>{etv > 0 ? fmtNum(etv) : '—'}</td>
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
                      <span style={{ fontSize: 11, fontWeight: 600, color: S.purple, letterSpacing: '0.08em' }}>COMPETITOR GAP</span>
                    </div>
                    <p style={{ color: S.muted, fontSize: 13, marginBottom: 14 }}>High-intent keywords your competitors rank for. You don&apos;t yet.</p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: S.bg }}>
                            {['Keyword', 'Monthly Volume', 'Competitor'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kwBuckets.money.map((gap: any, i: number) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                              <td style={{ padding: '10px 14px', color: S.white }}>{gap.keyword_data?.keyword ?? gap.keyword}</td>
                              <td style={{ padding: '10px 14px', color: S.muted }}>{fmtNum(gap.keyword_data?.keyword_info?.search_volume ?? 0)}</td>
                              <td style={{ padding: '10px 14px', color: S.muted, fontSize: 12 }}>{dfsCompetitors[0]?.domain ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
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
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
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
        </SectionWrap>

        {/* SECTION 06 - SEO COMMENTARY (legacy manual content, shown only if populated) */}
        {content?.section_seo_headline && (
          <SectionWrap id="seo-commentary">
            <GhostNumber n="06" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <SectionLabel>SEARCH OPPORTUNITY</SectionLabel>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 20 }}>{content.section_seo_headline}</h2>
              {content?.section_seo_body && <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.section_seo_body}</p>}
            </div>
          </SectionWrap>
        )}

        {/* SECTION 07 - BIGGEST OPPORTUNITY */}
        <SectionWrap id="opportunity">
          <GhostNumber n="07" />
          <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,67,21,0.03)', border: '1px solid rgba(255,67,21,0.4)', boxShadow: '0 0 0 1px rgba(255,67,21,0.2), 0 0 48px rgba(255,67,21,0.08)', borderRadius: 16, padding: 40 }}>
            <SectionLabel>YOUR BIGGEST OPPORTUNITY</SectionLabel>
            {content?.ai_opportunity_commentary ? (
              <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.ai_opportunity_commentary}</p>
            ) : content?.section_opportunity_headline ? (
              <>
                <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 20 }}>{content.section_opportunity_headline}</h2>
                {content?.section_opportunity_body && <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17 }}>{content.section_opportunity_body}</p>}
              </>
            ) : (
              <div style={{ height: 80, borderRadius: 8, background: 'rgba(255,67,21,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            )}
          </div>
        </SectionWrap>

        {/* SECTION 08 - REVENUE OPPORTUNITY */}
        <SectionWrap id="revenue">
          <GhostNumber n="08" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>BOTTOM LINE</SectionLabel>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 32 }}>Revenue Opportunity Summary</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: S.bg }}>
                    {['Initiative', 'Confidence', 'Est. Annual Impact'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revCalc.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                      <td style={{ padding: '12px 16px', color: S.white }}>{row.initiative}</td>
                      <td style={{ padding: '12px 16px', color: S.muted }}>{row.confidence}</td>
                      <td style={{ padding: '12px 16px', color: row.impact ? S.white : S.muted }}>{row.impact ? `$${Math.round(row.impact).toLocaleString()}/yr` : row.note}</td>
                    </tr>
                  ))}
                  <tr style={{ background: S.bg, borderTop: `2px solid ${S.border}` }}>
                    <td colSpan={2} style={{ padding: '12px 16px', fontFamily: '"Clash Display", sans-serif', fontWeight: 700, color: S.orange }}>Total Estimated Annual Opportunity</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 700, color: S.orange }}>${Math.round(totalRevImpact).toLocaleString()}/yr estimated</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ color: S.muted, fontSize: 13, marginTop: 16, lineHeight: 1.6 }}>Estimates based on industry benchmarks and public data. Actual results depend on execution, offer quality, and market conditions. Connect your analytics accounts for precise figures.</p>
          </div>
        </SectionWrap>

        {/* SECTION 09 - DATA CONFIDENCE */}
        <SectionWrap id="appendix">
          <GhostNumber n="09" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>APPENDIX</SectionLabel>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 32 }}>Data Confidence Summary</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: S.bg }}>
                    {['Metric', 'Status', 'Source', 'Action Required'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                    ))}
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
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: row.status === 'Verified' ? 'rgba(34,197,94,0.12)' : 'rgba(255,67,21,0.12)', color: row.status === 'Verified' ? '#22c55e' : S.orange }}>{row.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: S.muted }}>{row.source}</td>
                      <td style={{ padding: '10px 14px', color: S.muted }}>{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: S.muted, fontSize: 13, fontStyle: 'italic', marginTop: 16 }}>Connect data sources above to unlock precise, account-level insights beyond public data benchmarks.</p>
          </div>
        </SectionWrap>

        {/* SECTION 10 - NEXT STEP */}
        <SectionWrap id="next-steps">
          <GhostNumber n="10" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionLabel>WHAT HAPPENS NEXT</SectionLabel>
            {(content?.ai_closing_commentary || content?.section_closing_body) && (
              <p style={{ color: S.muted, lineHeight: 1.8, fontSize: 17, marginBottom: 48 }}>
                {content?.ai_closing_commentary || content?.section_closing_body}
              </p>
            )}

            <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 20, padding: 48, textAlign: 'center' }}>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 12 }}>Book a call with Adam.</h2>
              <p style={{ color: S.muted, fontSize: 17, marginBottom: 32 }}>30 minutes. No pitch. Just a plan.</p>
              <a href={prospect.cta_link || '/book'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.orange, color: '#fff', borderRadius: 100, padding: '18px 48px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 18, textDecoration: 'none', transition: 'background 0.2s' }}>Book your call</a>
              <p style={{ color: S.muted, fontSize: 13, marginTop: 16 }}>We work with a small number of brands at a time.</p>
            </div>
          </div>
        </SectionWrap>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${S.border}`, paddingTop: 48, textAlign: 'center' }}>
          <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none', display: 'block', marginBottom: 16 }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
          <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>This report was prepared personally by Adam Nagy for {prospect.brand_name}. It is confidential and intended only for the recipient.</p>
          <p style={{ color: S.muted, fontSize: 13 }}>hello@kliks.com.au | <a href="/" style={{ color: S.muted }}>kliks.com.au</a> | <a href="/privacy" style={{ color: S.muted }}>Privacy Policy</a></p>
        </footer>
      </div>
    </div>
  )
}
