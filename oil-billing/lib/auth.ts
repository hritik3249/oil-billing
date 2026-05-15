// Simple cookie-based auth for admin

export const AUTH_COOKIE = 'oil_admin_auth'

export function setAuthCookie() {
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  document.cookie = `${AUTH_COOKIE}=true; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
}

export function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export function isLoggedIn(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${AUTH_COOKIE}=true`))
}
