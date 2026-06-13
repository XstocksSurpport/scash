import type { VercelRequest, VercelResponse } from '@vercel/node'
import { issueAdminToken, verifyAdminPassword } from '../lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  return res.status(200).json({ token: issueAdminToken() })
}
