import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAdminKey, readAdminKey } from '../lib/adminAuth.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const key = readAdminKey(req)
  const bodyPwd =
    req.body && typeof req.body === 'object' && typeof req.body.password === 'string'
      ? req.body.password.trim()
      : ''

  if (!verifyAdminKey(key) && !verifyAdminKey(bodyPwd)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  return res.status(200).json({ ok: true })
}
