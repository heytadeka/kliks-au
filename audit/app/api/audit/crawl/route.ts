import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

const CRO_CHECKS = [
  { id: 'sticky_header', label: 'Sticky Header', category: 'Navigation', importance: 'medium' },
  { id: 'announcement_bar', label: 'Announcement Bar', category: 'Navigation', importance: 'medium' },
  { id: 'exit_intent', label: 'Exit Intent Popup', category: 'Engagement', importance: 'high' },
  { id: 'email_capture', label: 'Email Capture / Popup', category: 'Engagement', importance: 'high' },
  { id: 'trust_badges_home', label: 'Trust Badges (Homepage)', category: 'Trust & Social Proof', importance: 'medium' },
  { id: 'live_chat', label: 'Live Chat Widget', category: 'Engagement', importance: 'low' },
  { id: 'mobile_menu', label: 'Mobile Menu / Hamburger', category: 'Navigation', importance: 'medium' },
  { id: 'cart_count', label: 'Cart Count Indicator', category: 'Navigation', importance: 'medium' },
  { id: 'social_proof_bar', label: 'Social Proof Bar / Marquee', category: 'Trust & Social Proof', importance: 'medium' },
  { id: 'blog_section', label: 'Blog / Content Section', category: 'Technical', importance: 'low' },
  { id: 'sticky_atc', label: 'Sticky Add-to-Cart Button', category: 'Product Page', importance: 'high' },
  { id: 'reviews', label: 'Review / Rating Widgets', category: 'Trust & Social Proof', importance: 'high' },
  { id: 'trust_badges_product', label: 'Trust Badges (Product Page)', category: 'Trust & Social Proof', importance: 'high' },
  { id: 'countdown_timer', label: 'Countdown Timer / Urgency', category: 'Engagement', importance: 'medium' },
  { id: 'quantity_selector', label: 'Quantity Selector', category: 'Product Page', importance: 'low' },
  { id: 'image_gallery', label: 'Product Image Gallery', category: 'Product Page', importance: 'low' },
  { id: 'related_products', label: 'Related Products', category: 'Product Page', importance: 'medium' },
  { id: 'breadcrumbs', label: 'Breadcrumb Navigation', category: 'Technical', importance: 'low' },
  { id: 'product_schema', label: 'Product Schema Markup', category: 'Technical', importance: 'high' },
  { id: 'lazy_loading', label: 'Lazy Loading Images', category: 'Technical', importance: 'medium' },
]

const FIXES: Record<string, string> = {
  sticky_atc: 'Add a sticky ATC bar that appears when the main button scrolls out of view.',
  reviews: 'Install a reviews app (Okendo, Judge.me, or Yotpo) and display ratings on product pages.',
  email_capture: 'Set up a Klaviyo popup with a lead magnet or discount offer.',
  exit_intent: 'Add an exit-intent trigger to your popup to capture abandoning visitors.',
  product_schema: 'Add JSON-LD Product schema markup to product pages for rich search results.',
  trust_badges_product: 'Add payment and guarantee badges near the ATC button.',
  announcement_bar: 'Add an announcement bar promoting your current offer or USP.',
  sticky_header: 'Make your header sticky so navigation is always accessible.',
  countdown_timer: 'Add urgency elements like countdown timers or stock indicators.',
  related_products: 'Add a related products or upsell section to increase average order value.',
  cart_count: 'Display a cart item count badge in the navigation.',
  lazy_loading: 'Enable lazy loading on images to improve page speed.',
  breadcrumbs: 'Add breadcrumb navigation to improve UX and SEO.',
  quantity_selector: 'Ensure a quantity selector is visible on product pages.',
  image_gallery: 'Add a multi-image gallery with zoom for product pages.',
  live_chat: 'Consider adding live chat to reduce purchase hesitation.',
  blog_section: 'A content/blog section can improve SEO and brand trust.',
  social_proof_bar: 'Add a social proof bar showing customer counts or logos.',
  mobile_menu: 'Ensure a mobile-friendly hamburger menu is present.',
  trust_badges_home: 'Add trust badges (payment methods, guarantees) to the homepage.',
}

export async function POST(req: NextRequest) {
  // Auth check
  const serviceKey = req.headers.get('x-service-key')
  if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id, store_url } = await req.json()

  try {
    // Dynamic import for Vercel compatibility
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })

    const results: any[] = []

    try {
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.goto(store_url, { waitUntil: 'networkidle2', timeout: 25000 })

      // Homepage checks
      const homepageResults = await page.evaluate(() => {
        const checks: Record<string, boolean> = {}

        // 1. Sticky header
        const header = document.querySelector('header, [id*="header"], [class*="header"]')
        if (header) {
          const style = window.getComputedStyle(header)
          checks.sticky_header = style.position === 'fixed' || style.position === 'sticky'
        } else {
          checks.sticky_header = false
        }

        // 2. Announcement bar
        const announcementSelectors = ['[class*="announcement"]', '[class*="banner"]', '[id*="announcement"]', '[class*="notice"]']
        checks.announcement_bar = announcementSelectors.some(s => {
          const el = document.querySelector(s)
          return el && (el as HTMLElement).offsetHeight > 0
        })

        // 3. Exit intent
        const exitIntentPatterns = ['data-exit-intent', 'klaviyo', 'optinmonster', 'privy', 'sumo']
        const allScripts = Array.from(document.scripts).map(s => s.src.toLowerCase())
        const bodyHTML = document.body.innerHTML.toLowerCase()
        checks.exit_intent = exitIntentPatterns.some(p => allScripts.some(s => s.includes(p)) || bodyHTML.includes(p))

        // 4. Email capture
        checks.email_capture = !!(
          document.querySelector('[class*="klaviyo"]') ||
          document.querySelector('[class*="popup"]') ||
          document.querySelector('[class*="modal"]') ||
          document.querySelector('form input[type="email"]')
        )

        // 5. Trust badges homepage
        const imgAlts = Array.from(document.images).map(i => (i.alt + ' ' + i.src).toLowerCase())
        const trustKeywords = ['secure', 'guarantee', 'ssl', 'trusted', 'certified', 'visa', 'mastercard', 'paypal', 'afterpay', 'klarna']
        checks.trust_badges_home = imgAlts.some(alt => trustKeywords.some(k => alt.includes(k)))

        // 6. Live chat
        const chatScripts = ['gorgias', 'tidio', 'intercom', 'zendesk', 'crisp']
        checks.live_chat = chatScripts.some(c => allScripts.some(s => s.includes(c)) || bodyHTML.includes(c))

        // 7. Mobile menu
        checks.mobile_menu = !!(
          document.querySelector('[class*="hamburger"]') ||
          document.querySelector('[class*="mobile-menu"]') ||
          document.querySelector('[aria-label*="menu"]')
        )

        // 8. Cart count
        checks.cart_count = !!(
          document.querySelector('[class*="cart-count"]') ||
          document.querySelector('[class*="cart-badge"]') ||
          document.querySelector('[class*="cart-qty"]')
        )

        // 9. Social proof bar
        checks.social_proof_bar = !!(
          document.querySelector('[class*="marquee"]') ||
          document.querySelector('[class*="logo-bar"]') ||
          document.querySelector('[class*="social-proof"]')
        )

        // 10. Blog section
        const navLinks = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() + ' ' + a.href.toLowerCase())
        checks.blog_section = navLinks.some(l => ['blog', 'journal', 'articles', 'tips'].some(k => l.includes(k)))

        return checks
      })

      Object.assign(results, homepageResults)

      // Find first product link
      let productUrl: string | null = null
      try {
        productUrl = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/products/"]'))
          return links.length > 0 ? (links[0] as HTMLAnchorElement).href : null
        })
      } catch {}

      // Product page checks
      let productResults: Record<string, boolean> = {
        sticky_atc: false,
        reviews: false,
        trust_badges_product: false,
        countdown_timer: false,
        quantity_selector: false,
        image_gallery: false,
        related_products: false,
        breadcrumbs: false,
        product_schema: false,
        lazy_loading: false,
      }

      if (productUrl) {
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 20000 })

        productResults = await page.evaluate(() => {
          const checks: Record<string, boolean> = {}
          const bodyHTML = document.body.innerHTML.toLowerCase()
          const allScripts = Array.from(document.scripts).map(s => s.src.toLowerCase())

          // 11. Sticky ATC
          const atcButtons = document.querySelectorAll('[class*="add-to-cart"], [id*="add-to-cart"], button[name="add"]')
          checks.sticky_atc = Array.from(atcButtons).some(btn => {
            const style = window.getComputedStyle(btn)
            return style.position === 'fixed' || style.position === 'sticky'
          })

          // 12. Reviews
          const reviewPlatforms = ['yotpo', 'okendo', 'judge.me', 'judging.me', 'stamped', 'loox']
          checks.reviews = reviewPlatforms.some(p => allScripts.some(s => s.includes(p)) || bodyHTML.includes(p)) ||
            !!(document.querySelector('[class*="review"]') || document.querySelector('[class*="rating"]') || document.querySelector('.star'))

          // 13. Trust badges product
          const imgAlts = Array.from(document.images).map(i => (i.alt + ' ' + i.src).toLowerCase())
          const trustKeywords = ['secure', 'guarantee', 'ssl', 'trusted', 'certified', 'visa', 'mastercard', 'paypal', 'afterpay', 'klarna']
          checks.trust_badges_product = imgAlts.some(alt => trustKeywords.some(k => alt.includes(k)))

          // 14. Countdown
          checks.countdown_timer = !!(
            document.querySelector('[class*="countdown"]') ||
            document.querySelector('[class*="timer"]') ||
            bodyHTML.includes('ends in') ||
            bodyHTML.includes('limited time')
          )

          // 15. Quantity selector
          checks.quantity_selector = !!(
            document.querySelector('input[name="quantity"]') ||
            document.querySelector('[class*="quantity"]')
          )

          // 16. Image gallery
          const productImages = document.querySelectorAll('[class*="product"] img, [id*="product"] img')
          checks.image_gallery = productImages.length > 2

          // 17. Related products
          checks.related_products = !!(
            bodyHTML.includes('you may also like') ||
            bodyHTML.includes('recently viewed') ||
            bodyHTML.includes('related products') ||
            bodyHTML.includes('customers also bought')
          )

          // 18. Breadcrumbs
          checks.breadcrumbs = !!(
            document.querySelector('[class*="breadcrumb"]') ||
            document.querySelector('nav[aria-label*="breadcrumb"]') ||
            document.querySelector('[typeof="BreadcrumbList"]')
          )

          // 19. Product schema
          const schemaScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          checks.product_schema = schemaScripts.some(s => {
            try {
              const parsed = JSON.parse(s.textContent || '')
              return parsed['@type'] === 'Product'
            } catch { return false }
          })

          // 20. Lazy loading
          const images = document.querySelectorAll('img')
          checks.lazy_loading = Array.from(images).some(img => img.loading === 'lazy')

          return checks
        })
      }

      const allChecks = { ...homepageResults, ...productResults }

      // Build results array
      const checkResults = CRO_CHECKS.map(check => ({
        ...check,
        passed: !!(allChecks as any)[check.id],
        fix: (allChecks as any)[check.id] ? undefined : FIXES[check.id],
      }))

      const passed = checkResults.filter(c => c.passed).length
      const criticalIssues = checkResults.filter(c => !c.passed && c.importance === 'high').length
      const warnings = checkResults.filter(c => !c.passed && c.importance === 'medium').length
      const opportunities = checkResults.filter(c => !c.passed && c.importance === 'low').length

      await supabaseAdmin
        .from('audit_data_cache')
        .upsert({
          prospect_id,
          cro_checklist: {
            results: checkResults,
            summary: { total_checks: 20, passed, critical_issues: criticalIssues, warnings, opportunities },
          },
          crawled_at: new Date().toISOString(),
        }, { onConflict: 'prospect_id' })

      await browser.close()
      return NextResponse.json({ success: true, passed, results: checkResults })

    } catch (crawlErr: any) {
      await browser.close()
      // Store error state
      await supabaseAdmin
        .from('audit_data_cache')
        .upsert({
          prospect_id,
          cro_checklist: { error: true, message: crawlErr.message },
          crawled_at: new Date().toISOString(),
        }, { onConflict: 'prospect_id' })
      return NextResponse.json({ success: false, error: crawlErr.message }, { status: 500 })
    }

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
