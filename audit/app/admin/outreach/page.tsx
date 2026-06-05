import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import OutreachClient from './OutreachClient'

export default async function OutreachPage() {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) redirect('/audit/admin')

  const { data: rows } = await supabaseAdmin
    .from('outreach_log')
    .select('*')
    .order('created_at', { ascending: false })

  return <OutreachClient initialRows={rows ?? []} />
}
