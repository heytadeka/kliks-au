'use client'
import { STAGE_LABELS, STAGE_BG, STAGE_COLOR, DECLINED_REASON_LABELS } from '@/lib/outreach-stage'

const S = { bg2: '#1a1828', orange: '#ff4315', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', purple: '#644bff' }
const MONO = "'Space Mono', monospace"

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
}

const modalCardStyle: React.CSSProperties = {
  background: '#1a1828', border: '1px solid rgba(100,75,255,0.2)',
  borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 560, position: 'relative',
  overflowY: 'auto', maxHeight: '90vh',
}

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

// One entry per prospect eligible for this panel: either a real outreach_log
// row (outreachId set, raw = that row), or a prospect with no row yet
// (outreachId null, raw = the prospects row - untracked, "any action below
// starts tracking").
export type DetailItem = {
  outreachId: string | null
  prospectId: string
  brand_name: string
  stage: string
  slug: string | null
  raw: any
}

// The prospect-level detail panel - originally OutreachClient.tsx's "Prospect
// Detail Modal" (opened by clicking a board dot), extracted here so the
// Audits table's row-click panel reuses the exact same stage dropdown,
// contact history, and quick actions instead of a second, independently
// rebuilt copy. onOpenFollowUpDraft/onGenerateEmail are both optional so
// each caller opts into only the actions relevant to it - Outreach keeps its
// existing chase-email draft, Audits gets the new general reach-out CTA.
export default function ProspectDetailModal({
  item,
  onClose,
  onStageChange,
  onFollowUpSent,
  notesDraft,
  onNotesChange,
  onNotesBlur,
  onOpenFollowUpDraft,
  onGenerateEmail,
}: {
  item: DetailItem
  onClose: () => void
  onStageChange: (item: DetailItem, newStage: string) => void
  onFollowUpSent: (item: DetailItem) => void
  notesDraft: string
  onNotesChange: (value: string) => void
  onNotesBlur: (item: DetailItem) => void
  onOpenFollowUpDraft?: (item: DetailItem) => void
  onGenerateEmail?: (item: DetailItem) => void
}) {
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, margin: 0 }}>{item.brand_name}</h2>
            {item.raw?.prospect_name && <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{item.raw.prospect_name}</div>}
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: S.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        {/* Stage dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', fontFamily: MONO, textTransform: 'uppercase' as const }}>Stage</label>
          <select
            value={item.stage}
            onChange={e => onStageChange(item, e.target.value)}
            style={{
              background: STAGE_BG[item.stage] ?? STAGE_BG.not_contacted,
              color: STAGE_COLOR[item.stage] ?? S.muted,
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'Satoshi, sans-serif',
            }}
          >
            {Object.entries(STAGE_LABELS).map(([val, label]) => (
              <option key={val} value={val} style={{ background: S.bg2, color: S.white }}>{label}</option>
            ))}
          </select>
        </div>

        {/* Read-only contact history */}
        {item.outreachId ? (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: S.muted, marginBottom: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <span>Sent: {fmtDate(item.raw.email_sent_at)}</span>
            <span>Opens: {item.raw.open_count ?? 0}{item.raw.last_opened_at ? ` (${timeAgo(item.raw.last_opened_at)})` : ''}</span>
            {item.raw.follow_up_due_at && <span>Next follow-up: {fmtDate(item.raw.follow_up_due_at)}</span>}
            {item.raw.deal_value != null && <span>Deal value: ${Number(item.raw.deal_value).toLocaleString()}</span>}
            {item.raw.declined_reason && <span>Reason: {DECLINED_REASON_LABELS[item.raw.declined_reason] ?? item.raw.declined_reason}</span>}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Not tracked yet - any action below starts tracking.</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {['not_contacted', 'first_email_sent'].includes(item.stage) && (
            <button onClick={() => onStageChange(item, 'first_email_sent')}
              style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Mark Sent
            </button>
          )}
          {item.stage === 'first_email_sent' && (
            <button onClick={() => onFollowUpSent(item)}
              style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Follow Up Sent
            </button>
          )}
          {item.slug && (
            <a href={`/audit/${item.slug}/report`} target="_blank" rel="noreferrer"
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: S.muted, borderRadius: 6, padding: '6px 14px', fontSize: 13, textDecoration: 'none' }}>
              View Audit
            </a>
          )}
          {item.slug && onOpenFollowUpDraft && (
            <button onClick={() => onOpenFollowUpDraft(item)}
              style={{ background: 'rgba(255,67,21,0.1)', border: '1px solid rgba(255,67,21,0.25)', color: S.orange, borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Follow-up Email
            </button>
          )}
          {item.slug && onGenerateEmail && (
            <button onClick={() => onGenerateEmail(item)}
              style={{ background: 'rgba(100,75,255,0.15)', border: 'none', color: S.purple, borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Generate reach-out email
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
            onChange={e => onNotesChange(e.target.value)}
            onBlur={() => onNotesBlur(item)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, padding: '8px 12px', color: S.white, fontSize: 13,
              fontFamily: 'Satoshi, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  )
}
