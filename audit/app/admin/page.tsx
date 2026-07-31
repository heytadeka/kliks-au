'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const S = { bg: '#0e0d1a', bg2: '#1a1828', orange: '#ff4315', orangeDark: '#c42f08', white: '#ffffff', muted: 'rgba(255,255,255,0.55)', border: 'rgba(100,75,255,0.12)' }

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/audit/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.success) router.push('/audit/admin/today')
    else { setError(data.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 20, padding: 48, maxWidth: 400, width: '100%' }}>
        <a href="/" style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 20, fontWeight: 700, color: S.white, textDecoration: 'none', display: 'block', marginBottom: 32 }}>KLIKS<span style={{ color: S.orange }}>.</span></a>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: S.orange, display: 'block', marginBottom: 12 }}>ADMIN</span>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, marginBottom: 32 }}>Sign in</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 12, padding: '14px 18px', color: S.white, fontFamily: 'Satoshi, sans-serif', fontSize: 15, outline: 'none' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 12, padding: '14px 18px', color: S.white, fontFamily: 'Satoshi, sans-serif', fontSize: 15, outline: 'none' }} />
          {error && <p style={{ color: S.orange, fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: loading ? S.orangeDark : S.orange, color: '#fff', border: 'none', borderRadius: 100, padding: '14px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
