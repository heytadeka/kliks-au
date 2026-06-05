import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ReportClient from './ReportClient'

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const isAdmin = !!cookieStore.get('audit_admin_auth')?.value
  if (!isAdmin) {
    const authCookie = cookieStore.get(`audit_${params.slug}_auth`)
    if (authCookie?.value !== 'true') {
      redirect(`/${params.slug}`)
    }
  }

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!prospect) redirect(`/${params.slug}`)

  const { data: content } = await supabaseAdmin
    .from('audit_content')
    .select('*')
    .eq('prospect_id', prospect.id)
    .single()

  const { data: cache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('*')
    .eq('prospect_id', prospect.id)
    .single()

  return <ReportClient prospect={prospect} content={content} cache={cache} />
}
