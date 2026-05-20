import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const adminUser = process.env.ADMIN_USERNAME || 'admin'
    const adminPass = process.env.ADMIN_PASSWORD || 'oilbiz2024'

    if (username === adminUser && password === adminPass) {
      const res = NextResponse.json({ success: true })
      res.cookies.set('oil_admin_auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      return res
    }
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('oil_admin_auth')
  return res
}
