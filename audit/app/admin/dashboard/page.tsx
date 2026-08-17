import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) redirect('/audit/admin')

  const { data: prospects } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })

  const prospectIds = (prospects ?? []).map(p => p.id)

  // Direct queries rather than embedding through prospects. This is the same
  // pattern that produced a false-positive Pending badge on Today (see
  // lib/commentary-status.ts), and this file is where the original "Crawls
  // Complete: 0" bug lived - patched at the time with a shape-normalising
  // getCache() helper rather than a query change. Today proved shape-handling
  // alone doesn't reliably fix this, so match the pattern already proven
  // correct on Today, the report page, and EditAuditClient: fetch each table
  // separately via .in(prospect_id), join in JS. cro_checklist/crawled_at
  // stay in the select for the existing "Crawls Complete" stat card
  // (unchanged by this pass); the rest are what getAuditStatus needs.
  const [{ data: cacheRows }, { data: outreachRows }] = await Promise.all([
    supabaseAdmin
      .from('audit_data_cache')
      .select('prospect_id, cro_checklist, crawled_at, pagespeed_fetched_at, dataforseo_overview, commentary_gen_invoked_at, commentary_readiness_status')
      .in('prospect_id', prospectIds),
    supabaseAdmin
      .from('outreach_log')
      .select('*')
      .in('prospect_id', prospectIds),
  ])

  const cacheByProspect = new Map((cacheRows ?? []).map(c => [c.prospect_id, c]))
  const outreachByProspect = new Map((outreachRows ?? []).map(o => [o.prospect_id, o]))

  // Attach the resolved cache/outreach back onto each prospect as plain
  // objects (or null) so AdminDashboardClient never has to guess at an
  // embed's shape.
  const prospectsWithCache = (prospects ?? []).map(p => ({
    ...p,
    audit_data_cache: cacheByProspect.get(p.id) ?? null,
    outreach: outreachByProspect.get(p.id) ?? null,
  }))

  const stats = {
    total: prospectsWithCache.length,
    viewedThisWeek: prospectsWithCache.filter(p => p.last_accessed_at && new Date(p.last_accessed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    totalViews: prospectsWithCache.reduce((sum, p) => sum + (p.access_count ?? 0), 0),
    crawlComplete: prospectsWithCache.filter(p => p.audit_data_cache?.cro_checklist?.summary).length,
  }

  return <AdminDashboardClient prospects={prospectsWithCache} stats={stats} />
}
