import type { VercelRequest } from '@vercel/node'

export function readJsonBody(req: VercelRequest): Record<string, unknown> {
  const raw = req.body

  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as Record<string, unknown>
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

export function readPassword(req: VercelRequest): string {
  const auth = req.headers.authorization
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }

  const body = readJsonBody(req)
  if (typeof body.password === 'string') return body.password.trim()
  if (typeof body.pwd === 'string') return body.pwd.trim()

  const queryPassword = req.query.password
  if (typeof queryPassword === 'string') return queryPassword.trim()

  return ''
}
