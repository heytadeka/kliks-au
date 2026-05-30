'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BP } from '@/lib/config'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', orangeDark: '#c42f08', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', border: 'rgba(100,75,255,0.12)', purple: '#644bff' }

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid rgba(255,255,255,0.12)`,
  borderRadius: 12,
  padding: '12px 16px',
  color: S.white,
  fontFamily: 'Satoshi, sans-serif',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
}

interface AdminUser {
  id: string
  email: string
  name: string
  created_at: string
  is_active: boolean
}

export default function TeamPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadUsers() {
    try {
      const res = await fetch(`${BP}/api/audit/admin/team`)
      if (res.status === 401) {
        window.location.href = '/audit/admin'
        return
      }
      const data = await res.json()
      setUsers(data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${BP}/api/audit/admin/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`${form.name} added successfully.`)
        setForm({ name: '', email: '', password: '' })
        loadUsers()
      } else {
        setError(data.error || 'Failed to add user')
      }
    } catch {
      setError('Network error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.white, fontFamily: 'Satoshi, sans-serif' }}>
      <nav style={{ background: 'rgba(14,13,26,0.95)', borderBottom: `1px solid ${S.border}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none' }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <Link href="/admin/dashboard" style={{ color: S.muted, fontSize: 14, textDecoration: 'none' }}>Back to Dashboard</Link>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 12 }}>ADMIN</span>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '0.01em', marginBottom: 40 }}>Team</h1>

        {/* Existing users */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, marginBottom: 32 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Admin Users</h2>

          {loading ? (
            <p style={{ color: S.muted }}>Loading...</p>
          ) : users.length === 0 ? (
            <p style={{ color: S.muted }}>No admin users found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Created', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: S.orange, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? S.bg2 : S.bg }}>
                    <td style={{ padding: '10px 12px', color: S.white }}>{u.name}</td>
                    <td style={{ padding: '10px 12px', color: S.muted }}>{u.email}</td>
                    <td style={{ padding: '10px 12px', color: S.muted }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: u.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: u.is_active ? '#22c55e' : '#ef4444' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add user form */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Add Admin User</h2>

          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: S.muted, display: 'block', marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Adam Nagy" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: S.muted, display: 'block', marginBottom: 6 }}>Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="adam@kliks.com.au" required type="email" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: S.muted, display: 'block', marginBottom: 6 }}>Password</label>
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Strong password" required type="password" minLength={8} style={inputStyle} />
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
            {success && <p style={{ color: '#22c55e', fontSize: 14 }}>{success}</p>}

            <button type="submit" disabled={adding} style={{ background: adding ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '14px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 4 }}>
              {adding ? 'Adding...' : 'Add User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
