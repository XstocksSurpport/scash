import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readAdminKey, verifyAdminKey } from './lib/adminAuth'
import { loadRecords } from './lib/store'

export async function handleRecords(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const key = readAdminKey(req)
  if (!verifyAdminKey(key)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const records = await loadRecords()
    return res.status(200).json({ records })
  } catch (err) {
    return res.status(200).json({
      records: [],
      warning: err instanceof Error ? err.message : 'load failed',
    })
  }
}

export default handleRecords
