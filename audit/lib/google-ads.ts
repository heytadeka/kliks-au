// Conversion labels for Google Ads destination AW-17756066541. That
// destination is already loaded by the Google tag in app/layout.tsx (it's
// linked to the tag in Google's tag settings), so no extra gtag('config')
// is needed here - these just name which conversion action to credit.
export const GADS_AUDIT = 'AW-17756066541/qc76CJ3c6pMdEO2l4JJC'
export const GADS_CALL = 'AW-17756066541/EeRcCNSR85MdEO2l4JJC'

// Never throws and never blocks: onDone always runs exactly once, either
// when Google confirms the hit (event_callback) or after the fallback
// timeout - and immediately if gtag is missing. Call it from a submit-success
// handler only, never on a thank-you page load, so reloads can't double count.
export function trackGoogleConversion(sendTo: string, onDone?: () => void) {
  let done = false
  const finish = () => {
    if (done) return
    done = true
    if (onDone) onDone()
  }
  try {
    const gtag = (window as any).gtag
    if (typeof gtag !== 'function') { finish(); return }
    gtag('event', 'conversion', { send_to: sendTo, event_callback: finish })
    setTimeout(finish, 1000)
  } catch {
    finish()
  }
}
