// Signed auth token helpers — Web Crypto only, so they work in both
// the edge runtime (middleware) and Node (API routes).

export const AUTH_COOKIE = 'oil_admin_auth'
const TOKEN_TTL_DAYS = 7

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('NEXTAUTH_SECRET must be set (at least 16 characters)')
  }
  return secret
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Token format: "<expiryEpochMs>.<hexHmacOfExpiry>" */
export async function createAuthToken(): Promise<string> {
  const exp = Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  return `${exp}.${await hmac(String(exp))}`
}

export async function verifyAuthToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const exp = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false

  let expected: string
  try {
    expected = await hmac(exp)
  } catch {
    return false // secret not configured — fail closed
  }
  if (sig.length !== expected.length) return false
  // Constant-time comparison
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
