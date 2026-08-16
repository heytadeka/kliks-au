'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { STAGE_LABELS, STAGE_BG, STAGE_COLOR, addDays } from '@/lib/outreach-stage'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', orangeDark: '#c42f08', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', border: 'rgba(100,75,255,0.12)', purple: '#644bff' }

function daysOverdue(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr.split('T')[0] + 'T00:00:00')
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000)
}

type ReadyItem = {
  id: string
  slug: string
  brand_name: string
  niche: string | null
  hook: { line1: string; line2: string; subtext?: string } | null
  commentaryPending: boolean
  outreachId: string | null
}

export default function TodayClient({ sentToday, readyToReachOut, followUpsDue }: { sentToday: number; readyToReachOut: ReadyItem[]; followUpsDue: any[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleLogout() {
    await fetch('/api/audit/admin/auth', { method: 'DELETE' })
    window.location.href = '/audit/admin'
  }

  // Reuses track-existing (to get/create the outreach_log row) then the same
  // status transition the Outreach tab's own Mark Sent button performs.
  async function markSentFromReady(item: ReadyItem) {
    setBusyId(item.id)
    try {
      let outreachId = item.outreachId
      if (!outreachId) {
        const res = await fetch('/api/audit/admin/track-existing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_id: item.id }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) { alert(data.error ?? 'Could not start tracking.'); return }
        outreachId = data.id
      }
      await fetch('/api/outreach/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: outreachId, stage: 'first_email_sent', follow_up_due_at: addDays(3) }),
      })
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function updateOutreach(id: string, payload: Record<string, any>) {
    setBusyId(id)
    try {
      await fetch('/api/outreach/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  // Recovery path for a prospect whose commentary never generated (the
  // readiness-timeout case). Fires commentary directly when the underlying
  // scan data is already there - fast, no DataForSEO/PageSpeed re-fetch. If
  // the server finds the data genuinely isn't ready yet, it says so instead
  // of silently falling back to a full rescan.
  async function regenerateCommentary(item: ReadyItem) {
    setBusyId(item.id)
    try {
      const res = await fetch('/api/audit/admin/regenerate-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: item.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.error ?? 'Could not regenerate commentary.')
        return
      }
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/audit/admin/team" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Team</Link>
          <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: '6px 14px', fontSize: 14, cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ background: '#1a1828', borderBottom: '1px solid rgba(100,75,255,0.15)', height: 48, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href="/audit/admin/today" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,67,21,0.15)', color: S.orange }}>Today</a>
        <a href="/audit/admin/dashboard" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>Audits</a>
        <a href="/audit/admin/pipeline" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>Pipeline</a>
        <a href="/audit/admin/outreach" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>Outreach</a>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', marginBottom: 8 }}>Today</h1>
        <p style={{ color: S.muted, fontSize: 14, marginBottom: 32 }}>What to do right now.</p>

        {/* Section 1: Daily-3 */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700 }}>{sentToday} / 3</div>
            <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>Sent today</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < sentToday ? '#22c55e' : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>
        </div>

        {/* Section 2: Ready to reach out */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Ready to reach out</h2>
          {readyToReachOut.length === 0 ? (
            <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
              <p style={{ color: S.muted, fontSize: 14, marginBottom: 20 }}>Nothing waiting. Every audit has been sent.</p>
              <Link href="/audit/admin/new" style={{ background: S.orange, color: '#fff', borderRadius: 100, padding: '12px 28px', textDecoration: 'none', fontWeight: 600, fontSize: 15, display: 'inline-block' }}>+ New Audit</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {readyToReachOut.map(item => (
                <div key={item.id} style={{ background: S.bg2, border: item.commentaryPending ? '1px solid rgba(255,67,21,0.4)' : `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 600 }}>{item.brand_name}</div>
                        {item.commentaryPending && (
                          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: S.orange, background: 'rgba(255,67,21,0.15)', border: '1px solid rgba(255,67,21,0.35)', borderRadius: 99, padding: '2px 8px' }}>
                            AI Commentary Pending
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: S.muted, marginTop: 2 }}>{item.niche || '-'}</div>
                      {item.commentaryPending ? (
                        <div style={{ marginTop: 12, fontSize: 12, color: S.orange, background: 'rgba(255,67,21,0.08)', border: '1px solid rgba(255,67,21,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                          This audit&apos;s AI commentary never generated. Sending it now would send an incomplete report - regenerate first.
                        </div>
                      ) : item.hook ? (
                        <div style={{ marginTop: 12, background: S.bg, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 13, color: S.white, fontWeight: 500 }}>{item.hook.line1}</div>
                          <div style={{ fontSize: 13, color: S.orange, fontWeight: 500 }}>{item.hook.line2}</div>
                          {item.hook.subtext && <div style={{ fontSize: 12, color: S.muted, marginTop: 6 }}>{item.hook.subtext}</div>}
                        </div>
                      ) : (
                        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No hook generated yet</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                      <a href={`https://kliks.com.au/audit/${item.slug}`} target="_blank" rel="noreferrer" style={{ color: S.orange, fontSize: 13, textDecoration: 'none' }}>View Audit</a>
                      {item.commentaryPending && (
                        <button
                          disabled={busyId === item.id}
                          onClick={() => regenerateCommentary(item)}
                          style={{ background: S.orange, border: 'none', color: '#fff', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: busyId === item.id ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: busyId === item.id ? 0.6 : 1 }}>
                          {busyId === item.id ? 'Regenerating...' : 'Regenerate Commentary'}
                        </button>
                      )}
                      <button
                        disabled={busyId === item.id}
                        onClick={() => markSentFromReady(item)}
                        style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: busyId === item.id ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: busyId === item.id ? 0.6 : 1 }}>
                        {busyId === item.id ? 'Sending...' : 'Mark Sent'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Follow-ups due */}
        <div>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Follow-ups due</h2>
          {followUpsDue.length === 0 ? (
            <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
              <p style={{ color: S.muted, fontSize: 14 }}>Nothing overdue.</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {followUpsDue.map((r: any) => {
                  const days = daysOverdue(r.follow_up_due_at)
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, color: S.white, fontWeight: 500, minWidth: 160 }}>{r.brand_name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: STAGE_BG[r.stage] ?? STAGE_BG.not_contacted, color: STAGE_COLOR[r.stage] ?? S.muted }}>
                        {STAGE_LABELS[r.stage] ?? r.stage}
                      </span>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>{days === 1 ? '1 day overdue' : `${days} days overdue`}</span>
                      {['not_contacted', 'first_email_sent'].includes(r.stage) && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => updateOutreach(r.id, { stage: 'first_email_sent', follow_up_due_at: addDays(3) })}
                          style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          Mark Sent
                        </button>
                      )}
                      {r.stage === 'first_email_sent' && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => updateOutreach(r.id, { stage: 'second_email_sent', follow_up_due_at: addDays(4) })}
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
        </div>
      </div>
    </div>
  )
}
