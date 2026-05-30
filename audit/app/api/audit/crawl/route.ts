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

function checkHtml(html: string) {
  const h = html.toLowerCase()

  // Homepage checks
  const sticky_header = /position\s*:\s*(fixed|sticky)/.test(h) && /<header/i.test(html)
  const announcement_bar = /class="[^"]*announcement|class="[^"]*banner|id="[^"]*announcement|class="[^"]*notice/.test(h)
  const exit_intent = ['data-exit-intent', 'klaviyo', 'optinmonster', 'privy', 'sumo'].some(p => h.includes(p))
  const email_capture = ['klaviyo', 'class="[^"]*popup', 'class="[^"]*modal', 'input type="email"', "input type='email'"].some(p => h.includes(p)) ||
    /input[^>]+type=["']email["']/.test(h)
  const trust_badges_home = ['secure', 'guarantee', 'afterpay', 'klarna', 'paypal', 'visa', 'mastercard', 'certified'].some(k => h.includes(k))
  const live_chat = ['gorgias', 'tidio', 'intercom', 'zendesk', 'crisp'].some(c => h.includes(c))
  const mobile_menu = ['hamburger', 'mobile-menu', 'aria-label="menu"', "aria-label='menu'", 'nav-toggle'].some(p => h.includes(p))
  const cart_count = ['cart-count', 'cart-badge', 'cart-qty', 'cart_count', 'cartcount'].some(p => h.includes(p))
  const social_proof_bar = ['marquee', 'logo-bar', 'social-proof', 'logo_bar'].some(p => h.includes(p))
  const blog_section = ['/blogs/', '/journal', '/articles', '>blog<', '>journal<'].some(p => h.includes(p))

  // Product page checks (applied to same HTML if it's a product page, else defaults to false)
  const sticky_atc = /(position\s*:\s*(fixed|sticky)[^}]*add.to.cart|add.to.cart[^}]*position\s*:\s*(fixed|sticky))/i.test(html) ||
    /class="[^"]*sticky[^"]*atc|class="[^"]*sticky[^"]*add|id="[^"]*sticky[^"]*cart/.test(h)
  const reviews = ['yotpo', 'okendo', 'judge.me', 'stamped', 'loox', 'class="[^"]*review', 'class="[^"]*rating', '.star-rating'].some(p => h.includes(p))
  const trust_badges_product = trust_badges_home // re-check same signals on product page
  const countdown_timer = ['countdown', 'timer', 'ends in', 'limited time', 'hurry'].some(p => h.includes(p))
  const quantity_selector = ['name="quantity"', "name='quantity'", 'class="[^"]*quantity', 'id="[^"]*quantity'].some(p => h.includes(p)) ||
    /name=["']quantity["']/.test(h)
  const image_gallery = (h.match(/product[^"]*img|product-image|product_image/g) ?? []).length > 2
  const related_products = ['you may also like', 'recently viewed', 'related products', 'customers also bought', 'frequently bought'].some(p => h.includes(p))
  const breadcrumbs = ['breadcrumb', 'typeof="breadcrumblist"', 'aria-label="breadcrumb"'].some(p => h.includes(p))
  const product_schema = /"@type"\s*:\s*"Product"/.test(html) || /'@type'\s*:\s*'Product'/.test(html)
  const lazy_loading = /loading=["']lazy["']/.test(h)

  return {
    sticky_header, announcement_bar, exit_intent, email_capture,
    trust_badges_home, live_chat, mobile_menu, cart_count,
    social_proof_bar, blog_section, sticky_atc, reviews,
    trust_badges_product, countdown_timer, quantity_selector,
    image_gallery, related_products, breadcrumbs, product_schema, lazy_loading,
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.text()
}

function findProductUrl(html: string, baseUrl: string): string | null {
  const match = html.match(/href="(\/products\/[^"?#]+)"/i)
  if (!match) return null
  const base = new URL(baseUrl)
  return `${base.protocol}//${base.host}${match[1]}`
}

export async function POST(req: NextRequest) {
  const serviceKey = req.headers.get('x-service-key')
  if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id, store_url } = await req.json()

  try {
    // Fetch homepage
    const homeHtml = await fetchHtml(store_url)
    const homeChecks = checkHtml(homeHtml)

    // Fetch first product page and merge checks
    let productChecks = homeChecks
    const productUrl = findProductUrl(homeHtml, store_url)
    if (productUrl) {
      try {
        const productHtml = await fetchHtml(productUrl)
        const pc = checkHtml(productHtml)
        // Product-specific checks come from the product page
        productChecks = {
          ...homeChecks,
          sticky_atc: pc.sticky_atc,
          reviews: pc.reviews,
          trust_badges_product: pc.trust_badges_product,
          countdown_timer: pc.countdown_timer,
          quantity_selector: pc.quantity_selector,
          image_gallery: pc.image_gallery,
          related_products: pc.related_products,
          breadcrumbs: pc.breadcrumbs,
          product_schema: pc.product_schema,
          lazy_loading: pc.lazy_loading,
        }
      } catch {}
    }

    const checkResults = CRO_CHECKS.map(check => ({
      ...check,
      passed: !!(productChecks as any)[check.id],
      fix: (productChecks as any)[check.id] ? undefined : FIXES[check.id],
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

    return NextResponse.json({ success: true, passed, results: checkResults })

  } catch (err: any) {
    await supabaseAdmin
      .from('audit_data_cache')
      .upsert({
        prospect_id,
        cro_checklist: { error: true, message: err.message },
        crawled_at: new Date().toISOString(),
      }, { onConflict: 'prospect_id' })
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
