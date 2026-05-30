'use client'
import { useState } from 'react'
import Link from 'next/link'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', border: 'rgba(100,75,255,0.12)', purple: '#644bff' }

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function AdminDashboardClient({ prospects, stats }: { prospects: any[]; stats: any }) {
  const [search, setSearch] = useState('')
  const filtered = prospects.filter(p =>
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
    window.location.reload()
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

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
            <thead>
              <tr style={{ background: S.bg }}>
                {['Brand', 'Slug', 'Email', 'Created', 'Last Accessed', 'Views', 'CRO Status', 'Active', 'Edit'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const croData = (p.audit_data_cache as any)?.[0]?.cro_checklist
                const croStatus = !(p.audit_data_cache as any)?.[0]?.crawled_at
                  ? <span style={{ color: S.muted }}>Pending</span>
                  : croData?.error
                    ? <span style={{ color: '#ef4444' }}>Failed</span>
                    : croData?.summary
                      ? <span style={{ color: '#22c55e' }}>{croData.summary.passed}/20</span>
                      : <span style={{ color: S.orange }}>Scanning...</span>
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                    <td style={{ padding: '12px 14px', color: S.white, fontWeight: 500 }}>{p.brand_name}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{p.slug}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{p.prospect_email}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{new Date(p.created_at).toLocaleDateString('en-AU')}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{p.last_accessed_at ? new Date(p.last_accessed_at).toLocaleDateString('en-AU') : 'Never'}</td>
                    <td style={{ padding: '12px 14px', color: S.muted }}>{p.access_count}</td>
                    <td style={{ padding: '12px 14px' }}>{croStatus}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => toggleActive(p.id, p.is_active)} style={{ background: p.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: p.is_active ? '#22c55e' : '#ef4444', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/audit/admin/${p.slug}/edit`} style={{ color: S.purple, fontSize: 13, textDecoration: 'none' }}>Edit</Link>
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
            const croData = (p.audit_data_cache as any)?.[0]?.cro_checklist
            const croLabel = !(p.audit_data_cache as any)?.[0]?.crawled_at ? 'Pending' : croData?.error ? 'Failed' : croData?.summary ? `${croData.summary.passed}/20` : 'Scanning...'
            return (
              <div key={p.id} style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 600 }}>{p.brand_name}</div>
                    <div style={{ fontSize: 13, color: S.muted }}>/{p.slug}</div>
                  </div>
                  <Link href={`/audit/admin/${p.slug}/edit`} style={{ color: S.purple, fontSize: 13, textDecoration: 'none' }}>Edit</Link>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: S.muted }}>
                  <span>{p.prospect_email}</span>
                  <span>Views: {p.access_count}</span>
                  <span>CRO: {croLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
