'use client'
import { useState } from 'react'

const S = {
  bg: '#0e0d1a',
  bg2: '#1a1828',
  orange: '#ff4315',
  orangeDark: '#c42f08',
  white: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  border: 'rgba(100,75,255,0.12)',
  purple: '#644bff',
}

function AdminNav({ active }: { active: 'audits' | 'pipeline' }) {
  return (
    <div style={{
      background: S.bg2,
      borderBottom: '1px solid rgba(100,75,255,0.15)',
      height: 48,
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <a
        href="/audit/admin/dashboard"
        style={{
          padding: '6px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          background: active === 'audits' ? 'rgba(255,67,21,0.15)' : 'transparent',
          color: active === 'audits' ? S.orange : 'rgba(255,255,255,0.5)',
        }}
      >
        Audits
      </a>
      <a
        href="/audit/admin/pipeline"
        style={{
          padding: '6px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          background: active === 'pipeline' ? 'rgba(255,67,21,0.15)' : 'transparent',
          color: active === 'pipeline' ? S.orange : 'rgba(255,255,255,0.5)',
        }}
      >
        Pipeline
      </a>
    </div>
  )
}

function PlatformPill({ platform }: { platform: string }) {
  if (platform === 'shopify') {
    return <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Shopify</span>
  }
  if (platform === 'squarespace') {
    return <span style={{ background: 'rgba(100,75,255,0.15)', color: S.purple, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Squarespace</span>
  }
  return <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Unknown</span>
}

function StatusPill({ status }: { status: string }) {
  const colours: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
    paused:    { bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
    converted: { bg: 'rgba(100,75,255,0.15)',  text: S.purple },
    ignored:   { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.35)' },
  }
  const c = colours[status] ?? colours.active
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function fmtTraffic(n: number | null): string {
  if (n == null || n === 0) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(Math.round(n))
}

function DropCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: 'rgba(255,255,255,0.25)' }}>-</span>
  const rounded = Math.abs(Math.round(pct))
  if (pct < 0) {
    // Traffic went up — negative drop
    return <span style={{ color: '#22c55e', fontWeight: 500 }}>↑ {rounded}%</span>
  }
  if (pct > 15) {
    return <span style={{ color: '#ef4444', fontWeight: 600 }}>↓ {rounded}%</span>
  }
  return <span style={{ color: 'rgba(255,255,255,0.4)' }}>↓ {rounded}%</span>
}

type TrafficResult = {
  checked: number
  flagged_new: number
  flagged_domains: { domain: string; drop_pct: number; platform: string }[]
}

export default function PipelineClient({ initialDomains }: { initialDomains: any[] }) {
  const [domains, setDomains] = useState<any[]>(initialDomains)

  // Discover state
  const [query, setQuery] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [lastDiscover, setLastDiscover] = useState<{ shopify: number; squarespace: number } | null>(null)

  // Traffic check state
  const [checking, setChecking] = useState(false)
  const [trafficResult, setTrafficResult] = useState<TrafficResult | null>(null)

  async function handleLogout() {
    await fetch('/api/audit/admin/auth', { method: 'DELETE' })
    window.location.href = '/audit/admin'
  }

  async function refreshDomains() {
    const res = await fetch('/api/pipeline/domains')
    if (res.ok) {
      const data = await res.json()
      setDomains(data.domains ?? [])
    }
  }

  async function handleDiscover() {
    if (!query.trim()) return
    setDiscovering(true)
    setLastDiscover(null)
    try {
      const res = await fetch('/api/pipeline/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), max_results: 30 }),
      })
      const data = await res.json()
      setLastDiscover({ shopify: data.shopify_found ?? 0, squarespace: data.squarespace_found ?? 0 })
      await refreshDomains()
    } finally {
      setDiscovering(false)
    }
  }

  async function handleCheckTraffic() {
    setChecking(true)
    setTrafficResult(null)
    try {
      const res = await fetch('/api/pipeline/check-traffic', { method: 'POST' })
      const data = await res.json()
      setTrafficResult({
        checked: data.checked ?? 0,
        flagged_new: data.flagged_new ?? 0,
        flagged_domains: data.flagged_domains ?? [],
      })
      await refreshDomains()
    } finally {
      setChecking(false)
    }
  }

  async function handleIgnore(id: string) {
    await fetch('/api/pipeline/domains', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'ignored' }),
    })
    setDomains(prev => prev.map(d => d.id === id ? { ...d, status: 'ignored' } : d))
  }

  const shopifyCount = domains.filter(d => d.platform === 'shopify').length
  const squarespaceCount = domains.filter(d => d.platform === 'squarespace').length

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      {/* Top nav */}
      <nav style={{
        background: 'rgba(14,13,26,0.95)',
        borderBottom: `1px solid ${S.border}`,
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: '6px 14px', fontSize: 14, cursor: 'pointer' }}>Logout</button>
      </nav>

      {/* Section nav */}
      <AdminNav active="pipeline" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', marginBottom: 32 }}>Pipeline</h1>

        {/* Discover card */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 16 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, marginBottom: 16 }}>Discover Stores</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !discovering && handleDiscover()}
              placeholder="e.g. vegan bakery australia"
              style={{
                flex: 1,
                minWidth: 240,
                background: S.bg,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '12px 16px',
                color: S.white,
                fontFamily: 'Satoshi, sans-serif',
                fontSize: 14,
                outline: 'none',
              }}
            />
            {lastDiscover && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                  {lastDiscover.shopify} Shopify
                </span>
                <span style={{ background: 'rgba(100,75,255,0.15)', color: S.purple, borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                  {lastDiscover.squarespace} Squarespace
                </span>
              </div>
            )}
            <button
              onClick={handleDiscover}
              disabled={discovering || !query.trim()}
              style={{
                background: discovering || !query.trim() ? S.orangeDark : S.orange,
                color: '#fff',
                border: 'none',
                borderRadius: 100,
                padding: '12px 28px',
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                cursor: discovering || !query.trim() ? 'not-allowed' : 'pointer',
                opacity: discovering || !query.trim() ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {discovering ? 'Discovering...' : 'Discover'}
            </button>
          </div>
        </div>

        {/* Traffic check card */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, marginBottom: 6 }}>Traffic Check</h2>
          <p style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Run manually or waits for Monday 9am AEST auto-check.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCheckTraffic}
              disabled={checking}
              style={{
                background: checking ? S.orangeDark : S.orange,
                color: '#fff',
                border: 'none',
                borderRadius: 100,
                padding: '12px 28px',
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                cursor: checking ? 'not-allowed' : 'pointer',
                opacity: checking ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {checking ? 'Checking...' : 'Check Traffic Now'}
            </button>

            {trafficResult && !checking && (
              <span style={{ fontSize: 13, color: S.muted }}>
                Checked {trafficResult.checked} domain{trafficResult.checked !== 1 ? 's' : ''}.{' '}
                {trafficResult.flagged_new > 0
                  ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{trafficResult.flagged_new} newly flagged.</span>
                  : <span>No new flags.</span>
                }
              </span>
            )}
          </div>

          {/* Flagged domains list */}
          {trafficResult && trafficResult.flagged_new > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trafficResult.flagged_domains.map(d => (
                <div key={d.domain} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: S.white }}>{d.domain}</span>
                  <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>↓ {d.drop_pct}%</span>
                  <PlatformPill platform={d.platform} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Domain table */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>
            {domains.length} domain{domains.length !== 1 ? 's' : ''} monitored — {shopifyCount} Shopify, {squarespaceCount} Squarespace
          </p>

          {domains.length === 0 ? (
            <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <p style={{ color: S.muted, fontSize: 14 }}>No domains yet. Run a discovery above.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: S.bg }}>
                    {['Domain', 'Platform', 'Niche', 'Status', 'Traffic', 'Drop %', 'Flagged', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        color: S.orange,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                        borderBottom: `1px solid ${S.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {domains.map((row: any, i: number) => (
                    <tr key={row.id} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                      <td style={{ padding: '12px 14px', color: S.white, fontFamily: 'monospace', fontSize: 13 }}>{row.domain}</td>
                      <td style={{ padding: '12px 14px' }}><PlatformPill platform={row.platform} /></td>
                      <td style={{ padding: '12px 14px', color: S.muted, fontSize: 13, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.niche ?? '-'}</td>
                      <td style={{ padding: '12px 14px' }}><StatusPill status={row.status ?? 'active'} /></td>
                      <td style={{ padding: '12px 14px', color: S.muted }}>{fmtTraffic(row.traffic_current)}</td>
                      <td style={{ padding: '12px 14px' }}><DropCell pct={row.traffic_drop_pct} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        {row.flagged
                          ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} title="Flagged" />
                          : <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {row.status !== 'ignored' && (
                            <button
                              onClick={() => handleIgnore(row.id)}
                              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: S.muted, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                            >
                              Ignore
                            </button>
                          )}
                          <a
                            href={`/audit/admin/new?domain=${encodeURIComponent(row.domain)}`}
                            style={{ background: 'rgba(255,67,21,0.12)', color: S.orange, borderRadius: 6, padding: '4px 10px', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                          >
                            Create Audit
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
