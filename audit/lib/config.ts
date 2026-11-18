// Base path for the audit portal, must match basePath in next.config.js
// Used to prefix client-side fetch() calls so they resolve correctly
// when the app is mounted at /audit on the Vercel deployment.
export const BP = '/audit'

// Anthropic model used for all AI generation in the audit app (commentary, hook headline,
// score descriptions, priority list). Single source so a model retirement only needs one edit.
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5'

// Providers + models for the LLM Visibility Check (dataforseo-llm-visibility/route.ts).
// v1 fires all three; Gemini is deliberately held back until this proves out. Single
// source so a model swap only needs one edit. Every model here must be on DataForSEO's
// /v3/ai_optimization/{provider}/llm_responses/models list: a name that has left it is
// rejected with task error 40501, the route stores that as an error, and the report then
// silently hides that assistant (o4-mini did exactly this, found 2026-11-18).
export const LLM_VISIBILITY_PROVIDERS = [
  { provider: 'chat_gpt', model: 'gpt-5.4-mini', label: 'ChatGPT' },
  { provider: 'claude', model: 'claude-sonnet-5', label: 'Claude' },
  { provider: 'perplexity', model: 'sonar', label: 'Perplexity' },
] as const

// Fallback market qualifier for buildLlmVisibilityQuery() (lib/llm-visibility.ts)
// when niche/location don't resolve to a known AU city - kliks.com.au only serves
// Australian prospects for now, so a single constant is enough (no per-audit market
// field). Without any geographic qualifier an LLM defaults toward whatever's most
// prominent in its training data, usually US/UK brands - meaningless for judging how
// an Australian shopper's AI assistant treats an Australian business.
export const LLM_VISIBILITY_MARKET = 'Australia'
