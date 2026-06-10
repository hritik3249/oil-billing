import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, createAuthToken } from '@/lib/auth-token'

// In-memory rate limit: 5 failed attempts per IP per 15 minutes.
// Resets on server restart / new serverless instance, which is acceptable
// as a brute-force speed bump for a single-admin app.
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const failures = new Map<string, { count: number; first: number }>()

function isRateLimited(ip: string): boolean {
  const entry = failures.get(ip)
  if (!entry) return false
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(ip)
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}

function recordFailure(ip: string) {
  const entry = failures.get(ip)
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(ip, { count: 1, first: Date.now() })
  } else {
    entry.count++
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      )
    }

    const { username, password } = await req.json()
    const adminUser = process.env.ADMIN_USERNAME
    const adminPass = process.env.ADMIN_PASSWORD

    // Fail closed: no env vars means no login, never a default password
    if (!adminUser || !adminPass) {
      return NextResponse.json(
        { success: false, error: 'Server not configured (ADMIN_USERNAME / ADMIN_PASSWORD missing)' },
        { status: 500 }
      )
    }

    if (username === adminUser && password === adminPass) {
      failures.delete(ip)
      const token = await createAuthToken()
      const res = NextResponse.json({ success: true })
      res.cookies.set(AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days, matches token expiry
        path: '/',
      })
      return res
    }

    recordFailure(ip)
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete(AUTH_COOKIE)
  return res
}
