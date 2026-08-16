'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { STAGE_LABELS, STAGE_BG, STAGE_COLOR, DECLINED_REASONS, DECLINED_REASON_LABELS, autoFollowUpForStage, isViewed, addDays } from '@/lib/outreach-stage'

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

// ─── Stage Rivers board config ─────────────────────────────────────────────────
// STAGE_LABELS/STAGE_BG/STAGE_COLOR/DECLINED_REASONS now live in
// lib/outreach-stage.ts, shared with TodayClient.tsx - see that file for why.

const LANE_ORDER = ['to_contact', 'contacted', 'engaged', 'closed'] as const
type LaneKey = typeof LANE_ORDER[number]

const LANE_LABELS: Record<LaneKey, string> = {
  to_contact: 'To Contact',
  contacted: 'Contacted',
  engaged: 'Engaged',
  closed: 'Closed',
}

// Maps every real outreach_log.stage value to one of the 4 collapsed lanes -
// same 4-lane visual structure as the old 10-status version, just onto the
// new 6-value stage set.
const STAGE_TO_LANE: Record<string, LaneKey> = {
  not_contacted: 'to_contact',
  first_email_sent: 'contacted',
  second_email_sent: 'contacted',
  responded: 'engaged',
  won: 'closed',
  declined: 'closed',
}

const AXIS_TICKS = [0, 7, 14, 21, 28]
const MONO = "'Space Mono', monospace"

function dotBaseStyle(lane: 'to_contact' | 'contacted' | 'engaged', size = 14): React.CSSProperties {
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box' }
  if (lane === 'to_contact') return { ...base, background: 'transparent', border: `2px solid ${S.purple}`, opacity: 0.65 }
  if (lane === 'contacted') return { ...base, background: S.purple, opacity: 0.55 }
  return { ...base, background: S.purple, opacity: 1 }
}

function stalenessGlow(days: number): React.CSSProperties {
  if (days >= 15) return { boxShadow: '0 0 0 4px rgba(255,67,21,0.28), 0 0 14px rgba(255,67,21,0.55)' }
  if (days >= 8) return { boxShadow: '0 0 0 3px rgba(255,67,21,0.18)' }
  if (days >= 4) return { boxShadow: '0 0 0 2px rgba(255,67,21,0.1)' }
  return {}
}

// "Last touch" is outreach_log.updated_at - every write path (status change,
// notes, follow-up date, the prospect's own gate/open ping) sets it in the same
// transaction as whatever else it touches, so it's a strict superset of any more
// specific timestamp column. For prospects with no outreach_log row yet, there's
// been no touch at all, so we fall back to when the prospect/audit was created.
function daysSinceTouch(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-'
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

function AdminNav({ active }: { active: 'today' | 'audits' | 'pipeline' | 'outreach' }) {
  const pill = (href: string, label: string, key: typeof active) => (
    <a key={key} href={href} style={{
      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
      background: active === key ? 'rgba(255,67,21,0.15)' : 'transparent',
      color: active === key ? S.orange : 'rgba(255,255,255,0.5)',
    }}>{label}</a>
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

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type NewForm = { brand_name: string; store_url: string; prospect_name: string; prospect_email: string; niche: string; slug: string; gmb_cid: string }

const helperTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
  marginTop: 6,
  lineHeight: 1.5,
}

// One entry per prospect eligible for the board: either a real outreach_log
// row, or (rare/legacy) a prospect with no row yet, folded into To Contact.
type BoardItem = {
  outreachId: string | null
  prospectId: string
  brand_name: string
  stage: string
  lastTouchIso: string
  slug: string | null
  raw: any
}

const DOT_SIZE = 14
const STACK_GAP = 18 // vertical distance between stacked dot centers - bigger than DOT_SIZE so stacked dots never touch
const BASE_TRACK_HEIGHT = 56

type PlacedDot = { item: BoardItem; days: number; leftPct: number; top: number }

// Beeswarm layout for a non-closed lane: x stays exactly tied to days-since-
// touch (the axis keeps its meaning), but items landing in the same integer
// day - most commonly everything clamped into the 28d+ bucket - stack
// vertically instead of rendering on top of each other. days is already an
// integer (daysSinceTouch floors it), and at realistic track widths two
// *different* day values are already several dot-widths apart, so bucketing
// by exact day is enough to catch real collisions without needing to measure
// actual rendered pixel widths.
function layoutBeeswarm(items: BoardItem[]): { trackHeight: number; placed: PlacedDot[] } {
  const buckets = new Map<number, BoardItem[]>()
  for (const item of items) {
    const bucket = Math.min(daysSinceTouch(item.lastTouchIso), 28)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket)!.push(item)
  }

  const maxBucketSize = buckets.size === 0 ? 1 : Math.max(...Array.from(buckets.values(), b => b.length))
  const stackSpan = (maxBucketSize - 1) * STACK_GAP + DOT_SIZE
  const trackHeight = Math.max(BASE_TRACK_HEIGHT, stackSpan + 20)
  const centerY = trackHeight / 2

  const placed: PlacedDot[] = []
  buckets.forEach((bucketItems, bucket) => {
    const n = bucketItems.length
    const leftPct = Math.min(bucket / 28, 1) * 100
    bucketItems.forEach((item, i) => {
      const offsetIndex = i - (n - 1) / 2
      placed.push({
        item,
        days: daysSinceTouch(item.lastTouchIso),
        leftPct,
        top: centerY - DOT_SIZE / 2 + offsetIndex * STACK_GAP,
      })
    })
  })
  return { trackHeight, placed }
}

export default function OutreachClient({ initialRows, existingProspects }: { initialRows: any[]; existingProspects: any[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>(initialRows)

  // New outreach form state
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'new' | 'existing'>('new')
  const [form, setForm] = useState<NewForm>({ brand_name: '', store_url: '', prospect_name: '', prospect_email: '', niche: '', slug: '', gmb_cid: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Attach-to-existing form state
  const [selectedProspectId, setSelectedProspectId] = useState('')
  const [attaching, setAttaching] = useState(false)
  const [attachError, setAttachError] = useState('')

  // Audits not already being tracked in Outreach (recomputed from live rows
  // state, not just the initial prop, so a freshly-created row is excluded
  // immediately without waiting on a server round trip).
  const trackedProspectIds = new Set(rows.map(r => r.prospect_id))
  const availableProspects = existingProspects.filter(p => !trackedProspectIds.has(p.id))
  const selectedProspect = existingProspects.find(p => p.id === selectedProspectId) ?? null

  function closeForm() {
    setShowForm(false)
    setFormMode('new')
    setSelectedProspectId('')
    setAttachError('')
    setCreateError('')
  }

  // Follow-up email modal
  const [followUpModal, setFollowUpModal] = useState<any | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Won / Declined prompt modal
  const [wonLostModal, setWonLostModal] = useState<{ id: string; type: 'won' | 'declined'; prevStage: string } | null>(null)
  const [wonLostValue, setWonLostValue] = useState('')

  // Prospect detail modal (opened by clicking a dot on the board)
  const [detailProspectId, setDetailProspectId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

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
          gmb_cid: form.gmb_cid || null,
          cta_link: 'https://kliks.com.au/book',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setCreateError(data.error ?? 'Creation failed.')
        return
      }
      closeForm()
      setForm({ brand_name: '', store_url: '', prospect_name: '', prospect_email: '', niche: '', slug: '', gmb_cid: '' })
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  async function handleAttachExisting(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProspectId) return
    setAttaching(true)
    setAttachError('')
    try {
      const res = await fetch('/api/audit/admin/track-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: selectedProspectId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setAttachError(data.error ?? 'Could not start tracking.')
        return
      }
      closeForm()
      router.refresh()
    } finally {
      setAttaching(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/audit/admin/auth', { method: 'DELETE' })
    window.location.href = '/audit/admin'
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

  async function handleStatusChange(id: string, newStage: string) {
    // Intercept won / declined to show prompt before saving
    if (newStage === 'won' || newStage === 'declined') {
      const current = rows.find(r => r.id === id)
      setWonLostModal({ id, type: newStage as 'won' | 'declined', prevStage: current?.stage ?? '' })
      setWonLostValue('')
      return
    }
    const suggested = autoFollowUpForStage(newStage)
    const payload: Record<string, any> = { stage: newStage }
    if (suggested !== undefined) payload.follow_up_due_at = suggested
    await updateRow(id, payload)
  }

  async function handleWonLostSave(skip = false) {
    if (!wonLostModal) return
    const { id, type } = wonLostModal
    const payload: Record<string, any> = { stage: type }
    if (!skip && wonLostValue.trim()) {
      if (type === 'won') payload.deal_value = parseFloat(wonLostValue)
      if (type === 'declined') payload.declined_reason = wonLostValue
    }
    // Clear follow-up date for terminal stages
    const followUpDate = autoFollowUpForStage(type)
    if (followUpDate !== undefined) payload.follow_up_due_at = followUpDate
    await updateRow(id, payload)
    setWonLostModal(null)
  }

  function handleCopy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Creates the outreach_log row on demand for a prospect that doesn't have
  // one yet (rare/legacy To Contact items), reusing track-existing exactly as
  // the "attach to existing audit" form already does. Real rows pass through.
  async function ensureOutreachRow(item: BoardItem): Promise<any> {
    if (item.outreachId) return item.raw
    const res = await fetch('/api/audit/admin/track-existing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id: item.prospectId }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error ?? 'Could not start tracking.')
    setRows(prev => [...prev, data.row])
    router.refresh()
    return data.row
  }

  function openDetail(item: BoardItem) {
    setDetailProspectId(item.prospectId)
    setNotesDraft(item.raw?.notes ?? '')
  }

  async function handleDetailStatusChange(item: BoardItem, newStatus: string) {
    try {
      const row = await ensureOutreachRow(item)
      await handleStatusChange(row.id, newStatus)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleDetailFollowUpSent(item: BoardItem) {
    try {
      const row = await ensureOutreachRow(item)
      await updateRow(row.id, { stage: 'second_email_sent', follow_up_due_at: addDays(4) })
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleDetailNotesBlur(item: BoardItem) {
    try {
      const row = await ensureOutreachRow(item)
      await updateRow(row.id, { notes: notesDraft })
    } catch (e: any) {
      alert(e.message)
    }
  }

  function openFollowUpDraft(item: BoardItem) {
    setFollowUpModal({
      brand_name: item.brand_name,
      prospect_name: item.raw?.prospect_name ?? '',
      prospect_email: item.raw?.prospect_email ?? '',
      audit_slug: item.slug,
    })
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  const total = rows.length
  const opened = rows.filter(r => isViewed(r)).length
  const responded = rows.filter(r => ['responded', 'won'].includes(r.stage)).length
  const wonRows = rows.filter(r => r.stage === 'won')
  const wonCount = wonRows.length
  const revenueWon = wonRows.reduce((sum, r) => sum + (r.deal_value ?? 0), 0)
  const closeRate = total > 0 ? Math.round((wonCount / total) * 100) : 0
  const avgDealSize = wonCount > 0 ? Math.round(revenueWon / wonCount) : null

  // ── Board items, grouped into lanes ───────────────────────────────────────────

  const boardItems: BoardItem[] = [
    ...rows.map(r => ({
      outreachId: r.id as string, prospectId: r.prospect_id as string, brand_name: r.brand_name,
      stage: r.stage, lastTouchIso: r.updated_at, slug: r.audit_slug ?? null, raw: r,
    })),
    ...availableProspects.map(p => ({
      outreachId: null, prospectId: p.id as string, brand_name: p.brand_name,
      stage: 'not_contacted', lastTouchIso: p.created_at, slug: p.slug ?? null, raw: p,
    })),
  ]

  const laneItems: Record<LaneKey, BoardItem[]> = { to_contact: [], contacted: [], engaged: [], closed: [] }
  for (const item of boardItems) {
    const lane = STAGE_TO_LANE[item.stage] ?? 'to_contact'
    laneItems[lane].push(item)
  }

  const detailItem: BoardItem | null = detailProspectId
    ? boardItems.find(b => b.prospectId === detailProspectId) ?? null
    : null

  // ── Follow-up email drafts ───────────────────────────────────────────────────

  const draft1Subject = followUpModal ? `re: your ${followUpModal.brand_name} audit` : ''
  const draft1Body = followUpModal
    ? `Hey ${followUpModal.prospect_name || 'there'},\n\nJust checking this didn't get buried.\n\nPut together a few things worth knowing about ${followUpModal.brand_name}: kliks.com.au/audit/${followUpModal.audit_slug}\nAccess code: ${followUpModal.prospect_email}\n\nWorth a look.\n\nAdam`
    : ''
  const draft2Subject = 'closing this out'
  const draft2Body = followUpModal
    ? `Hey ${followUpModal.prospect_name || 'there'},\n\nGoing to close out the ${followUpModal.brand_name} audit on my end.\n\nIf the timing wasn't right, no worries at all. Happy to revisit whenever it makes sense.\n\nAdam`
    : ''

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>

      {/* ── Prospect Detail Modal ─────────────────────────────────────────────── */}
      {detailItem && (
        <div style={modalOverlayStyle} onClick={() => setDetailProspectId(null)}>
          <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, margin: 0 }}>{detailItem.brand_name}</h2>
                {detailItem.raw?.prospect_name && <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{detailItem.raw.prospect_name}</div>}
              </div>
              <button onClick={() => setDetailProspectId(null)}
                style={{ background: 'none', border: 'none', color: S.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
                ×
              </button>
            </div>

            {/* Status dropdown */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', fontFamily: MONO, textTransform: 'uppercase' as const }}>Status</label>
              <select
                value={detailItem.stage}
                onChange={e => handleDetailStatusChange(detailItem, e.target.value)}
                style={{
                  background: STAGE_BG[detailItem.stage] ?? STAGE_BG.not_contacted,
                  color: STAGE_COLOR[detailItem.stage] ?? S.muted,
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'Satoshi, sans-serif',
                }}
              >
                {Object.entries(STAGE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} style={{ background: S.bg2, color: S.white }}>{label}</option>
                ))}
              </select>
            </div>

            {/* Read-only context */}
            {detailItem.outreachId ? (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: S.muted, marginBottom: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <span>Sent: {fmtDate(detailItem.raw.email_sent_at)}</span>
                <span>Opens: {detailItem.raw.open_count ?? 0}{detailItem.raw.last_opened_at ? ` (${timeAgo(detailItem.raw.last_opened_at)})` : ''}</span>
                {detailItem.raw.follow_up_due_at && <span>Next follow-up: {fmtDate(detailItem.raw.follow_up_due_at)}</span>}
                {detailItem.raw.deal_value != null && <span>Deal value: ${Number(detailItem.raw.deal_value).toLocaleString()}</span>}
                {detailItem.raw.declined_reason && <span>Reason: {DECLINED_REASON_LABELS[detailItem.raw.declined_reason] ?? detailItem.raw.declined_reason}</span>}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Not tracked yet - any action below starts tracking.</p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {['not_contacted', 'first_email_sent'].includes(detailItem.stage) && (
                <button onClick={() => handleDetailStatusChange(detailItem, 'first_email_sent')}
                  style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  Mark Sent
                </button>
              )}
              {detailItem.stage === 'first_email_sent' && (
                <button onClick={() => handleDetailFollowUpSent(detailItem)}
                  style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  Follow Up Sent
                </button>
              )}
              {detailItem.slug && (
                <a href={`/audit/${detailItem.slug}/report`} target="_blank" rel="noreferrer"
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: S.muted, borderRadius: 6, padding: '6px 14px', fontSize: 13, textDecoration: 'none' }}>
                  View Audit
                </a>
              )}
              {detailItem.slug && (
                <button onClick={() => openFollowUpDraft(detailItem)}
                  style={{ background: 'rgba(255,67,21,0.1)', border: '1px solid rgba(255,67,21,0.25)', color: S.orange, borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  Follow-up Email
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', fontFamily: MONO, textTransform: 'uppercase' as const }}>Notes</label>
              <input
                type="text"
                value={notesDraft}
                placeholder="Add a note..."
                onChange={e => setNotesDraft(e.target.value)}
                onBlur={() => handleDetailNotesBlur(detailItem)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '8px 12px', color: S.white, fontSize: 13,
                  fontFamily: 'Satoshi, sans-serif', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      )}

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
                {wonLostModal.type === 'won' ? 'Deal value?' : 'Reason for declining?'}
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
                  {DECLINED_REASONS.map(r => (
                    <option key={r} value={r} style={{ background: S.bg2 }}>{DECLINED_REASON_LABELS[r]}</option>
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
          <button onClick={() => { setShowForm(v => !v); setCreateError(''); setAttachError('') }}
            style={{ background: S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            + New Outreach
          </button>
        </div>

        {/* New Outreach form */}
        {showForm && (
          <div style={{ background: S.bg2, border: '1px solid rgba(100,75,255,0.2)', borderRadius: 16, padding: 32, marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, margin: 0 }}>New Outreach</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button type="button" onClick={() => setFormMode('new')}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: formMode === 'new' ? 'rgba(255,67,21,0.15)' : 'rgba(255,255,255,0.05)', color: formMode === 'new' ? S.orange : S.muted }}>
                Create new audit
              </button>
              <button type="button" onClick={() => setFormMode('existing')}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: formMode === 'existing' ? 'rgba(255,67,21,0.15)' : 'rgba(255,255,255,0.05)', color: formMode === 'existing' ? S.orange : S.muted }}>
                Attach to existing audit
              </button>
            </div>

            {formMode === 'existing' ? (
              <form onSubmit={handleAttachExisting}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>EXISTING AUDIT</label>
                  <select required value={selectedProspectId} onChange={e => setSelectedProspectId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' } as React.CSSProperties}>
                    <option value="">Select an audit...</option>
                    {availableProspects.map(p => (
                      <option key={p.id} value={p.id} style={{ background: S.bg2 }}>{p.brand_name} ({p.slug})</option>
                    ))}
                  </select>
                  <p style={helperTextStyle}>
                    {availableProspects.length === 0
                      ? 'Every existing audit already has outreach tracking running.'
                      : 'Pick an audit that already exists. This starts tracking for it, no duplicate audit gets created and no data gets re-pulled.'}
                  </p>
                </div>

                {selectedProspect && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <div><span style={{ fontSize: 11, color: S.muted }}>Store URL</span><div style={{ fontSize: 13, color: S.white }}>{selectedProspect.store_url}</div></div>
                    <div><span style={{ fontSize: 11, color: S.muted }}>Prospect</span><div style={{ fontSize: 13, color: S.white }}>{selectedProspect.prospect_name || '-'}</div></div>
                    <div><span style={{ fontSize: 11, color: S.muted }}>Email</span><div style={{ fontSize: 13, color: S.white }}>{selectedProspect.prospect_email}</div></div>
                    <div><span style={{ fontSize: 11, color: S.muted }}>Niche</span><div style={{ fontSize: 13, color: S.white }}>{selectedProspect.niche || '-'}</div></div>
                  </div>
                )}

                {attachError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{attachError}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button type="submit" disabled={attaching || !selectedProspectId}
                    style={{ background: attaching ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: (attaching || !selectedProspectId) ? 'not-allowed' : 'pointer', opacity: (attaching || !selectedProspectId) ? 0.7 : 1 }}>
                    {attaching ? 'Starting...' : 'Start Tracking'}
                  </button>
                  <button type="button" onClick={closeForm} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            ) : (
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
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>GOOGLE PLACE ID (OPTIONAL)</label>
                    <input value={form.gmb_cid} onChange={e => setForm(p => ({ ...p, gmb_cid: e.target.value }))} placeholder="ChI..." style={inputStyle} />
                    <p style={helperTextStyle}>Paste the Place ID from Google if you have it. Leave blank to auto-detect by name.</p>
                  </div>
                </div>
                {createError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{createError}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button type="submit" disabled={creating}
                    style={{ background: creating ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                    {creating ? 'Creating...' : 'Create Audit & Track'}
                  </button>
                  <button type="button" onClick={closeForm} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}
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

        {/* ── Stage Rivers board ───────────────────────────────────────────────── */}
        <div style={{ background: S.bg2, borderRadius: 12, padding: '28px 32px 20px' }}>
          {LANE_ORDER.map((laneKey, idx) => {
            const items = laneItems[laneKey]
            const isClosed = laneKey === 'closed'
            const { trackHeight, placed } = isClosed ? { trackHeight: 0, placed: [] as PlacedDot[] } : layoutBeeswarm(items)
            return (
              <div key={laneKey} style={{ marginBottom: idx === LANE_ORDER.length - 1 ? 0 : 20 }}>
                {/* Lane header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.8)' }}>{LANE_LABELS[laneKey]}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{items.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {isClosed ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 4px 22px', alignItems: 'center' }}>
                    {items.map(item => {
                      const isWon = item.stage === 'won'
                      const outcomeLabel = isWon ? 'won' : 'declined'
                      return (
                        <div
                          key={item.prospectId}
                          title={`${item.brand_name} — ${outcomeLabel}`}
                          onClick={() => openDetail(item)}
                          style={isWon
                            ? { width: 12, height: 12, borderRadius: '50%', background: S.purple, opacity: 1, cursor: 'pointer', flexShrink: 0 }
                            : { width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', cursor: 'pointer', flexShrink: 0 }
                          }
                        />
                      )
                    })}
                    <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
                      {items.filter(i => i.stage === 'won').length} won · {items.filter(i => i.stage === 'declined').length} declined
                    </span>
                  </div>
                ) : (
                  <div style={{ position: 'relative', height: trackHeight, background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 22 }}>
                    {AXIS_TICKS.map((d, i) => (
                      <div key={d}>
                        <div style={{ position: 'absolute', left: `${(d / 28) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.05)' }} />
                        <div style={{
                          position: 'absolute', left: `${(d / 28) * 100}%`, bottom: 4,
                          transform: i === AXIS_TICKS.length - 1 ? 'translateX(-100%)' : 'translateX(0)',
                          fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.25)',
                        }}>
                          {i === AXIS_TICKS.length - 1 ? '28d+' : `${d}d`}
                        </div>
                      </div>
                    ))}
                    {placed.map(({ item, days, leftPct, top }) => (
                      <div
                        key={item.prospectId}
                        title={`${item.brand_name} — ${days}d since last touch`}
                        onClick={() => openDetail(item)}
                        style={{
                          position: 'absolute', left: `calc(${leftPct}% - 7px)`, top, cursor: 'pointer',
                          ...dotBaseStyle(laneKey as 'to_contact' | 'contacted' | 'engaged', 14),
                          ...stalenessGlow(days),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
