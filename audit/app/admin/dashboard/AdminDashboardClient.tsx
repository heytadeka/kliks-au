'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STAGE_LABELS, STAGE_BG, STAGE_COLOR, autoFollowUpForStage, isViewed, addDays } from '@/lib/outreach-stage'
import { getAuditStatus, AUDIT_STATUS_LABELS, AUDIT_STATUS_COLOR } from '@/lib/audit-status'
import ProspectDetailModal, { DetailItem } from '@/components/ProspectDetailModal'
import WonDeclinedModal, { WonDeclinedTarget } from '@/components/WonDeclinedModal'
import EmailDraftBox from '@/components/EmailDraftBox'
import { EmailDraft } from '@/lib/email-draft'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', border: 'rgba(100,75,255,0.12)', purple: '#644bff' }

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function fmtDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString('en-AU') : 'Never'
}

// This table is what Today's ready-to-reach-out list and Outreach's kanban
// both filter/read from - see lib/outreach-stage.ts and lib/audit-status.ts.
// A prospect's stage lives on its outreach_log row (raw = that row) if one
// exists yet, or defaults to not_contacted (raw = the prospect itself,
// mirroring OutreachClient.tsx's untracked-item convention) if outreach
// tracking hasn't started for it.
function toDetailItem(p: any): DetailItem {
  return {
    outreachId: p.outreach?.id ?? null,
    prospectId: p.id,
    brand_name: p.brand_name,
    stage: p.outreach?.stage ?? 'not_contacted',
    slug: p.slug ?? null,
    raw: p.outreach ?? p,
  }
}

export default function AdminDashboardClient({ prospects, stats }: { prospects: any[]; stats: any }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<any[]>(prospects)

  const [detailProspectId, setDetailProspectId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [wonLostModal, setWonLostModal] = useState<(WonDeclinedTarget & { outreachId: string }) | null>(null)
  const [wonLostValue, setWonLostValue] = useState('')
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null)

  const filtered = rows.filter(p =>
    p.brand_name.toLowerCase().includes(search.toLowerCase()) ||
    p.prospect_email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleLogout() {
    await fetch('/api/audit/admin/auth', { method: 'DELETE' })
    window.location.href = '/audit/admin'
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/audit/admin/prospect', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    router.refresh()
  }

  async function resetViews(id: string, brandName: string) {
    if (!confirm(`Reset view count for ${brandName} to zero?`)) return
    const res = await fetch('/api/audit/admin/prospect', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, access_count: 0, last_accessed_at: null }),
    })
    if (!res.ok) { alert('Reset failed, try again.'); return }
    router.refresh()
  }

  // Creates the outreach_log row on demand for a prospect that doesn't have
  // one yet - same track-existing call OutreachClient.tsx already uses for
  // its own "rare/legacy" untracked items. On this table it'll be the common
  // case rather than the rare one, since most audits won't have been opened
  // in Outreach yet.
  const ensureOutreachRow = useCallback(async (item: DetailItem): Promise<any> => {
    if (item.outreachId) return item.raw
    const res = await fetch('/api/audit/admin/track-existing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id: item.prospectId }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error ?? 'Could not start tracking.')
    setRows(prev => prev.map(p => p.id === item.prospectId ? { ...p, outreach: data.row } : p))
    return data.row
  }, [])

  const updateOutreachRow = useCallback(async (outreachId: string, prospectId: string, payload: Record<string, any>) => {
    const res = await fetch('/api/outreach/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: outreachId, ...payload }),
    })
    if (res.ok) {
      const data = await res.json()
      setRows(prev => prev.map(p => p.id === prospectId ? { ...p, outreach: { ...p.outreach, ...data.row } } : p))
    }
  }, [])

  function openDetail(item: DetailItem) {
    setDetailProspectId(item.prospectId)
    setNotesDraft(item.raw?.notes ?? '')
  }

  async function handleStageChange(item: DetailItem, newStage: string) {
    try {
      const row = await ensureOutreachRow(item)
      if (newStage === 'won' || newStage === 'declined') {
        setWonLostModal({ outreachId: row.id, type: newStage })
        setWonLostValue('')
        return
      }
      const suggested = autoFollowUpForStage(newStage)
      const payload: Record<string, any> = { stage: newStage }
      if (suggested !== undefined) payload.follow_up_due_at = suggested
      await updateOutreachRow(row.id, item.prospectId, payload)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleWonLostSave(skip = false) {
    if (!wonLostModal || !detailItem) return
    const { outreachId, type } = wonLostModal
    const payload: Record<string, any> = { stage: type }
    if (!skip && wonLostValue.trim()) {
      if (type === 'won') payload.deal_value = parseFloat(wonLostValue)
      if (type === 'declined') payload.declined_reason = wonLostValue
    }
    const followUpDate = autoFollowUpForStage(type)
    if (followUpDate !== undefined) payload.follow_up_due_at = followUpDate
    await updateOutreachRow(outreachId, detailItem.prospectId, payload)
    setWonLostModal(null)
  }

  async function handleFollowUpSent(item: DetailItem) {
    try {
      const row = await ensureOutreachRow(item)
      await updateOutreachRow(row.id, item.prospectId, { stage: 'second_email_sent', follow_up_due_at: addDays(4) })
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleNotesBlur(item: DetailItem) {
    try {
      const row = await ensureOutreachRow(item)
      await updateOutreachRow(row.id, item.prospectId, { notes: notesDraft })
    } catch (e: any) {
      alert(e.message)
    }
  }

  // Neither outreach_log nor prospects tracks which platform a store runs on
  // (Pipeline/monitored_domains-only) - shopify is Kliks' primary business,
  // used as the default here since there's no real signal to pick the
  // squarespace copy from.
  function handleGenerateEmail(item: DetailItem) {
    setEmailDraft({
      platform: 'shopify',
      brand_name: item.brand_name,
      prospect_name: item.raw?.prospect_name ?? '',
      prospect_email: item.raw?.prospect_email ?? null,
      slug: item.slug ?? '',
    })
  }

  const detailProspect = detailProspectId ? rows.find(p => p.id === detailProspectId) ?? null : null
  const detailItem = detailProspect ? toDetailItem(detailProspect) : null

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      {detailItem && (
        <ProspectDetailModal
          item={detailItem}
          onClose={() => setDetailProspectId(null)}
          onStageChange={handleStageChange}
          onFollowUpSent={handleFollowUpSent}
          notesDraft={notesDraft}
          onNotesChange={setNotesDraft}
          onNotesBlur={handleNotesBlur}
          onGenerateEmail={handleGenerateEmail}
        />
      )}

      {wonLostModal && (
        <WonDeclinedModal
          target={wonLostModal}
          value={wonLostValue}
          onValueChange={setWonLostValue}
          onSave={handleWonLostSave}
          onClose={() => setWonLostModal(null)}
        />
      )}

      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/audit/admin/team" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Team</Link>
          <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: '6px 14px', fontSize: 14, cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      {/* Section nav */}
      <div style={{ background: '#1a1828', borderBottom: '1px solid rgba(100,75,255,0.15)', height: 48, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href="/audit/admin/today" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>Today</a>
        <a href="/audit/admin/dashboard" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,67,21,0.15)', color: S.orange }}>Audits</a>
        <a href="/audit/admin/pipeline" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>Pipeline</a>
        <a href="/audit/admin/outreach" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>Outreach</a>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em' }}>Audits</h1>
          <Link href="/audit/admin/new" style={{ background: S.orange, color: '#fff', borderRadius: 100, padding: '12px 28px', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>+ New Audit</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          <StatCard label="Total Audits" value={stats.total} />
          <StatCard label="Viewed This Week" value={stats.viewedThisWeek} />
          <StatCard label="Total Views" value={stats.totalViews} />
          <StatCard label="Crawls Complete" value={stats.crawlComplete} />
        </div>

        <input
          placeholder="Search by brand or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 12, padding: '12px 16px', color: S.white, fontFamily: 'Satoshi, sans-serif', fontSize: 14, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }}
        />

        {emailDraft && <EmailDraftBox draft={emailDraft} onDone={() => setEmailDraft(null)} />}

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
            <thead>
              <tr style={{ background: S.bg }}>
                {['Brand', 'Audit Status', 'Contact Stage', 'Created', 'Last Contacted', 'Views', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const auditStatus = getAuditStatus(p.audit_data_cache, p.rescan_locked_at)
                const stage = p.outreach?.stage ?? 'not_contacted'
                const viewed = isViewed(p.outreach)
                return (
                  <tr key={p.id} onClick={() => openDetail(toDetailItem(p))}
                    style={{ background: i % 2 === 0 ? S.bg2 : S.bg, cursor: 'pointer' }}>
                    <td style={{ padding: '12px 14px', color: S.white, fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.brand_name}
                        {p.application_data && (
                          <span title="Submitted via the Growth Audit application form" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: S.purple, background: 'rgba(100,75,255,0.15)', borderRadius: 99, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                            FORM REQUEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: AUDIT_STATUS_COLOR[auditStatus] }}>{AUDIT_STATUS_LABELS[auditStatus]}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: STAGE_BG[stage] ?? STAGE_BG.not_contacted, color: STAGE_COLOR[stage] ?? S.muted }}>
                          {STAGE_LABELS[stage] ?? stage}
                        </span>
                        {viewed && (
                          <span title="Report has been viewed" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#22c55e', background: 'rgba(34,197,94,0.12)', borderRadius: 99, padding: '2px 6px' }}>
                            VIEWED
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{new Date(p.created_at).toLocaleDateString('en-AU')}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{fmtDate(p.outreach?.updated_at)}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{p.access_count}</td>
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Link href={`/audit/admin/${p.slug}/edit`} style={{ color: S.purple, fontSize: 13, textDecoration: 'none' }}>Edit</Link>
                        <a href={`https://kliks.com.au/audit/${p.slug}`} target="_blank" rel="noreferrer" style={{ color: S.orange, fontSize: 13, textDecoration: 'none' }}>View</a>
                        <button onClick={() => toggleActive(p.id, p.is_active)} style={{ background: p.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: p.is_active ? '#22c55e' : '#ef4444', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => resetViews(p.id, p.brand_name)} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 13, textDecoration: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Reset views</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const auditStatus = getAuditStatus(p.audit_data_cache, p.rescan_locked_at)
            const stage = p.outreach?.stage ?? 'not_contacted'
            const viewed = isViewed(p.outreach)
            return (
              <div key={p.id} onClick={() => openDetail(toDetailItem(p))}
                style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600 }}>{p.brand_name}</div>
                      {p.application_data && (
                        <span title="Submitted via the Growth Audit application form" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: S.purple, background: 'rgba(100,75,255,0.15)', borderRadius: 99, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                          FORM REQUEST
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: S.muted }}>/{p.slug}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    <Link href={`/audit/admin/${p.slug}/edit`} style={{ color: S.purple, fontSize: 13, textDecoration: 'none' }}>Edit</Link>
                    <a href={`https://kliks.com.au/audit/${p.slug}`} target="_blank" rel="noreferrer" style={{ color: S.orange, fontSize: 13, textDecoration: 'none' }}>View</a>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: AUDIT_STATUS_COLOR[auditStatus], fontSize: 13, fontWeight: 600 }}>{AUDIT_STATUS_LABELS[auditStatus]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: STAGE_BG[stage] ?? STAGE_BG.not_contacted, color: STAGE_COLOR[stage] ?? S.muted }}>
                    {STAGE_LABELS[stage] ?? stage}
                  </span>
                  {viewed && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#22c55e', background: 'rgba(34,197,94,0.12)', borderRadius: 99, padding: '2px 6px' }}>VIEWED</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: S.muted, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <span>Views: {p.access_count}</span>
                  <span>Last contacted: {fmtDate(p.outreach?.updated_at)}</span>
                  <button onClick={() => resetViews(p.id, p.brand_name)} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Reset views</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
