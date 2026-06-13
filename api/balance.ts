import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scanAddressBalance } from '../lib/rpc'

export const config = {
  maxDuration: 15,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const address = typeof req.query.address === 'string' ? req.query.address.trim() : ''
  if (!/^scash1[a-z0-9]{20,}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' })
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  try {
    const { balanceSats } = await scanAddressBalance(address)
    return res.status(200).json({
      balance: (balanceSats / 1e8).toFixed(8),
      balanceSats,
      available: true,
    })
  } catch (err) {
    return res.status(200).json({
      balance: '0.00000000',
      balanceSats: 0,
      available: false,
      error: err instanceof Error ? err.message : 'rpc failed',
    })
  }
}
