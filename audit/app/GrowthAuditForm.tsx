'use client'
import { useEffect, useRef, useState } from 'react'

const REVENUE_OPTIONS = ['Under $20k', '$20k-$50k', '$50k-$100k', '$100k-$250k', '$250k+', 'Prefer not to say']
const AD_SPEND_OPTIONS = ['Not currently advertising', 'Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']

export default function GrowthAuditForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const successRef = useRef<HTMLDivElement>(null)

  // The success message is much shorter than the form it replaces, so the
  // page shrinks underneath the visitor's scroll position - without this,
  // they'd land somewhere in the section below instead of seeing the
  // confirmation at all.
  useEffect(() => {
    if (submitted) successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [submitted])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const data = new FormData(form)

    const first_name = (data.get('first_name') as string || '').trim()
    const last_name = (data.get('last_name') as string || '').trim()
    const email = (data.get('email') as string || '').trim()
    const phone = (data.get('phone') as string || '').trim()
    const business_name = (data.get('business_name') as string || '').trim()
    const store_url = (data.get('store_url') as string || '').trim()
    const social_handle = (data.get('social_handle') as string || '').trim()
    const keywords = (data.get('keywords') as string || '').trim()
    const monthly_revenue = (data.get('monthly_revenue') as string) || ''
    const monthly_ad_spend = (data.get('monthly_ad_spend') as string) || ''
    const challenge = (data.get('challenge') as string || '').trim()
    const twelve_month_goal = (data.get('twelve_month_goal') as string || '').trim()

    if (!first_name || !email || !business_name || !store_url) {
      setError('Please fill in your name, email, business name, and store URL.')
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
          first_name, last_name, email, phone, business_name, store_url,
          social_handle, keywords, monthly_revenue, monthly_ad_spend,
          challenge, twelve_month_goal,
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
      setSubmitted(true)

      // Meta conversion event - standard "Lead" event so this can be set as
      // a campaign optimization/conversion goal in Ads Manager. eventID pairs
      // this with the server-side CAPI fire for the same submission.
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
          subject: `New Growth Audit application - ${business_name}`,
          from_name: `${first_name} ${last_name}`.trim(),
          email,
          phone: phone || 'Not provided',
          business_name,
          store_url,
          social_handle: social_handle || 'Not provided',
          keywords: keywords || 'Not provided',
          monthly_revenue: monthly_revenue || 'Not provided',
          monthly_ad_spend: monthly_ad_spend || 'Not provided',
          challenge: challenge || 'Not provided',
          twelve_month_goal: twelve_month_goal || 'Not provided',
        }),
      }).catch(() => {})
    } catch {
      setError('Something went wrong. Please try again or email adam@kliks.com.au directly.')
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div ref={successRef} className="form-success" style={{ display: 'block', scrollMarginTop: 80 }}>
        <span className="success-icon">🎉</span>
        <h3>Got it. Thank you.</h3>
        <p>I personally review every application. I&apos;ll be in touch soon.</p>
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
        <label htmlFor="keywords">Preferred keywords to be ranked for <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span></label>
        <input type="text" id="keywords" name="keywords" placeholder="e.g. vegan cake delivery sydney" />
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
