'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GatePage({ params }: { params: { slug: string } }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/audit/gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: params.slug, email }),
    })
    const data = await res.json()
    if (data.success) {
      router.push(data.redirect)
    } else {
      setError(data.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Grain overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', opacity: 0.18, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }} />

      {/* Animated orb blobs */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,75,255,0.18) 0%, transparent 70%)', filter: 'blur(80px)', top: '10%', left: '20%', animation: 'orbFloat 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,67,21,0.12) 0%, transparent 70%)', filter: 'blur(60px)', bottom: '15%', right: '15%', animation: 'orbFloat 10s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Wordmark */}
      <a href="/" style={{ position: 'absolute', top: 32, left: 32, fontFamily: '"Clash Display", sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', textDecoration: 'none', letterSpacing: '-0.5px', zIndex: 10 }}>
        KLIKS<span style={{ color: '#ff4315' }}>.</span>
      </a>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, background: '#1a1828', border: '1px solid rgba(100,75,255,0.12)', borderRadius: 20, padding: '48px', maxWidth: 460, width: '100%', animation: 'fadeUp 0.6s ease forwards' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff4315', display: 'block', marginBottom: 20 }}>GROWTH AUDIT</span>
        <h1 style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.18, color: '#fff', marginBottom: 12 }}>Your report is ready.</h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>Enter the email address this was sent to.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 18px', color: '#fff', fontFamily: 'Satoshi, sans-serif', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Prepared exclusively for you by Kliks Digital. Your email verifies access only. Your data is kept strictly confidential and will not be shared or added to any list.</p>
          {error && (
            <p style={{ color: '#ff4315', fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? '#c42f08' : '#ff4315', color: '#fff', border: 'none', borderRadius: 100, padding: '16px 36px', fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? 'Checking...' : 'Access Report'}
          </button>
        </form>
      </div>
    </div>
  )
}
