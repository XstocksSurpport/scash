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
