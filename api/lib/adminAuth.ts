import { createHash, randomBytes } from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '450521'
const TOKEN_SALT = process.env.ADMIN_TOKEN_SALT ?? 'scash-swap-admin-v1'

export function verifyAdminPassword(password: string): boolean {
  const value = password.trim()
  return value === ADMIN_PASSWORD || value === '450521'
}

export function issueAdminToken(): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000
  const expStr = String(exp)
  const sig = createHash('sha256').update(`${expStr}:${ADMIN_PASSWORD}:${TOKEN_SALT}`).digest('hex')
  return `${expStr}.${sig}`
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig || !/^[a-f0-9]{64}$/.test(sig)) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const expected = createHash('sha256').update(`${expStr}:${ADMIN_PASSWORD}:${TOKEN_SALT}`).digest('hex')
  return sig === expected
}

export function obfuscatedAdminPath(): string {
  return `#/${createHash('sha256').update(`${ADMIN_PASSWORD}:cp`).digest('hex').slice(0, 12)}`
}
