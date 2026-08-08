import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ANTHROPIC_MODEL } from '@/lib/config'
import { failsGuardrails } from '@/lib/gmb-commentary-guardrails'

export const maxDuration = 60

const REVIEW_SAMPLE_SIZE = 25

// Additive, decoupled from main commentary generation (same precedent as
// generate-commentary's own main+priority-list two-call pattern). Fired
// specifically off the reviews webhook once gmb_reviews lands - never part
// of the commentary readiness gate, and a slow or failed run here must
// never block anything else.
export async function POST(req: NextRequest) {
  const { prospect_id } = await req.json()
  console.log('[generate-gmb-commentary] starting for prospect_id:', prospect_id ?? 'missing')

  if (!prospect_id) return NextResponse.json({ error: 'Missing prospect_id' }, { status: 400 })

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('brand_name')
    .eq('id', prospect_id)
    .single()

  const { data: cache } = await supabaseAdmin
    .from('audit_data_cache')
    .select('gmb_data, gmb_reviews')
    .eq('prospect_id', prospect_id)
    .single()

  const gmbData = cache?.gmb_data as any
  const reviews = (cache?.gmb_reviews as any[] | null) ?? []

  if (!prospect || !gmbData?.found || reviews.length === 0) {
    console.log('[generate-gmb-commentary] nothing to generate from (no prospect, no gmb match, or no reviews) - skipping')
    return NextResponse.json({ success: true, skipped: true })
  }

  // Strip everything except rating + text before this ever reaches the
  // model - the first guardrail layer. profile_name, profile_image_url,
  // owner_answer (can contain names or dispute detail) never get built
  // into the prompt in the first place, same reasoning as Phase 3's
  // render decision to not surface owner_answer either.
  const sample = [...reviews]
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, REVIEW_SAMPLE_SIZE)
    .map((r: any) => ({ rating: r.rating?.value ?? null, text: r.review_text ?? null }))
    .filter(r => r.text)

  if (sample.length === 0) {
    console.log('[generate-gmb-commentary] no reviews had text - skipping')
    return NextResponse.json({ success: true, skipped: true })
  }

  const systemPrompt = `You are Adam Nagy, founder of Kliks Digital, a boutique Shopify growth agency. You are writing honest, founder-to-founder commentary about a prospect's Google reviews for their growth audit report.

CRITICAL RULE, follow this exactly: you must never quote, restate, closely paraphrase, or otherwise reference any specific review's content, and you must never name or otherwise identify any individual reviewer, even indirectly. Only describe patterns across the review set as a whole. If no genuine pattern is present, say so rather than inventing one or generalising from a single review.

Never use em dashes. Use commas or hyphens instead. No bullet points. Direct, calm, plain language, no fluff.`

  const reviewList = sample.map((r, i) => `${i + 1}. [${r.rating ?? '?'}/5] "${r.text}"`).join('\n')

  const userPrompt = `Store: ${prospect.brand_name}
Google rating: ${gmbData.rating ?? 'unknown'}/5 from ${gmbData.review_count ?? 'unknown'} reviews total (this is the real, official total from Google - not the size of the sample below, which is just the ${sample.length} most recent for pattern-finding).

Recent reviews (rating and text only):
${reviewList}

Generate exactly two fields as JSON:
{
  "rating_framing": "one to two sentences",
  "review_patterns": "one to two sentences, or null if no genuine pattern emerges"
}

Rules for rating_framing:
- One to two sentences, honest, founder-to-founder tone
- Branch on the REAL rating and review count given above, never invent a supporting statistic or percentage that isn't in the data
- If the review count is roughly under 10-15, this isn't enough reviews to be a trust signal either way yet - frame it as an opportunity to build review volume, not as a verdict on quality
- If the rating is 4.5+ with a real review count, this is a genuine asset - say so plainly, straightforward trust-signal language
- If the rating is roughly 3.8 to 4.4, this is solid - honest "good shape" framing, no oversell
- If the rating is below roughly 3.8 with a real review count, state it plainly and constructively - never spin it as a strength, never harsh

Rules for review_patterns:
- One to two sentences on recurring themes only, e.g. "delivery timing comes up as a recurring theme"
- Never restate, summarise, quote, or reference any specific review, complaint, or dispute
- Never name or imply identification of any specific reviewer
- If the reviews are too varied or too few to genuinely generalise, return null for this field rather than manufacture a pattern

Respond with only valid JSON. No markdown. No explanation.`

  async function generateOnce(): Promise<{ rating_framing: string | null; review_patterns: string | null } | null> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      if (!res.ok) {
        console.error('[generate-gmb-commentary] Anthropic API error:', res.status, await res.text())
        return null
      }
      const apiData = await res.json()
      const rawText: string = apiData.content?.[0]?.text ?? ''
      const cleaned = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        rating_framing: typeof parsed.rating_framing === 'string' ? parsed.rating_framing : null,
        review_patterns: typeof parsed.review_patterns === 'string' ? parsed.review_patterns : null,
      }
    } catch (e: any) {
      console.error('[generate-gmb-commentary] generation attempt failed:', e.message)
      return null
    }
  }

  try {
    const attempt = await generateOnce()

    // Guardrail check (second layer, after generation). Each field checked
    // independently against the actual review sample. Any failure on either
    // field triggers one full regeneration; whichever field(s) still fail
    // after that are suppressed (stored null) rather than retried again or
    // stored risky - no output beats wrong output.
    let ratingFraming = attempt?.rating_framing ?? null
    let reviewPatterns = attempt?.review_patterns ?? null

    const ratingFailedCheck = ratingFraming != null && failsGuardrails(ratingFraming, sample.map(s => ({ review_text: s.text })))
    const patternsFailedCheck = reviewPatterns != null && failsGuardrails(reviewPatterns, sample.map(s => ({ review_text: s.text })))

    if (ratingFailedCheck || patternsFailedCheck) {
      console.warn('[generate-gmb-commentary] guardrail check failed on first attempt, regenerating once')
      const retry = await generateOnce()
      const retryRating = retry?.rating_framing ?? null
      const retryPatterns = retry?.review_patterns ?? null

      ratingFraming = ratingFailedCheck
        ? (retryRating != null && !failsGuardrails(retryRating, sample.map(s => ({ review_text: s.text }))) ? retryRating : null)
        : ratingFraming
      reviewPatterns = patternsFailedCheck
        ? (retryPatterns != null && !failsGuardrails(retryPatterns, sample.map(s => ({ review_text: s.text }))) ? retryPatterns : null)
        : reviewPatterns

      if (ratingFailedCheck && ratingFraming == null) console.warn('[generate-gmb-commentary] rating_framing suppressed after second guardrail failure')
      if (patternsFailedCheck && reviewPatterns == null) console.warn('[generate-gmb-commentary] review_patterns suppressed after second guardrail failure')
    }

    const { error: dbError } = await supabaseAdmin
      .from('audit_content')
      .update({ ai_gmb_commentary: { rating_framing: ratingFraming, review_patterns: reviewPatterns } })
      .eq('prospect_id', prospect_id)

    if (dbError) console.error('[generate-gmb-commentary] Supabase write error:', JSON.stringify(dbError))
    else console.log('[generate-gmb-commentary] saved for prospect_id:', prospect_id, 'rating_framing:', ratingFraming != null, 'review_patterns:', reviewPatterns != null)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[generate-gmb-commentary] unexpected error:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
