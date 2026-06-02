const express = require('express')
const fetch = require('node-fetch')

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 8080
const PSI_API_KEY = process.env.PSI_API_KEY
const TIMEOUT_MS = 55_000

async function fetchPsi(url, strategy) {
  const params = new URLSearchParams({
    url,
    strategy,
    key: PSI_API_KEY,
  })
  params.append('category', 'performance')
  params.append('category', 'seo')
  params.append('category', 'accessibility')
  params.append('category', 'best-practices')

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, { signal: controller.signal })
    if (!res.ok) {
      console.error(`[pagespeed-service] PSI ${strategy} HTTP ${res.status} for ${url}`)
      return null
    }
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`[pagespeed-service] ${strategy} timed out for ${url}`)
    } else {
      console.error(`[pagespeed-service] ${strategy} failed for ${url}:`, err.message)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/pagespeed', async (req, res) => {
  const { url, prospect_id } = req.body
  if (!url) {
    return res.status(400).json({ error: 'url is required' })
  }

  console.log(`[pagespeed-service] fetching ${url} (prospect_id: ${prospect_id ?? 'n/a'})`)

  const [mobile, desktop] = await Promise.all([
    fetchPsi(url, 'MOBILE'),
    fetchPsi(url, 'DESKTOP'),
  ])

  res.json({ mobile, desktop })
})

app.listen(PORT, () => {
  console.log(`[pagespeed-service] listening on port ${PORT}`)
})
