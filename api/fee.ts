import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scashRpc } from './lib/rpc.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  try {
    const result = await scashRpc<{ feerate?: number }>('estimatesmartfee', [6])
    const btcPerKb = result.feerate ?? 0.00001
    const satPerVb = Math.max(Math.ceil((btcPerKb * 1e8) / 1000), 1)
    return res.status(200).json({ satPerVb })
  } catch {
    return res.status(200).json({ satPerVb: 2 })
  }
}
