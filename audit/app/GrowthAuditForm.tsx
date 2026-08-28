'use client'
import { useState } from 'react'

const REVENUE_OPTIONS = ['Under $20k', '$20k-$50k', '$50k-$100k', '$100k-$250k', '$250k+', 'Prefer not to say']
const AD_SPEND_OPTIONS = ['Not currently advertising', 'Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']

export default function GrowthAuditForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const data = new FormData(form)

    const first_name = (data.get('first_name') as string || '').trim()
    const email = (data.get('email') as string || '').trim()
    const business_name = (data.get('business_name') as string || '').trim()
    const store_url = (data.get('store_url') as string || '').trim()

    if (!first_name || !email || !business_name || !store_url) {
      setError('Please fill in your name, email, business name, and store URL.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/audit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name,
          last_name: (data.get('last_name') as string || '').trim(),
          email,
          phone: (data.get('phone') as string || '').trim(),
          business_name,
          store_url,
          social_handle: (data.get('social_handle') as string || '').trim(),
          monthly_revenue: data.get('monthly_revenue') || '',
          monthly_ad_spend: data.get('monthly_ad_spend') || '',
          challenge: (data.get('challenge') as string || '').trim(),
          twelve_month_goal: (data.get('twelve_month_goal') as string || '').trim(),
          hp_field: (data.get('hp_field') as string || '').trim(),
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setError(result.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email adam@kliks.com.au directly.')
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="form-success" style={{ display: 'block' }}>
        <span className="success-icon">🎉</span>
        <h3>Got it. Thank you.</h3>
        <p>Adam personally reviews every application. If it looks like a strong fit, he&apos;ll be in touch.</p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot - hidden from real visitors via CSS, bots often fill it anyway */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
        <label htmlFor="hp_field">Leave this empty</label>
        <input type="text" id="hp_field" name="hp_field" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">First name</label>
          <input type="text" id="first_name" name="first_name" placeholder="Sarah" required />
        </div>
        <div className="form-group">
          <label htmlFor="last_name">Last name</label>
          <input type="text" id="last_name" name="last_name" placeholder="Johnson" />
        </div>
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
        <label htmlFor="business_name">Business / Brand name</label>
        <input type="text" id="business_name" name="business_name" placeholder="Your brand" required />
      </div>

      <div className="form-group">
        <label htmlFor="store_url">Shopify store URL</label>
        <input type="text" id="store_url" name="store_url" placeholder="yourstore.com.au" required />
      </div>

      <div className="form-group">
        <label htmlFor="social_handle">Instagram / TikTok <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span></label>
        <input type="text" id="social_handle" name="social_handle" placeholder="@yourbrand" />
      </div>

      <div className="form-group">
        <label htmlFor="monthly_revenue">Approximate monthly revenue</label>
        <select id="monthly_revenue" name="monthly_revenue" defaultValue="">
          <option value="" disabled>Select an option</option>
          {REVENUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="monthly_ad_spend">Monthly ad spend</label>
        <select id="monthly_ad_spend" name="monthly_ad_spend" defaultValue="">
          <option value="" disabled>Select an option</option>
          {AD_SPEND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="challenge">What&apos;s the biggest challenge right now?</label>
        <textarea id="challenge" name="challenge" placeholder="e.g. Ads are running but not converting, growth has plateaued, not sure where the biggest opportunity is..." />
      </div>

      <div className="form-group">
        <label htmlFor="twelve_month_goal">Where would you like the business to be in the next 12 months?</label>
        <textarea id="twelve_month_goal" name="twelve_month_goal" placeholder="What does the next stage of growth look like for you?" />
      </div>

      {error && <div className="form-error" style={{ display: 'block' }}>{error}</div>}

      <button type="submit" disabled={submitting} className="btn send-btn">
        {submitting ? 'Sending...' : 'Request My Growth Audit →'}
      </button>
    </form>
  )
}
