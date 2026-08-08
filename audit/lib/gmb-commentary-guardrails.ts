// Second guardrail layer for GMB review commentary. Stripping reviewer names
// from the model's input (see generate-gmb-commentary/route.ts) is the first
// layer; this checks the model's actual output before it's ever stored,
// rather than trusting the prompt instruction alone to hold every time.

function normaliseWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

// True if any run of `windowSize`+ consecutive words in `output` appears
// verbatim inside any of the source review texts - a sign the model quoted
// or closely paraphrased a specific review rather than describing a pattern.
export function hasVerbatimOverlap(output: string, reviewTexts: string[], windowSize = 8): boolean {
  const outputWords = normaliseWords(output)
  if (outputWords.length < windowSize) return false
  const reviewWordStrings = reviewTexts.map(t => normaliseWords(t).join(' '))
  for (let i = 0; i <= outputWords.length - windowSize; i++) {
    const window = outputWords.slice(i, i + windowSize).join(' ')
    if (reviewWordStrings.some(rw => rw.includes(window))) return true
  }
  return false
}

// True if `output` contains any name part (first name, last name, etc.,
// skipping short initials) from the given list of reviewer profile names.
// Belt-and-braces check - names were already stripped from the model's
// input, so this should only ever fire if the model invented or leaked one
// some other way.
export function hasNameLeak(output: string, profileNames: (string | null | undefined)[]): boolean {
  const lowerOutput = output.toLowerCase()
  return profileNames.some(name => {
    if (!name) return false
    const parts = name.toLowerCase().split(/\s+/).filter(p => p.length > 2)
    return parts.some(part => lowerOutput.includes(part))
  })
}

export function failsGuardrails(output: string, reviews: { profile_name?: string | null; review_text?: string | null }[]): boolean {
  const reviewTexts = reviews.map(r => r.review_text).filter((t): t is string => !!t)
  const profileNames = reviews.map(r => r.profile_name)
  return hasVerbatimOverlap(output, reviewTexts) || hasNameLeak(output, profileNames)
}
