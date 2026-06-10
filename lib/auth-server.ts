import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { AUTH_COOKIE, verifyAuthToken } from './auth-token'

/** For server components (layouts/pages) */
export async function isAuthenticated(): Promise<boolean> {
  return verifyAuthToken(cookies().get(AUTH_COOKIE)?.value)
}

/** For API route handlers */
export async function checkAuth(req: NextRequest): Promise<boolean> {
  return verifyAuthToken(req.cookies.get(AUTH_COOKIE)?.value)
}
