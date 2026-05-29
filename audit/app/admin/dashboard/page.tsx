import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) redirect('/audit/admin')

  const { data: prospects } = await supabaseAdmin
    .from('prospects')
    .select('*, audit_data_cache(cro_checklist, crawled_at)')
    .order('created_at', { ascending: false })

  const stats = {
    total: prospects?.length ?? 0,
    viewedThisWeek: prospects?.filter(p => p.last_accessed_at && new Date(p.last_accessed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length ?? 0,
    totalViews: prospects?.reduce((sum, p) => sum + (p.access_count ?? 0), 0) ?? 0,
    crawlComplete: prospects?.filter(p => (p.audit_data_cache as any)?.[0]?.cro_checklist?.summary).length ?? 0,
  }

  return <AdminDashboardClient prospects={prospects ?? []} stats={stats} />
}
