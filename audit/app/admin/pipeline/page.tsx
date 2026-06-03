import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) redirect('/audit/admin')

  const { data: domains } = await supabaseAdmin
    .from('monitored_domains')
    .select('*')
    .order('created_at', { ascending: false })

  return <PipelineClient initialDomains={domains ?? []} />
}
