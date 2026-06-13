import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAdminToken } from '../lib/adminAuth'
import { loadRecords } from '../lib/store'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = req.headers['x-admin-token']
  const tokenStr = Array.isArray(token) ? token[0] : token
  if (!verifyAdminToken(tokenStr)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const records = await loadRecords()
    return res.status(200).json({ records })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'load failed' })
  }
}
