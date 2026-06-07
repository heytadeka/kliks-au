'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  audit_created: 'Audit Created',
  email_sent: 'Email Sent',
  opened: 'Opened',
  no_response: 'No Response',
  responded: 'Responded',
  call_booked: 'Call Booked',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
  not_a_fit: 'Not a Fit',
}

const STATUS_BG: Record<string, string> = {
  audit_created: 'rgba(255,255,255,0.05)',
  email_sent: 'rgba(99,102,241,0.15)',
  opened: 'rgba(249,115,22,0.15)',
  no_response: 'rgba(239,68,68,0.1)',
  responded: 'rgba(59,130,246,0.15)',
  call_booked: 'rgba(34,197,94,0.15)',
  proposal_sent: 'rgba(34,197,94,0.2)',
  won: 'rgba(34,197,94,0.3)',
  lost: 'rgba(239,68,68,0.15)',
  not_a_fit: 'rgba(255,255,255,0.05)',
}

const STATUS_COLOR: Record<string, string> = {
  audit_created: 'rgba(255,255,255,0.5)',
  email_sent: '#818cf8',
  opened: '#f97316',
  no_response: '#f87171',
  responded: '#60a5fa',
  call_booked: '#22c55e',
  proposal_sent: '#22c55e',
  won: '#4ade80',
  lost: '#ef4444',
  not_a_fit: 'rgba(255,255,255,0.35)',
}

const CLOSED = ['won', 'lost', 'not_a_fit']

const LOST_REASONS = ['Price', 'Timing', 'No response', 'Went elsewhere', 'Not a fit', 'Other']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function timeAgo(d: string | null | undefined): string {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

function dueDateColor(d: string | null | undefined): string {
  if (!d) return S.muted
  const ms = new Date(d).getTime() - Date.now()
  if (ms < 0) return '#ef4444'
  if (ms < 86_400_000) return '#f97316'
  return S.muted
}

function daysOverdue(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr.split('T')[0] + 'T00:00:00')
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000)
}

const toInputDate = (d: Date) => d.toISOString().split('T')[0]
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return toInputDate(d) }

function autoFollowUp(status: string): string | null | undefined {
  if (status === 'email_sent') return addDays(3)
  if (status === 'no_response') return addDays(4)
  if (status === 'opened') return addDays(2)
  if (['responded', 'won', 'lost', 'not_a_fit'].includes(status)) return null
  return undefined // don't change
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0e0d1a', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '10px 14px', color: '#ffffff', fontFamily: 'Satoshi, sans-serif',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
}

const modalCardStyle: React.CSSProperties = {
  background: '#1a1828', border: '1px solid rgba(100,75,255,0.2)',
  borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 560, position: 'relative',
  overflowY: 'auto', maxHeight: '90vh',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AdminNav({ active }: { active: 'audits' | 'pipeline' | 'outreach' }) {
  const pill = (href: string, label: string, key: typeof active) => (
    <a key={key} href={href} style={{
      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
      background: active === key ? 'rgba(255,67,21,0.15)' : 'transparent',
      color: active === key ? S.orange : 'rgba(255,255,255,0.5)',
    }}>{label}</a>
  )
  return (
    <div style={{ background: S.bg2, borderBottom: '1px solid rgba(100,75,255,0.15)', height: 48, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {pill('/audit/admin/dashboard', 'Audits', 'audits')}
      {pill('/audit/admin/pipeline', 'Pipeline', 'pipeline')}
      {pill('/audit/admin/outreach', 'Outreach', 'outreach')}
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type NewForm = { brand_name: string; store_url: string; prospect_name: string; prospect_email: string; niche: string; slug: string }

export default function OutreachClient({ initialRows }: { initialRows: any[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>(initialRows)
  const [notesMap, setNotesMap] = useState<Record<string, string>>(
    Object.fromEntries(initialRows.map(r => [r.id, r.notes ?? '']))
  )
  const [followUpMap, setFollowUpMap] = useState<Record<string, string>>(
    Object.fromEntries(initialRows.map(r => [r.id, toDateInput(r.follow_up_due_at)]))
  )

  // New outreach form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewForm>({ brand_name: '', store_url: '', prospect_name: '', prospect_email: '', niche: '', slug: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Follow-up email modal
  const [followUpModal, setFollowUpModal] = useState<any | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Won / Lost prompt modal
  const [wonLostModal, setWonLostModal] = useState<{ id: string; type: 'won' | 'lost'; prevStatus: string } | null>(null)
  const [wonLostValue, setWonLostValue] = useState('')

  // Keep slug in sync with brand name
  useEffect(() => {
    setForm(prev => ({ ...prev, slug: slugify(prev.brand_name) }))
  }, [form.brand_name])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/audit/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: form.brand_name,
          slug: form.slug,
          store_url: form.store_url.startsWith('http') ? form.store_url : `https://${form.store_url}`,
          prospect_name: form.prospect_name,
          prospect_email: form.prospect_email,
          niche: form.niche,
          cta_link: 'https://kliks.com.au/book',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setCreateError(data.error ?? 'Creation failed.')
        return
      }
      setShowForm(false)
      setForm({ brand_name: '', store_url: '', prospect_name: '', prospect_email: '', niche: '', slug: '' })
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/audit/admin/auth', { method: 'DELETE' })
    window.location.href = '/audit/admin'
  }

  async function handleStatusChange(id: string, newStatus: string) {
    // Intercept won / lost to show prompt before saving
    if (newStatus === 'won' || newStatus === 'lost') {
      const current = rows.find(r => r.id === id)
      setWonLostModal({ id, type: newStatus, prevStatus: current?.status ?? '' })
      setWonLostValue('')
      return
    }
    const suggested = autoFollowUp(newStatus)
    const payload: Record<string, any> = { status: newStatus }
    if (suggested !== undefined) {
      payload.follow_up_due_at = suggested
      setFollowUpMap(prev => ({ ...prev, [id]: suggested ?? '' }))
    }
    await updateRow(id, payload)
  }

  async function handleWonLostSave(skip = false) {
    if (!wonLostModal) return
    const { id, type } = wonLostModal
    const payload: Record<string, any> = { status: type }
    if (!skip && wonLostValue.trim()) {
      if (type === 'won') payload.deal_value = parseFloat(wonLostValue)
      if (type === 'lost') payload.lost_reason = wonLostValue
    }
    // Clear follow-up date for terminal statuses
    const followUpDate = autoFollowUp(type)
    if (followUpDate !== undefined) {
      payload.follow_up_due_at = followUpDate
      setFollowUpMap(prev => ({ ...prev, [id]: followUpDate ?? '' }))
    }
    await updateRow(id, payload)
    setWonLostModal(null)
  }

  function handleCopy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const updateRow = useCallback(async (id: string, payload: Record<string, any>) => {
    const res = await fetch('/api/outreach/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    })
    if (res.ok) {
      const data = await res.json()
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...data.row } : r))
    }
  }, [])

  // ── Stats ────────────────────────────────────────────────────────────────────

  const total = rows.length
  const opened = rows.filter(r => (r.open_count ?? 0) > 0).length
  const responded = rows.filter(r => ['responded', 'call_booked', 'proposal_sent', 'won'].includes(r.status)).length
  const wonRows = rows.filter(r => r.status === 'won')
  const wonCount = wonRows.length
  const revenueWon = wonRows.reduce((sum, r) => sum + (r.deal_value ?? 0), 0)
  const closeRate = total > 0 ? Math.round((wonCount / total) * 100) : 0
  const avgDealSize = wonCount > 0 ? Math.round(revenueWon / wonCount) : null

  // ── Overdue rows (strictly past today, date comparison only) ─────────────────

  const todayStr = new Date().toISOString().split('T')[0]
  const overdueRows = rows.filter(r => {
    if (!r.follow_up_due_at || CLOSED.includes(r.status)) return false
    return r.follow_up_due_at.split('T')[0] < todayStr
  })

  // ── Follow-up email drafts ───────────────────────────────────────────────────

  const draft1Subject = followUpModal ? `re: your ${followUpModal.brand_name} audit` : ''
  const draft1Body = followUpModal
    ? `Hey ${followUpModal.prospect_name},\n\nJust checking this didn't get buried.\n\nPut together a few things worth knowing about ${followUpModal.brand_name}: kliks.com.au/audit/${followUpModal.audit_slug}\nAccess code: ${followUpModal.prospect_email}\n\nWorth a look.\n\nAdam`
    : ''
  const draft2Subject = 'closing this out'
  const draft2Body = followUpModal
    ? `Hey ${followUpModal.prospect_name},\n\nGoing to close out the ${followUpModal.brand_name} audit on my end.\n\nIf the timing wasn't right, no worries at all. Happy to revisit whenever it makes sense.\n\nAdam`
    : ''

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>

      {/* ── Follow-up Email Modal ─────────────────────────────────────────────── */}
      {followUpModal && (
        <div style={modalOverlayStyle} onClick={() => setFollowUpModal(null)}>
          <div style={{ ...modalCardStyle, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, margin: 0 }}>
                Follow-up Emails - {followUpModal.brand_name}
              </h2>
              <button onClick={() => setFollowUpModal(null)}
                style={{ background: 'none', border: 'none', color: S.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
                ×
              </button>
            </div>

            {/* Draft 1 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Follow-up 1</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Subject: {draft1Subject}</div>
              <pre style={{ background: '#0e0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px', fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'Satoshi, sans-serif' }}>
                {draft1Body}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => handleCopy('d1-subject', draft1Subject)}
                  style={{ background: copiedKey === 'd1-subject' ? S.orangeDark : 'rgba(255,67,21,0.12)', border: '1px solid rgba(255,67,21,0.3)', color: S.orange, borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {copiedKey === 'd1-subject' ? 'Copied' : 'Copy Subject'}
                </button>
                <button onClick={() => handleCopy('d1-body', draft1Body)}
                  style={{ background: copiedKey === 'd1-body' ? S.orangeDark : S.orange, border: 'none', color: '#fff', borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {copiedKey === 'd1-body' ? 'Copied' : 'Copy Email'}
                </button>
              </div>
            </div>

            {/* Draft 2 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Breakup</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Subject: {draft2Subject}</div>
              <pre style={{ background: '#0e0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px', fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'Satoshi, sans-serif' }}>
                {draft2Body}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => handleCopy('d2-subject', draft2Subject)}
                  style={{ background: copiedKey === 'd2-subject' ? S.orangeDark : 'rgba(255,67,21,0.12)', border: '1px solid rgba(255,67,21,0.3)', color: S.orange, borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {copiedKey === 'd2-subject' ? 'Copied' : 'Copy Subject'}
                </button>
                <button onClick={() => handleCopy('d2-body', draft2Body)}
                  style={{ background: copiedKey === 'd2-body' ? S.orangeDark : S.orange, border: 'none', color: '#fff', borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {copiedKey === 'd2-body' ? 'Copied' : 'Copy Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Won / Lost Modal ──────────────────────────────────────────────────── */}
      {wonLostModal && (
        <div style={modalOverlayStyle} onClick={() => setWonLostModal(null)}>
          <div style={{ ...modalCardStyle, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: S.white, margin: 0 }}>
                {wonLostModal.type === 'won' ? 'Deal value?' : 'Reason for losing?'}
              </h2>
              <button onClick={() => setWonLostModal(null)}
                style={{ background: 'none', border: 'none', color: S.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
                ×
              </button>
            </div>

            {wonLostModal.type === 'won' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <input
                  type="number"
                  placeholder="e.g. 3500"
                  value={wonLostValue}
                  onChange={e => setWonLostValue(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', flex: 1 }}
                  autoFocus
                />
                <span style={{ color: S.muted, fontSize: 14, whiteSpace: 'nowrap' }}>AUD</span>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <select
                  value={wonLostValue}
                  onChange={e => setWonLostValue(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' } as React.CSSProperties}
                  autoFocus
                >
                  <option value="">Select a reason...</option>
                  {LOST_REASONS.map(r => (
                    <option key={r} value={r} style={{ background: S.bg2 }}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => handleWonLostSave(false)}
                style={{ background: S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => handleWonLostSave(true)}
                style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: '6px 14px', fontSize: 14, cursor: 'pointer' }}>Logout</button>
      </nav>
      <AdminNav active="outreach" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', margin: 0 }}>Outreach</h1>
          <button onClick={() => { setShowForm(v => !v); setCreateError('') }}
            style={{ background: S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            + New Outreach
          </button>
        </div>

        {/* New Outreach form */}
        {showForm && (
          <div style={{ background: S.bg2, border: '1px solid rgba(100,75,255,0.2)', borderRadius: 16, padding: 32, marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, margin: 0 }}>New Outreach</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>BRAND NAME</label>
                  <input required value={form.brand_name} onChange={e => setForm(p => ({ ...p, brand_name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>STORE URL</label>
                  <input required value={form.store_url} onChange={e => setForm(p => ({ ...p, store_url: e.target.value }))} placeholder="https://store.com.au" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>PROSPECT NAME</label>
                  <input required value={form.prospect_name} onChange={e => setForm(p => ({ ...p, prospect_name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>PROSPECT EMAIL</label>
                  <input required type="email" value={form.prospect_email} onChange={e => setForm(p => ({ ...p, prospect_email: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>NICHE</label>
                  <input value={form.niche} onChange={e => setForm(p => ({ ...p, niche: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>SLUG</label>
                  <input required value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              {createError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{createError}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button type="submit" disabled={creating}
                  style={{ background: creating ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Creating...' : 'Create Audit & Track'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Follow-up Due Alert (overdue only, strictly past today) ─────────── */}
        {overdueRows.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 12 }}>Follow-up Overdue</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overdueRows.map(r => {
                const days = daysOverdue(r.follow_up_due_at)
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span
                      onClick={() => document.getElementById(`outreach-row-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      style={{ fontSize: 14, color: S.white, fontWeight: 500, minWidth: 160, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)', textUnderlineOffset: 3 }}
                    >
                      {r.brand_name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: STATUS_BG[r.status] ?? STATUS_BG.audit_created, color: STATUS_COLOR[r.status] ?? S.muted }}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    <span style={{ fontSize: 13, color: '#ef4444' }}>
                      {days === 1 ? '1 day overdue' : `${days} days overdue`}
                    </span>
                    {['audit_created', 'email_sent'].includes(r.status) && (
                      <button
                        onClick={() => updateRow(r.id, { status: 'email_sent' })}
                        style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        Mark Sent
                      </button>
                    )}
                    {['opened', 'no_response'].includes(r.status) && (
                      <button
                        onClick={() => updateRow(r.id, { status: 'no_response', follow_up_due_at: addDays(4) })}
                        style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        Follow Up Sent
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Stats: Revenue row ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <StatTile label="Revenue Won" value={`$${revenueWon.toLocaleString()}`} color="#22c55e" />
          <StatTile label="Close Rate" value={`${closeRate}%`} color={S.purple} />
          <StatTile label="Avg Deal Size" value={avgDealSize !== null ? `$${avgDealSize.toLocaleString()}` : '-'} color={S.orange} />
        </div>

        {/* ── Stats: Activity row ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          <StatTile label="Total Outreach" value={total} color={S.purple} />
          <StatTile label="Opened" value={opened} color={S.orange} />
          <StatTile label="Responded" value={responded} color="#6366f1" />
          <StatTile label="Won" value={wonCount} color="#22c55e" />
        </div>

        {/* ── Table ────────────────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <p style={{ color: S.muted, fontSize: 14 }}>No outreach yet. Create audits from the Pipeline tab to start tracking.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 1200 }}>
              <thead>
                <tr style={{ background: S.bg }}>
                  {['Brand', 'Status', 'Opens', 'Sent', 'Follow-up', 'Notes', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const openCount = row.open_count ?? 0
                  const openColor = openCount >= 3 ? S.orange : S.muted
                  return (
                    <tr key={row.id} id={`outreach-row-${row.id}`} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>

                      {/* Brand */}
                      <td style={{ padding: '12px 14px', minWidth: 160 }}>
                        <div style={{ fontWeight: 600, color: S.white, fontSize: 14 }}>{row.brand_name}</div>
                        {row.prospect_name && <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{row.prospect_name}</div>}
                      </td>

                      {/* Status dropdown */}
                      <td style={{ padding: '12px 14px', minWidth: 150 }}>
                        <select
                          value={row.status}
                          onChange={e => handleStatusChange(row.id, e.target.value)}
                          style={{
                            background: STATUS_BG[row.status] ?? STATUS_BG.audit_created,
                            color: STATUS_COLOR[row.status] ?? S.muted,
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: 'Satoshi, sans-serif',
                          }}
                        >
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val} style={{ background: S.bg2, color: S.white }}>{label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Opens */}
                      <td style={{ padding: '12px 14px', minWidth: 100 }}>
                        <div style={{ color: openColor, fontWeight: openCount >= 3 ? 600 : 400 }}>
                          {openCount > 0 ? `👁 ${openCount}` : '—'}
                        </div>
                        {row.last_opened_at && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {timeAgo(row.last_opened_at)}
                          </div>
                        )}
                      </td>

                      {/* Sent */}
                      <td style={{ padding: '12px 14px', color: S.muted, whiteSpace: 'nowrap' }}>
                        {fmtDate(row.email_sent_at)}
                      </td>

                      {/* Follow-up date */}
                      <td style={{ padding: '12px 14px', minWidth: 140 }}>
                        <input
                          type="date"
                          value={followUpMap[row.id] ?? ''}
                          onChange={e => {
                            setFollowUpMap(prev => ({ ...prev, [row.id]: e.target.value }))
                            updateRow(row.id, { follow_up_due_at: e.target.value || null })
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            color: dueDateColor(row.follow_up_due_at),
                            fontSize: 12,
                            fontFamily: 'Satoshi, sans-serif',
                            outline: 'none',
                            cursor: 'pointer',
                            colorScheme: 'dark',
                          } as React.CSSProperties}
                        />
                      </td>

                      {/* Notes */}
                      <td style={{ padding: '12px 14px', minWidth: 200 }}>
                        <input
                          type="text"
                          value={notesMap[row.id] ?? ''}
                          placeholder="Add a note..."
                          onChange={e => setNotesMap(prev => ({ ...prev, [row.id]: e.target.value }))}
                          onBlur={e => updateRow(row.id, { notes: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 6,
                            padding: '5px 10px',
                            color: S.white,
                            fontSize: 12,
                            fontFamily: 'Satoshi, sans-serif',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {row.audit_slug && (
                            <a
                              href={`/audit/${row.audit_slug}/report`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: S.muted, borderRadius: 6, padding: '4px 10px', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                              View Audit
                            </a>
                          )}
                          {row.audit_slug && (
                            <button
                              onClick={() => setFollowUpModal(row)}
                              style={{ background: 'rgba(255,67,21,0.1)', border: '1px solid rgba(255,67,21,0.25)', color: S.orange, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              Follow-up
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
  )
}
