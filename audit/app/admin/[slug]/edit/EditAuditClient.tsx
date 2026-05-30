'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BP } from '@/lib/config'

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: S.muted,
  display: 'block',
  marginBottom: 6,
}

export default function EditAuditClient({ prospect, content }: { prospect: any; content: any }) {
  const router = useRouter()
  const [form, setForm] = useState({
    brand_name: prospect.brand_name ?? '',
    store_url: prospect.store_url ?? '',
    prospect_name: prospect.prospect_name ?? '',
    prospect_email: prospect.prospect_email ?? '',
    niche: prospect.niche ?? '',
    cta_link: prospect.cta_link ?? '',
    section_ads_headline: content?.section_ads_headline ?? '',
    section_ads_body: content?.section_ads_body ?? '',
    section_strategy_headline: content?.section_strategy_headline ?? '',
    section_strategy_body: content?.section_strategy_body ?? '',
    section_seo_headline: content?.section_seo_headline ?? '',
    section_seo_body: content?.section_seo_body ?? '',
    section_opportunity_headline: content?.section_opportunity_headline ?? '',
    section_opportunity_body: content?.section_opportunity_body ?? '',
    section_closing_body: content?.section_closing_body ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`${BP}/api/audit/admin/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id, ...form }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(data.error || 'Save failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRescan() {
    setRescanning(true)
    setError('')
    try {
      const res = await fetch(`${BP}/api/audit/admin/rescan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id }),
      })
      const data = await res.json()
      if (!data.success) setError(data.error || 'Rescan failed')
      else alert('Rescan triggered. Data will update in ~30 seconds.')
    } catch {
      setError('Network error')
    } finally {
      setRescanning(false)
    }
  }

  async function handleToggleActive() {
    await fetch(`${BP}/api/audit/admin/prospect`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prospect.id, is_active: !prospect.is_active }),
    })
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete the audit for ${prospect.brand_name}? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`${BP}/api/audit/admin/prospect`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prospect.id }),
    })
    const data = await res.json()
    if (data.success) router.push('/admin/dashboard')
    else { setError(data.error || 'Delete failed'); setDeleting(false) }
  }

  const auditUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://kliks.com.au'}/audit/${prospect.slug}`

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <Link href="/admin/dashboard" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Back to Dashboard</Link>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 8 }}>EDIT AUDIT</span>
            <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em' }}>{prospect.brand_name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={auditUrl} target="_blank" style={{ color: S.purple, fontSize: 13, textDecoration: 'none', border: `1px solid ${S.border}`, borderRadius: 8, padding: '6px 14px' }}>Preview</a>
            <button onClick={handleRescan} disabled={rescanning} style={{ background: 'rgba(100,75,255,0.12)', color: S.purple, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {rescanning ? 'Rescanning...' : 'Rescan'}
            </button>
            <button onClick={handleToggleActive} style={{ background: prospect.is_active ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: prospect.is_active ? '#ef4444' : '#22c55e', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {prospect.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <p style={{ color: S.muted, fontSize: 13, marginBottom: 40 }}>/{prospect.slug} &middot; {prospect.access_count ?? 0} views &middot; {prospect.is_active ? 'Active' : 'Inactive'}</p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Prospect Details */}
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Prospect Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Brand Name</label>
                <input value={form.brand_name} onChange={set('brand_name')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Store URL</label>
                <input value={form.store_url} onChange={set('store_url')} style={inputStyle} type="url" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Contact Name</label>
                <input value={form.prospect_name} onChange={set('prospect_name')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact Email</label>
                <input value={form.prospect_email} onChange={set('prospect_email')} style={inputStyle} type="email" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Niche</label>
                <input value={form.niche} onChange={set('niche')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input value={form.cta_link} onChange={set('cta_link')} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Written Content */}
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Written Content</h2>

            {[
              { key_h: 'section_ads_headline', key_b: 'section_ads_body', label: 'Ads & Creative', placeholder_h: 'What I noticed in your ads', placeholder_b: 'Your observations about their creative...' },
              { key_h: 'section_strategy_headline', key_b: 'section_strategy_body', label: 'Ad Strategy', placeholder_h: 'Where the strategy is strong — and where it isn\'t', placeholder_b: 'Your assessment of their paid media strategy...' },
              { key_h: 'section_seo_headline', key_b: 'section_seo_body', label: 'Search Opportunity', placeholder_h: 'There\'s untapped search demand here', placeholder_b: 'Commentary on their organic search position...' },
              { key_h: 'section_opportunity_headline', key_b: 'section_opportunity_body', label: 'Biggest Opportunity', placeholder_h: 'Fix the funnel before scaling spend', placeholder_b: 'The single most impactful thing they could do...' },
            ].map(({ key_h, key_b, label, placeholder_h, placeholder_b }, i) => (
              <div key={key_h} style={{ marginBottom: i < 3 ? 28 : 0, paddingBottom: i < 3 ? 28 : 0, borderBottom: i < 3 ? `1px solid ${S.border}` : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: S.orange, marginBottom: 12 }}>{label}</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Headline</label>
                  <input value={(form as any)[key_h]} onChange={set(key_h)} placeholder={placeholder_h} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Body</label>
                  <textarea value={(form as any)[key_b]} onChange={set(key_b)} placeholder={placeholder_b} style={textareaStyle} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: 28, paddingTop: 28, borderTop: `1px solid ${S.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: S.orange, marginBottom: 12 }}>Closing</div>
              <label style={labelStyle}>Body</label>
              <textarea value={form.section_closing_body} onChange={set('section_closing_body')} placeholder="Bridge from the audit to the call..." style={textareaStyle} />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ background: saved ? 'rgba(34,197,94,0.8)' : loading ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '16px 40px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 16, cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? 'Saved!' : loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
