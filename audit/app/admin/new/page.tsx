'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', orangeDark: '#c42f08', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', border: 'rgba(100,75,255,0.12)', purple: '#644bff' }

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid rgba(255,255,255,0.12)`,
  borderRadius: 12,
  padding: '14px 18px',
  color: S.white,
  fontFamily: 'Satoshi, sans-serif',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: S.muted,
  display: 'block',
  marginBottom: 6,
}

const helperStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.3)',
  marginTop: 4,
  lineHeight: 1.5,
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface FormData {
  brand_name: string
  slug: string
  store_url: string
  prospect_name: string
  prospect_email: string
  niche: string
  location: string
  gmb_cid: string
  cta_link: string
}

interface AuditStatus {
  pagespeed_mobile: boolean
  pagespeed_desktop: boolean
  cro_checklist: boolean
  dataforseo_overview: boolean
  meta_ads: boolean
  crawled_at: string | null
}

export default function NewAuditPage() {
  const [form, setForm] = useState<FormData>({
    brand_name: '',
    slug: '',
    store_url: '',
    prospect_name: '',
    prospect_email: '',
    niche: '',
    location: '',
    gmb_cid: '',
    cta_link: '',
  })

  const [slugManual, setSlugManual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugError, setSlugError] = useState('')
  const [nicheError, setNicheError] = useState('')
  const [success, setSuccess] = useState<{ slug: string; brand_name: string; prospect_id: string } | null>(null)
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null)
  const [copied, setCopied] = useState('')

  // Auto-slug from brand name
  useEffect(() => {
    if (!slugManual && form.brand_name) {
      setForm(f => ({ ...f, slug: slugify(f.brand_name) }))
    }
  }, [form.brand_name, slugManual])

  // Poll status after success
  useEffect(() => {
    if (!success) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/audit/status?prospect_id=${success.prospect_id}`)
        const data = await res.json()
        setAuditStatus(data)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [success])

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (field === 'slug') { setSlugManual(true); setSlugError('') }
      setForm(f => ({ ...f, [field]: e.target.value }))
    }
  }

  function formatUrl(val: string) {
    const trimmed = val.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return 'https://' + trimmed
  }

  function handleUrlBlur() {
    setForm(f => ({ ...f, store_url: formatUrl(f.store_url) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return  // double-submit guard
    setLoading(true)
    setError('')
    setSlugError('')
    setNicheError('')
    if (form.niche && form.niche.length < 15) {
      setNicheError("Please be more specific - e.g. 'outdoor cat enclosures Australia'")
      setLoading(false)
      return
    }
    const normalised = { ...form, store_url: formatUrl(form.store_url) }
    setForm(normalised)
    try {
      const res = await fetch('/api/audit/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...normalised, location: form.location || null, gmb_cid: form.gmb_cid || null }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess({ slug: data.slug, brand_name: data.brand_name, prospect_id: data.prospect_id })
      } else if (res.status === 409) {
        setSlugError(data.error || 'This slug is already in use.')
        setLoading(false)
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  if (success) {
    const auditUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://kliks.com.au'}/audit/${success.slug}`
    const coldEmail = `Hi ${form.prospect_name || 'there'},

I put together a quick growth audit for ${success.brand_name} - covers your Core Web Vitals, a 20-point CRO checklist, your organic search footprint, and what I think the biggest opportunity is.

You can view it here: ${auditUrl}

Use your email address (${form.prospect_email}) to access it.

Let me know if you want to jump on a quick call to walk through it.

Adam
Kliks`

    const statusChecks = [
      { label: 'PageSpeed (Mobile + Desktop)', done: auditStatus?.pagespeed_mobile && auditStatus?.pagespeed_desktop },
      { label: 'CRO Checklist', done: auditStatus?.cro_checklist },
      { label: 'SEO / DataForSEO', done: auditStatus?.dataforseo_overview },
      { label: 'Meta Ad Library', done: auditStatus?.meta_ads },
    ]
    const allDone = statusChecks.every(s => s.done)

    return (
      <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
        <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
          <Link href="/audit/admin/dashboard" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Back to Dashboard</Link>
        </nav>

        <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: 40, marginBottom: 40 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#22c55e', display: 'block', marginBottom: 12 }}>AUDIT CREATED</span>
            <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{success.brand_name}</h1>
            <p style={{ color: S.muted, marginBottom: 24 }}>Background jobs are running. AI commentary will generate automatically once data is collected.</p>

            {/* Status */}
            <div style={{ background: S.bg2, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                {allDone ? 'All data collected' : 'Collecting data...'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {statusChecks.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: s.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${s.done ? '#22c55e' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {s.done ? '✓' : ''}
                    </span>
                    <span style={{ fontSize: 14, color: s.done ? S.white : S.muted }}>{s.label}</span>
                    {!s.done && <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.orange, animation: 'pulse 1.5s infinite', display: 'inline-block', marginLeft: 'auto' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit URL */}
            <div style={{ background: S.bg2, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: S.muted, marginBottom: 8 }}>Audit URL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <code style={{ flex: 1, fontSize: 14, color: S.purple, wordBreak: 'break-all' }}>{auditUrl}</code>
                <button onClick={() => copyText(auditUrl, 'url')} style={{ background: copied === 'url' ? 'rgba(34,197,94,0.12)' : 'rgba(100,75,255,0.12)', color: copied === 'url' ? '#22c55e' : S.purple, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                  {copied === 'url' ? 'Copied!' : 'Copy'}
                </button>
                <a href={auditUrl} target="_blank" style={{ color: S.muted, fontSize: 13, textDecoration: 'none' }}>Preview</a>
              </div>
            </div>

            {/* Cold email template */}
            <div style={{ background: S.bg2, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: S.white }}>Cold Email Template</div>
                <button onClick={() => copyText(coldEmail, 'email')} style={{ background: copied === 'email' ? 'rgba(34,197,94,0.12)' : 'rgba(100,75,255,0.12)', color: copied === 'email' ? '#22c55e' : S.purple, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  {copied === 'email' ? 'Copied!' : 'Copy email'}
                </button>
              </div>
              <pre style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{coldEmail}</pre>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/audit/admin/dashboard" style={{ flex: 1, background: S.bg2, border: `1px solid ${S.border}`, color: S.white, borderRadius: 100, padding: '14px 28px', textDecoration: 'none', fontWeight: 600, fontSize: 15, textAlign: 'center' as const }}>Back to Dashboard</Link>
            <Link href="/audit/admin/new" style={{ flex: 1, background: S.orange, color: '#fff', borderRadius: 100, padding: '14px 28px', textDecoration: 'none', fontWeight: 600, fontSize: 15, textAlign: 'center' as const }}>Create Another</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <Link href="/audit/admin/dashboard" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Back to Dashboard</Link>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 12 }}>ADMIN</span>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 36, fontWeight: 700, letterSpacing: '0.01em', marginBottom: 8 }}>New Audit</h1>
        <p style={{ color: S.muted, marginBottom: 48 }}>Fill in the prospect details. All data collection and AI commentary runs automatically on submission.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Prospect Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Brand Name *</label>
                <input value={form.brand_name} onChange={set('brand_name')} placeholder="e.g. Bondi Boost" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Slug *</label>
                <input
                  value={form.slug}
                  onChange={set('slug')}
                  placeholder="e.g. bondi-boost"
                  required
                  style={{ ...inputStyle, borderColor: slugError ? 'rgba(239,68,68,0.6)' : undefined }}
                />
                {slugError
                  ? <p style={{ ...helperStyle, color: '#ef4444', marginTop: 6 }}>{slugError}</p>
                  : <p style={helperStyle}>Auto-generated from brand name. Edit to customise.</p>
                }
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Store URL *</label>
              <input value={form.store_url} onChange={set('store_url')} onBlur={handleUrlBlur} placeholder="https://example.com.au" required style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Contact Name</label>
                <input value={form.prospect_name} onChange={set('prospect_name')} placeholder="First name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact Email *</label>
                <input value={form.prospect_email} onChange={set('prospect_email')} placeholder="name@brand.com" required style={inputStyle} type="email" />
                <p style={helperStyle}>Used for gate authentication.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Store Niche</label>
                <input
                  value={form.niche}
                  onChange={e => { setNicheError(''); set('niche')(e) }}
                  placeholder="e.g. outdoor cat enclosures Australia, vegan bakery Sydney, eco homewares"
                  style={{ ...inputStyle, borderColor: nicheError ? 'rgba(239,68,68,0.6)' : undefined }}
                />
                {nicheError
                  ? <p style={{ ...helperStyle, color: '#ef4444', marginTop: 6 }}>{nicheError}</p>
                  : <p style={helperStyle}>Be specific - the more detail, the better your competitor and keyword analysis.</p>
                }
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={form.location} onChange={set('location')} placeholder="e.g. Sydney NSW" style={inputStyle} />
                <p style={helperStyle}>Used to find local competitors. City and state is enough.</p>
              </div>
              <div>
                <label style={labelStyle}>Google Business CID (optional)</label>
                <input value={form.gmb_cid} onChange={set('gmb_cid')} placeholder="e.g. 15315986762384699028" style={inputStyle} />
                <p style={helperStyle}>Optional but recommended. Find it on the Google Maps listing: right-click, View Page Source, search "ludocid". Makes the Google Business section load reliably.</p>
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input value={form.cta_link} onChange={set('cta_link')} placeholder="https://cal.com/..." style={inputStyle} />
                <p style={helperStyle}>Defaults to /book if blank.</p>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '18px 48px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 17, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginBottom: 12 }}>
            {loading ? 'Creating audit and generating AI commentary...' : 'Create Audit'}
          </button>
          <p style={{ textAlign: 'center', color: S.muted, fontSize: 13 }}>AI commentary will be generated automatically from live data after submission.</p>
        </form>
      </div>
    </div>
  )
}
