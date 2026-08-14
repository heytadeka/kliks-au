'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isCommentaryPending, getCommentaryReadinessState } from '@/lib/commentary-status'

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


export default function EditAuditClient({ prospect, content, cache }: { prospect: any; content: any; cache: any }) {
  const router = useRouter()
  const [form, setForm] = useState({
    brand_name: prospect.brand_name ?? '',
    store_url: prospect.store_url ?? '',
    prospect_name: prospect.prospect_name ?? '',
    prospect_email: prospect.prospect_email ?? '',
    niche: prospect.niche ?? '',
    cta_link: prospect.cta_link ?? '',
    gmb_cid: prospect.gmb_cid ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [nicheError, setNicheError] = useState('')

  const readinessState = getCommentaryReadinessState(cache, prospect.rescan_locked_at)

  // Re-pulls prospect/cache from the server while a scan looks like it's in
  // flight, so "Scanning..." actually resolves to "Updated" or "Scan
  // stalled" on its own instead of requiring a manual page reload.
  useEffect(() => {
    if (readinessState !== 'scanning') return
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [readinessState, router])

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
    setNicheError('')
    if (form.niche && form.niche.length < 15) {
      setNicheError("Please be more specific - e.g. 'outdoor cat enclosures Australia'")
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/audit/admin/update', {
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
      // PageSpeed is now fetched server-side via Cloud Run (Australia).
      // The rescan route calls /api/audit/pagespeed which calls the Cloud Run service.
      const res = await fetch('/api/audit/admin/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id }),
      })
      const data = await res.json()
      if (!data.success) setError(data.error || 'Rescan failed')
      else router.refresh() // picks up the new rescan_locked_at so the status banner shows "Scanning..." immediately
    } catch {
      setError('Network error')
    } finally {
      setRescanning(false)
    }
  }

  async function handleRetryCommentary() {
    setRetrying(true)
    setError('')
    try {
      const res = await fetch('/api/audit/admin/retry-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id }),
      })
      const data = await res.json()
      if (!data.success) setError(data.error || 'Retry failed')
      else router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setRetrying(false)
    }
  }

  async function handleToggleActive() {
    await fetch('/api/audit/admin/prospect', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prospect.id, is_active: !prospect.is_active }),
    })
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete the audit for ${prospect.brand_name}? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch('/api/audit/admin/prospect', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prospect.id }),
    })
    const data = await res.json()
    if (data.success) router.push('/audit/admin/dashboard')
    else { setError(data.error || 'Delete failed'); setDeleting(false) }
  }

  const auditUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://kliks.com.au'}/audit/${prospect.slug}`

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <Link href="/audit/admin/dashboard" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Back to Dashboard</Link>
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
              {rescanning ? 'Rescanning...' : 'Re-run Data Scan'}
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

        {/* AI commentary status - see getCommentaryReadinessState in lib/commentary-status.ts */}
        {readinessState === 'scanning' && (
          <div style={{ background: 'rgba(100,75,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
            <p style={{ color: S.purple, fontSize: 13, fontWeight: 600 }}>Scanning... data scan in progress, this can take a minute or two.</p>
          </div>
        )}

        {readinessState === 'stalled' && (
          <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ color: S.orange, fontSize: 13, fontWeight: 600 }}>Scan stalled - the last data scan didn&apos;t finish generating commentary. The underlying data may already be ready.</p>
            <button onClick={handleRetryCommentary} disabled={retrying} style={{ background: 'rgba(255,67,21,0.15)', color: S.orange, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {retrying ? 'Retrying...' : 'Retry Commentary'}
            </button>
          </div>
        )}

        {readinessState === 'updated' && (
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
            <p style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>AI commentary is up to date. Run a data scan to regenerate.</p>
          </div>
        )}

        {readinessState === 'idle' && (
          !isCommentaryPending(content) ? (
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
              <p style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>AI commentary is live. Run a data scan to regenerate.</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,67,21,0.05)', border: '1px solid rgba(255,67,21,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
              <p style={{ color: S.orange, fontSize: 13, fontWeight: 600 }}>AI commentary not yet generated, or incomplete. Run a data scan to generate.</p>
            </div>
          )
        )}

        {/* CRO crawl status - surfaces the real failure reason instead of leaving it in the DB only */}
        {cache?.cro_checklist?.error && (
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
            <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              CRO scan failed: {cache.cro_checklist.message ?? 'Unknown error'}
            </p>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Prospect Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Brand Name</label>
                <input value={form.brand_name} onChange={set('brand_name')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Store URL</label>
                <input value={form.store_url} onChange={set('store_url')} style={inputStyle} />
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
                <label style={labelStyle}>Store Niche</label>
                <input
                  value={form.niche}
                  onChange={e => { setNicheError(''); set('niche')(e) }}
                  placeholder="e.g. outdoor cat enclosures Australia, vegan bakery Sydney, eco homewares"
                  style={{ ...inputStyle, borderColor: nicheError ? 'rgba(239,68,68,0.6)' : undefined }}
                />
                {nicheError
                  ? <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{nicheError}</p>
                  : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5 }}>Be specific - the more detail, the better your competitor and keyword analysis.</p>
                }
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input value={form.cta_link} onChange={set('cta_link')} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Google Business ID (optional)</label>
                <input value={form.gmb_cid} onChange={set('gmb_cid')} placeholder="Place ID or CID" style={inputStyle} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5 }}>Optional but recommended. Easiest way: search Google Place ID Finder, find the business, paste the Place ID (starts with ChI). Makes the Google Business section load reliably.</p>
              </div>
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
