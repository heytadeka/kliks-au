import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { waitUntil } from '@vercel/functions'
import { checkRescanLock, setRescanLock } from '@/lib/rescan-lock'

export const maxDuration = 60

// ONE-TIME CLEANUP - delete this route once all 12 slugs below are confirmed
// regenerated. Not a permanent feature, same disposable-script precedent as
// the earlier diag-ai-visibility-temp route.
//
// These 12 prospects got commentary generated against stale PageSpeed data
// because of the rescan readiness race (see rescan/route.ts's fix). Their
// underlying cache data has since settled and is now correct - this just
// re-fires generate-commentary against what's already there, no re-fetch.
// The existing Today "Regenerate Commentary" button can't reach these: it's
// only shown for prospects with outreach_log.status === 'audit_created' AND
// isCommentaryPending() === true, and these prospects have non-null (just
// stale) commentary fields, so isCommentaryPending() reads false for all of
// them - they were never going to surface as needing regeneration through
// the normal flow, that's exactly the bug.
//
// Miss Lilly's is first - the one confirmed already sent to a real prospect.
const CLEANUP_SLUGS = [
  'miss-lillys-bakery-cafe',
  'black-velvet-cakes',
  'bakealicious-by-gabriela',
  'cake-in-a-box',
  'little-cake-box',
  'the-cupcake-factory',
  'sebastien-sans-gluten',
  'de-lovely-cake',
  'bannos-cakes',
  'flourlane-cakes',
  'flo-viennoiserie',
  'christina-s-honeycakes',
]

export async function POST() {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kliks.com.au'
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }

  const results: Array<{ slug: string; status: string }> = []

  for (const slug of CLEANUP_SLUGS) {
    const { data: prospect } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!prospect) {
      results.push({ slug, status: 'not found' })
      continue
    }

    const lock = await checkRescanLock(prospect.id)
    if (lock.locked) {
      results.push({ slug, status: `locked (started ${lock.secondsAgo}s ago) - skipped` })
      continue
    }

    // Same one-shot definition of "ready" as regenerate-commentary/route.ts
    // and dataforseo-enrichment's own poll - confirms the data is actually
    // there rather than assuming it must be.
    const { data: cache } = await supabaseAdmin
      .from('audit_data_cache')
      .select('pagespeed_fetched_at, crawled_at, dataforseo_overview')
      .eq('prospect_id', prospect.id)
      .single()

    const dataReady = !!(cache?.pagespeed_fetched_at && cache?.crawled_at && cache?.dataforseo_overview != null)
    if (!dataReady) {
      results.push({ slug, status: 'underlying data not ready - skipped, investigate before retrying' })
      continue
    }

    await setRescanLock(prospect.id)
    await supabaseAdmin
      .from('audit_data_cache')
      .update({
        commentary_readiness_status: 'ready',
        commentary_readiness_ms: null,
        commentary_readiness_at: new Date().toISOString(),
      })
      .eq('prospect_id', prospect.id)

    waitUntil(
      fetch(`${base}/api/audit/generate-commentary`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({ prospect_id: prospect.id }),
      })
        .then(r => console.log('[regenerate-commentary-cleanup]', slug, 'triggered, status:', r.status))
        .catch((e: any) => console.error('[regenerate-commentary-cleanup]', slug, 'trigger failed:', e.message))
    )

    results.push({ slug, status: 'triggered' })
  }

  console.log('[regenerate-commentary-cleanup] summary:', JSON.stringify(results))
  return NextResponse.json({ success: true, results })
}
