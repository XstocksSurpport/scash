import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readAdminKey, verifyAdminKey } from './lib/adminAuth.js'
import { readJsonBody } from './lib/request.js'
import { loadRecords } from './lib/store.js'

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

function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const key = readAdminKey(req)
  const body = readJsonBody(req)
  const bodyPwd = typeof body.password === 'string' ? body.password.trim() : ''

  if (!verifyAdminKey(key) && !verifyAdminKey(bodyPwd)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  return res.status(200).json({ ok: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : ''
  if (action === 'login') {
    return handleLogin(req, res)
  }
  return handleRecords(req, res)
}
