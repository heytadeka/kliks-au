import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import EditAuditClient from './EditAuditClient'

export default async function EditAuditPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  if (!cookieStore.get('audit_admin_auth')?.value) redirect('/audit/admin')

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!prospect) redirect('/audit/admin/dashboard')

  const { data: content } = await supabaseAdmin
    .from('audit_content')
    .select('*')
    .eq('prospect_id', prospect.id)
    .single()

  return <EditAuditClient prospect={prospect} content={content} />
}
