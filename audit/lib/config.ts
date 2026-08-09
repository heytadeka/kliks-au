// Base path for the audit portal, must match basePath in next.config.js
// Used to prefix client-side fetch() calls so they resolve correctly
// when the app is mounted at /audit on the Vercel deployment.
export const BP = '/audit'

// Anthropic model used for all AI generation in the audit app (commentary, hook headline,
// score descriptions, priority list). Single source so a model retirement only needs one edit.
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5'

// Providers + models for the LLM Visibility Check (dataforseo-llm-visibility/route.ts).
// v1 fires all three; Gemini is deliberately held back until this proves out. Single
// source so a model swap (e.g. a provider retiring o4-mini) only needs one edit.
export const LLM_VISIBILITY_PROVIDERS = [
  { provider: 'chat_gpt', model: 'o4-mini', label: 'ChatGPT' },
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
