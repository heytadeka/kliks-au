// Was independently duplicated in PipelineClient.tsx, admin/new/page.tsx, and
// OutreachClient.tsx (all client-side, for slug-preview-as-you-type UX).
// Server routes need the same logic - shared here rather than a fourth copy.
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
