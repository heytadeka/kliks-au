'use client'
import { useState } from 'react'
import { EmailDraft, emailBody, emailSubject } from '@/lib/email-draft'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', orangeDark: '#c42f08', white: '#ffffff', muted: 'rgba(255,255,255,0.55)' }

// Shared render for the cold-email draft, originally Pipeline-only (see
// lib/email-draft.ts). badgeLabel is optional - Pipeline shows "✓ Audit
// Created" since the draft follows creation there; Outreach/Audits generate
// this on demand for an existing prospect, where that badge wouldn't be true.
export default function EmailDraftBox({ draft, badgeLabel, onDone }: { draft: EmailDraft; badgeLabel?: string; onDone: () => void }) {
  const [copied, setCopied] = useState<'email' | 'subject' | null>(null)

  function copyText(kind: 'email' | 'subject', text: string) {
    navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  const subject = emailSubject(draft.platform, draft.brand_name)
  const body = emailBody(draft.platform, draft.brand_name, draft.prospect_name, draft.slug, draft.prospect_email)

  return (
    <div style={{ background: S.bg2, border: '1px solid rgba(100,75,255,0.2)', borderRadius: 16, padding: 32, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, color: S.white, margin: 0 }}>Cold Email Draft</h2>
        {badgeLabel && (
          <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{badgeLabel}</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Subject: {subject}</p>
      <pre style={{ background: S.bg, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, fontFamily: 'monospace', fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', margin: '0 0 20px 0', overflowX: 'auto' }}>
        {body}
      </pre>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => copyText('email', body)}
          style={{ background: S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', minWidth: 120 }}>
          {copied === 'email' ? '✓ Copied' : 'Copy Email'}
        </button>
        <button onClick={() => copyText('subject', subject)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: S.muted, borderRadius: 20, padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: 13, cursor: 'pointer', minWidth: 120 }}>
          {copied === 'subject' ? '✓ Copied' : 'Copy Subject'}
        </button>
        <button onClick={onDone} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 14, cursor: 'pointer', padding: 0 }}>Done</button>
      </div>
    </div>
  )
}
