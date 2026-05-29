import { cookies } from 'next/headers'

export function getAuditCookie(slug: string): boolean {
  const cookieStore = cookies()
  return cookieStore.get(`audit_${slug}_auth`)?.value === 'true'
}

export function getAdminCookie(): boolean {
  const cookieStore = cookies()
  return !!cookieStore.get('audit_admin_auth')?.value
}
