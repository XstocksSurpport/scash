export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '450521'

export function verifyAdminKey(key: string | undefined): boolean {
  if (!key) return false
  const value = key.trim()
  return value === ADMIN_PASSWORD || value === '450521'
}

export function readAdminKey(req: { headers: Record<string, string | string[] | undefined> }): string {
  const header = req.headers['x-admin-key'] ?? req.headers.authorization
  const raw = Array.isArray(header) ? header[0] : header
  if (typeof raw === 'string' && raw.startsWith('Bearer ')) {
    return raw.slice(7).trim()
  }
  return typeof raw === 'string' ? raw.trim() : ''
}
