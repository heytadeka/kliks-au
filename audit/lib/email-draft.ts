// Cold-email draft generation - originally built into Pipeline's "Create
// Audit & Generate Email" flow (PipelineClient.tsx) and its per-row "View
// Email" action for already-converted domains. Extracted here so the Audits
// detail panel and Outreach's detail modal can offer the same "generate a
// reach-out email" action on demand, for a prospect in any stage, instead of
// a second independently-written copy of this copy.

export type EmailDraft = {
  platform: string
  brand_name: string
  prospect_name: string
  prospect_email: string | null
  slug: string
}

export function emailBody(platform: string, brandName: string, prospectName: string, slug: string, email: string | null): string {
  const accessLine = email ? `Access code: ${email}` : `Access code: [their email address]`
  if (platform === 'squarespace') {
    return `Hey ${prospectName},

Pulled your site this week.

Mobile load time is worth looking at - and there are a few conversion gaps worth knowing about.

Put together what an upgrade could look like for you: kliks.com.au/audit/${slug}
${accessLine}

Worth 10 minutes.

Adam`
  }
  return `Hey ${prospectName},

Spent some time looking at ${brandName} this week.
A few things worth knowing about.

Put it together here: kliks.com.au/audit/${slug}
${accessLine}

Worth 10 minutes.

Adam`
}

export function emailSubject(platform: string, brandName: string): string {
  return platform === 'squarespace' ? `your ${brandName} site` : `your ${brandName} audit`
}
