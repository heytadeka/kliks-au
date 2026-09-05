'use client'
import { useState } from 'react'

const REVENUE_OPTIONS = ['Under $20k', '$20k-$50k', '$50k-$100k', '$100k-$250k', '$250k+', 'Prefer not to say']

export default function GrowthAuditForm() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const data = new FormData(form)

    const first_name = (data.get('first_name') as string || '').trim()
    const email = (data.get('email') as string || '').trim()
    const phone = (data.get('phone') as string || '').trim()
    const store_url = (data.get('store_url') as string || '').trim()
    const monthly_revenue = (data.get('monthly_revenue') as string) || ''
    const challenge = (data.get('challenge') as string || '').trim()

    if (!first_name || !email || !store_url) {
      setError('Please fill in your name, email and website / store URL.')
      return
    }

    // Shared with the server-side Meta CAPI call so both the browser pixel
    // and CAPI fires of this same Lead get deduped into one event, not two.
    const eventId = crypto.randomUUID()

    setSubmitting(true)
    try {
      const res = await fetch('/api/audit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name, email, phone, store_url,
          monthly_revenue, challenge,
          event_id: eventId,
          test_event_code: new URLSearchParams(window.location.search).get('test_event_code') || '',
          hp_field: (data.get('hp_field') as string || '').trim(),
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setError(result.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      // Meta conversion event - standard "Lead" event so this can be set as
      // a campaign optimization/conversion goal in Ads Manager. eventID pairs
      // this with the server-side CAPI fire for the same submission. Only
      // fires here, after a genuinely successful submission - never on the
      // button click itself or a validation error.
      const fbq = (window as any).fbq
      if (typeof fbq === 'function') fbq('track', 'Lead', {}, { eventID: eventId })

      // Web3Forms only accepts client-side submissions on the free plan, so
      // the notification email fires from here, after the CRM record (the
      // source of truth) is already saved server-side. Fire-and-forget - a
      // failed notification shouldn't affect what the applicant sees.
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: '8d31ed39-c2e7-429c-b4ad-fa37a5ff26e5',
          subject: `New Growth Audit request - ${first_name}`,
          from_name: first_name,
          email,
          phone: phone || 'Not provided',
          store_url,
          monthly_revenue: monthly_revenue || 'Not provided',
          challenge: challenge || 'Not provided',
        }),
      }).catch(() => {})

      // A full navigation, not router.push - the app has no basePath config,
      // so client-side routing only knows internal route names ('/thank-you'),
      // not the externally-rewritten public path. window.location goes through
      // Vercel's actual /audit/(.*) rewrite like any other page load does.
      window.location.href = '/audit/thank-you'
    } catch {
      setError('Something went wrong. Please try again or email adam@kliks.com.au directly.')
      setSubmitting(false)
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot - hidden from real visitors via CSS, bots often fill it anyway */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
        <label htmlFor="hp_field">Leave this empty</label>
        <input type="text" id="hp_field" name="hp_field" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-group">
        <label htmlFor="first_name">First name</label>
        <input type="text" id="first_name" name="first_name" placeholder="Sarah" required />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" placeholder="sarah@yourstore.com.au" required />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span></label>
        <input type="tel" id="phone" name="phone" placeholder="+61 4XX XXX XXX" />
      </div>

      <div className="form-group">
        <label htmlFor="store_url">Website / store URL</label>
        <input type="text" id="store_url" name="store_url" placeholder="yourstore.com.au" required />
      </div>

      <div className="form-group">
        <label htmlFor="monthly_revenue">Approximate monthly revenue <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span></label>
        <select id="monthly_revenue" name="monthly_revenue" defaultValue="">
          <option value="" disabled>Select an option</option>
          {REVENUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="challenge">What&apos;s the biggest challenge right now? <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span></label>
        <textarea id="challenge" name="challenge" placeholder="e.g. Ads are running but not converting, growth has plateaued, not sure where the biggest opportunity is..." />
      </div>

      {error && <div className="form-error" style={{ display: 'block' }}>{error}</div>}

      <button type="submit" disabled={submitting} className="btn send-btn">
        {submitting ? 'Sending...' : 'Request My Free Growth Audit →'}
      </button>
      <p style={{ marginTop: 14, color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>No account access required. No obligation.</p>
    </form>
  )
}
