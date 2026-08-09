import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildLlmVisibilityQuery, detectMention } from '@/lib/llm-visibility'
import { LLM_VISIBILITY_PROVIDERS } from '@/lib/config'

export const maxDuration = 60
export const preferredRegion = 'syd1'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

// Confirmed against DataForSEO's own docs for all three
// ai_optimization/{provider}/llm_responses/live endpoints (same shape across
// chat_gpt/claude/perplexity): the answer text lives in
// result[0].items[].sections[].text on items of type "message" (items of
// type "reasoning" hold chain-of-thought, not the answer - skipped).
// money_spent (not the flat pricing-sheet cost) is the real per-call USD
// figure. Perplexity's docs note sections[].text can come back null on some
// queries even with web_search on - if every message item's text sections
// are empty, this returns null rather than substituting anything, same
// "no output beats wrong output" rule as everywhere else in this app.
function extractResponseText(result: any): string | null {
  const items: any[] = result?.items ?? []
  const texts = items
    .filter((it: any) => it.type === 'message')
    .flatMap((it: any) => (it.sections ?? []).filter((s: any) => s.type === 'text'))
    .map((s: any) => s.text)
    .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
  return texts.length > 0 ? texts.join('\n\n') : null
}

// Synchronous ai_optimization/{provider}/llm_responses/live calls, same
// fan-out shape as dataforseo-gmb-qa (fires independently in the create/
// rescan fan-out, not gated on commentary readiness - this is its own
// report section with its own render logic, not an input to main
// commentary). Fired in parallel below since each call took 6-8s in testing.
async function fetchProviderResponse(provider: string, model: string, query: string) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    const res = await fetch(`${DATAFORSEO_BASE}/ai_optimization/${provider}/llm_responses/live`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ user_prompt: query, model_name: model }]),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const json = await res.json()
    const task = json?.tasks?.[0]
    if (!res.ok || (task?.status_code && task.status_code !== 20000)) {
      throw new Error(`${task?.status_code ?? res.status} ${task?.status_message ?? ''}`.trim())
    }
    const result = task?.result?.[0] ?? null
    return {
      responseText: extractResponseText(result),
      cost: result?.money_spent ?? null,
      error: null as string | null,
    }
  } catch (e: any) {
    clearTimeout(timeout)
    const isTimeout = e.name === 'AbortError'
    return {
      responseText: null,
      cost: null,
      error: isTimeout ? 'Timed out after 45s' : (e.message ?? 'Unknown error'),
    }
  }
}

export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[dataforseo-llm-visibility] route hit — prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('brand_name, store_url, niche, location')
    .eq('id', prospect_id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { brand_name, store_url, niche, location } = prospect
  const query = buildLlmVisibilityQuery(niche, location)

  if (!query) {
    console.log('[dataforseo-llm-visibility] no niche text, skipping')
    return NextResponse.json({ success: true, skipped: 'no niche' })
  }

  console.log('[dataforseo-llm-visibility] query:', query)

  const results = await Promise.all(
    LLM_VISIBILITY_PROVIDERS.map(async ({ provider, model, label }) => {
      const { responseText, cost, error } = await fetchProviderResponse(provider, model, query)
      const { found, matchedSnippet } = detectMention(responseText, brand_name, store_url)
      if (error) console.error(`[dataforseo-llm-visibility] ${provider} failed:`, error)
      else console.log(`[dataforseo-llm-visibility] ${provider}: ${found ? 'mentioned' : 'not mentioned'}, cost $${cost}`)
      return {
        provider,
        model,
        label,
        query,
        response_text: responseText,
        found,
        matched_snippet: matchedSnippet,
        cost,
        fetched_at: new Date().toISOString(),
        error,
      }
    })
  )

  const { error: dbError } = await supabaseAdmin
    .from('audit_data_cache')
    .upsert({
      prospect_id,
      llm_visibility_results: results,
    }, { onConflict: 'prospect_id' })

  if (dbError) console.error('[dataforseo-llm-visibility] Supabase write error:', JSON.stringify(dbError))
  else console.log('[dataforseo-llm-visibility] Supabase write success')

  return NextResponse.json({ success: true, results: results.map(r => ({ provider: r.provider, found: r.found, error: r.error })) })
}
