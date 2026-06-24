// Base path for the audit portal, must match basePath in next.config.js
// Used to prefix client-side fetch() calls so they resolve correctly
// when the app is mounted at /audit on the Vercel deployment.
export const BP = '/audit'

// Anthropic model used for all AI generation in the audit app (commentary, hook headline,
// score descriptions, priority list). Single source so a model retirement only needs one edit.
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5'
