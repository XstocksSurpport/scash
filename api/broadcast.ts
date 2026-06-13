import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scashRpc } from './lib/rpc.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const hex = typeof req.body?.hex === 'string' ? req.body.hex.trim() : ''
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    return res.status(400).json({ error: 'invalid hex' })
  }

  try {
    const txid = await scashRpc<string>('sendrawtransaction', [hex])
    return res.status(200).json({ txid })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'broadcast failed' })
  }
}
