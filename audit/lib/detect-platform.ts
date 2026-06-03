export async function detectPlatform(domain: string): Promise<'shopify' | 'squarespace' | 'unknown'> {
  // Step 1 — Shopify: /products.json returns JSON when store is active
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 5000)
    try {
      const r = await fetch(`https://${domain}/products.json`, { signal: ctl.signal })
      clearTimeout(timer)
      if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
        return 'shopify'
      }
    } catch {
      clearTimeout(timer)
    }
  } catch {
    // ignore
  }

  // Step 2 — Squarespace: check headers then body
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 5000)
    try {
      const r = await fetch(`https://${domain}`, { signal: ctl.signal })
      clearTimeout(timer)
      const powered = (r.headers.get('x-powered-by') ?? '').toLowerCase()
      const server = (r.headers.get('server') ?? '').toLowerCase()
      if (powered.includes('squarespace') || server.includes('squarespace')) {
        return 'squarespace'
      }
      const body = await r.text()
      if (
        body.includes('static.squarespace.com') ||
        body.includes('squarespace-cdn.com') ||
        body.includes('squarespace.com/universal')
      ) {
        return 'squarespace'
      }
    } catch {
      clearTimeout(timer)
    }
  } catch {
    // ignore
  }

  return 'unknown'
}
