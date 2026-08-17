'use client'
import { useState, useEffect } from 'react'
import { EmailDraft } from '@/lib/email-draft'
import EmailDraftBox from '@/components/EmailDraftBox'

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function prefillBrandName(domain: string): string {
  const s = domain
    .replace(/\.(com\.au|net\.au|org\.au|com|net|org|au)$/i, '')
    .replace(/[.\-_]/g, ' ')
    .trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function fmtTraffic(n: number | null): string {
  if (n == null || n === 0) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(Math.round(n))
}

function sortByTraffic(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const ta = a.traffic_current ?? -1
    const tb = b.traffic_current ?? -1
    return tb - ta
  })
}

// emailBody/emailSubject moved to lib/email-draft.ts - shared with the
// Audits/Outreach detail panel's on-demand "Generate reach-out email" CTA.

// ─── Sub-components ─────────────────────────────────────────────────────────

function AdminNav({ active }: { active: 'today' | 'audits' | 'pipeline' | 'outreach' }) {
  const pill = (href: string, label: string, key: typeof active) => (
    <a key={key} href={href} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: active === key ? 'rgba(255,67,21,0.15)' : 'transparent', color: active === key ? S.orange : 'rgba(255,255,255,0.5)' }}>{label}</a>
  )
  return (
    <div style={{ background: S.bg2, borderBottom: '1px solid rgba(100,75,255,0.15)', height: 48, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {pill('/audit/admin/today', 'Today', 'today')}
      {pill('/audit/admin/dashboard', 'Audits', 'audits')}
      {pill('/audit/admin/pipeline', 'Pipeline', 'pipeline')}
      {pill('/audit/admin/outreach', 'Outreach', 'outreach')}
    </div>
  )
}

function PlatformPill({ platform }: { platform: string }) {
  if (platform === 'shopify') return <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Shopify</span>
  if (platform === 'squarespace') return <span style={{ background: 'rgba(100,75,255,0.15)', color: S.purple, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Squarespace</span>
  return <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Unknown</span>
}

function StatusPill({ status }: { status: string }) {
  const c: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
    paused:    { bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
    converted: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.4)' },
    ignored:   { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.35)' },
  }
  const col = c[status] ?? c.active
  return <span style={{ background: col.bg, color: col.text, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

function DropCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: 'rgba(255,255,255,0.25)' }}>-</span>
  const rounded = Math.abs(Math.round(pct))
  if (pct < 0) return <span style={{ color: '#22c55e', fontWeight: 500 }}>↑ {rounded}%</span>
  if (pct > 15) return <span style={{ color: '#ef4444', fontWeight: 600 }}>↓ {rounded}%</span>
  return <span style={{ color: 'rgba(255,255,255,0.4)' }}>↓ {rounded}%</span>
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: S.bg,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 14px',
  color: S.white,
  fontFamily: 'Satoshi, sans-serif',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Form = { brand_name: string; prospect_name: string; prospect_email: string; niche: string; location: string; gmb_cid: string; slug: string }
type TrafficResult = { checked: number; flagged_new: number; flagged_domains: { domain: string; drop_pct: number; platform: string }[] }

// ─── Main component ──────────────────────────────────────────────────────────

export default function PipelineClient({ initialDomains }: { initialDomains: any[] }) {
  const [domains, setDomains] = useState<any[]>(sortByTraffic(initialDomains))

  // Discover
  const [query, setQuery] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [lastDiscover, setLastDiscover] = useState<{ shopify: number; squarespace: number } | null>(null)

  // Traffic check
  const [checking, setChecking] = useState(false)
  const [trafficResult, setTrafficResult] = useState<TrafficResult | null>(null)

  // Create audit modal
  const [createDomain, setCreateDomain] = useState<any | null>(null)
  const [form, setForm] = useState<Form>({ brand_name: '', prospect_name: '', prospect_email: '', niche: '', location: '', gmb_cid: '', slug: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Email draft - copy-state lives inside EmailDraftBox itself now
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null)

  // Keep slug in sync with brand name edits
  useEffect(() => {
    setForm(prev => ({ ...prev, slug: slugify(prev.brand_name) }))
  }, [form.brand_name])

  async function refreshDomains() {
    const res = await fetch('/api/pipeline/domains')
    if (res.ok) {
      const data = await res.json()
      setDomains(sortByTraffic(data.domains ?? []))
    }
  }

  async function handleLogout() {
    await fetch('/api/audit/admin/auth', { method: 'DELETE' })
    window.location.href = '/audit/admin'
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
      setTrafficResult({ checked: data.checked ?? 0, flagged_new: data.flagged_new ?? 0, flagged_domains: data.flagged_domains ?? [] })
      await refreshDomains()
    } finally {
      setChecking(false)
    }
  }

  function openCreateModal(row: any) {
    const brandName = prefillBrandName(row.domain)
    setForm({
      brand_name: brandName,
      prospect_name: '',
      prospect_email: '',
      niche: row.niche ?? '',
      location: '',
      gmb_cid: '',
      slug: slugify(brandName),
    })
    setCreateError('')
    setEmailDraft(null)
    setCreateDomain(row)
  }

  function closeAll() {
    setCreateDomain(null)
    setEmailDraft(null)
    setCreateError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      // Step 1 — create the prospect (fires all background jobs automatically)
      const res = await fetch('/api/audit/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: form.brand_name,
          slug: form.slug,
          store_url: `https://${createDomain.domain}`,
          prospect_name: form.prospect_name,
          prospect_email: form.prospect_email,
          niche: form.niche,
          location: form.location || null,
          gmb_cid: form.gmb_cid || null,
          cta_link: 'https://kliks.com.au/book',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setCreateError(data.error ?? 'Creation failed.')
        return
      }

      // Step 2 — mark domain as converted in pipeline, store slug + brand_name for View Email
      await fetch('/api/pipeline/mark-converted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: createDomain.domain, slug: form.slug, brand_name: form.brand_name }),
      })

      // Step 3 — show email draft, close create form
      setEmailDraft({
        platform: createDomain.platform ?? 'shopify',
        brand_name: form.brand_name,
        prospect_name: form.prospect_name,
        prospect_email: form.prospect_email,
        slug: form.slug,
      })
      setCreateDomain(null)

      // Step 4 — refresh table
      await refreshDomains()
    } finally {
      setCreating(false)
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
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: '6px 14px', fontSize: 14, cursor: 'pointer' }}>Logout</button>
      </nav>
      <AdminNav active="pipeline" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', marginBottom: 32 }}>Pipeline</h1>

        {/* Discover card */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 16 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, marginBottom: 16 }}>Discover Stores</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && !discovering && handleDiscover()} placeholder="e.g. vegan bakery australia"
              style={{ flex: 1, minWidth: 240, background: S.bg, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 16px', color: S.white, fontFamily: 'Satoshi, sans-serif', fontSize: 14, outline: 'none' }} />
            {lastDiscover && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>{lastDiscover.shopify} Shopify</span>
                <span style={{ background: 'rgba(100,75,255,0.15)', color: S.purple, borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>{lastDiscover.squarespace} Squarespace</span>
              </div>
            )}
            <button onClick={handleDiscover} disabled={discovering || !query.trim()}
              style={{ background: discovering || !query.trim() ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: discovering || !query.trim() ? 'not-allowed' : 'pointer', opacity: discovering || !query.trim() ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {discovering ? 'Discovering...' : 'Discover'}
            </button>
          </div>
        </div>

        {/* Traffic check card */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, marginBottom: 6 }}>Traffic Check</h2>
          <p style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Run manually or waits for Monday 9am AEST auto-check.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleCheckTraffic} disabled={checking}
              style={{ background: checking ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: checking ? 'not-allowed' : 'pointer', opacity: checking ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {checking ? 'Checking...' : 'Check Traffic Now'}
            </button>
            {trafficResult && !checking && (
              <span style={{ fontSize: 13, color: S.muted }}>
                Checked {trafficResult.checked} domain{trafficResult.checked !== 1 ? 's' : ''}.{' '}
                {trafficResult.flagged_new > 0
                  ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{trafficResult.flagged_new} newly flagged.</span>
                  : <span>No new flags.</span>}
              </span>
            )}
          </div>
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

        {/* Create Audit modal */}
        {createDomain && (
          <div style={{ background: S.bg2, border: '1px solid rgba(100,75,255,0.2)', borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white }}>
                Create Audit - <span style={{ color: S.muted, fontFamily: 'monospace', fontSize: 15 }}>{createDomain.domain}</span>
              </h2>
              <button onClick={closeAll} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer', padding: 0 }}>Cancel</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>BRAND NAME</label>
                  <input required value={form.brand_name} onChange={e => setForm(p => ({ ...p, brand_name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>PROSPECT NAME</label>
                  <input required value={form.prospect_name} onChange={e => setForm(p => ({ ...p, prospect_name: e.target.value }))} placeholder="First name of contact" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>PROSPECT EMAIL</label>
                  <input required type="email" value={form.prospect_email} onChange={e => setForm(p => ({ ...p, prospect_email: e.target.value }))} placeholder="their@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>NICHE</label>
                  <input required value={form.niche} onChange={e => setForm(p => ({ ...p, niche: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>LOCATION</label>
                  <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Sydney NSW" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>GOOGLE BUSINESS ID (OPTIONAL)</label>
                  <input value={form.gmb_cid} onChange={e => setForm(p => ({ ...p, gmb_cid: e.target.value }))} placeholder="Place ID or CID" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>SLUG</label>
                  <input required value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              {createError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{createError}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button type="submit" disabled={creating}
                  style={{ background: creating ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Creating...' : 'Create Audit & Generate Email'}
                </button>
                <button type="button" onClick={closeAll} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer', padding: 0 }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Email draft */}
        {emailDraft && <EmailDraftBox draft={emailDraft} badgeLabel="✓ Audit Created" onDone={closeAll} />}

        {/* Domain table */}
        <div>
          <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>
            {domains.length} domain{domains.length !== 1 ? 's' : ''} monitored - {shopifyCount} Shopify, {squarespaceCount} Squarespace
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
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {domains.map((row: any, i: number) => {
                    const isConverted = row.status === 'converted'
                    return (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? S.bg2 : S.bg, opacity: isConverted ? 0.6 : 1 }}>
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
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {!isConverted && row.status !== 'ignored' && (
                              <button onClick={() => handleIgnore(row.id)}
                                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: S.muted, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                                Ignore
                              </button>
                            )}
                            {isConverted ? (
                              <>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Audit Created</span>
                                {(row.audit_slug || row.audit_brand_name) && (
                                  <button
                                    onClick={() => setEmailDraft({
                                      platform: row.platform ?? 'shopify',
                                      brand_name: row.audit_brand_name ?? prefillBrandName(row.domain),
                                      prospect_name: '',
                                      prospect_email: null,
                                      slug: row.audit_slug ?? slugify(prefillBrandName(row.domain)),
                                    })}
                                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}
                                  >
                                    View Email
                                  </button>
                                )}
                              </>
                            ) : (
                              <button onClick={() => openCreateModal(row)}
                                style={{ background: 'rgba(255,67,21,0.12)', border: 'none', color: S.orange, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                Create Audit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
