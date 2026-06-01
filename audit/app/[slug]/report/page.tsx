import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ReportClient from './ReportClient'

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const authCookie = cookieStore.get(`audit_${params.slug}_auth`)
  if (authCookie?.value !== 'true') {
    redirect(`/${params.slug}`)
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

  console.log('[page] reached cache query - slug:', params.slug)
  console.log('[page] cache keys:', Object.keys(cache || {}))
  console.log('[page] dfsKeywords type:', typeof cache?.dataforseo_keywords)
  console.log('[page] dfsKeywords value:', JSON.stringify(cache?.dataforseo_keywords)?.slice(0, 500))
  console.log('[page] ReportClient receives prop: cache (cache.dataforseo_keywords fed to dfsKeywords via useMemo in client)')

  return <ReportClient prospect={prospect} content={content} cache={cache} />
}
