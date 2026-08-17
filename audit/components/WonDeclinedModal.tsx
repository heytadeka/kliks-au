'use client'
import { DECLINED_REASONS, DECLINED_REASON_LABELS } from '@/lib/outreach-stage'

const S = { bg2: '#1a1828', orange: '#ff4315', white: '#ffffff', muted: 'rgba(255,255,255,0.55)' }

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
}

const modalCardStyle: React.CSSProperties = {
  background: '#1a1828', border: '1px solid rgba(100,75,255,0.2)',
  borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 400, position: 'relative',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0e0d1a', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '10px 14px', color: '#ffffff', fontFamily: 'Satoshi, sans-serif',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

export type WonDeclinedTarget = { type: 'won' | 'declined' }

// Intercepts a dropdown pick of won/declined to prompt for deal value or a
// declined reason before saving, rather than writing the stage change bare -
// originally OutreachClient.tsx's "Won / Lost Modal". Extracted alongside
// ProspectDetailModal so a page reusing that dropdown gets this same prompt,
// not a silently different, cruder write.
export default function WonDeclinedModal({
  target,
  value,
  onValueChange,
  onSave,
  onClose,
}: {
  target: WonDeclinedTarget
  value: string
  onValueChange: (v: string) => void
  onSave: (skip?: boolean) => void
  onClose: () => void
}) {
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: S.white, margin: 0 }}>
            {target.type === 'won' ? 'Deal value?' : 'Reason for declining?'}
          </h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: S.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        {target.type === 'won' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <input
              type="number"
              placeholder="e.g. 3500"
              value={value}
              onChange={e => onValueChange(e.target.value)}
              style={{ ...inputStyle, width: 'auto', flex: 1 }}
              autoFocus
            />
            <span style={{ color: S.muted, fontSize: 14, whiteSpace: 'nowrap' }}>AUD</span>
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <select
              value={value}
              onChange={e => onValueChange(e.target.value)}
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
          <button onClick={() => onSave(false)}
            style={{ background: S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Save
          </button>
          <button onClick={() => onSave(true)}
            style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
