import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJsonBody } from './lib/request.js'
import { scashRpc, scanAddressBalance } from './lib/rpc.js'

export const config = {
  maxDuration: 15,
}

async function handleBalance(req: VercelRequest, res: VercelResponse) {
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

async function handleUtxos(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const address = typeof req.query.address === 'string' ? req.query.address.trim() : ''
  if (!/^scash1[a-z0-9]{20,}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' })
  }

  try {
    const { utxos } = await scanAddressBalance(address)
    const mapped = utxos.map((u) => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.round(u.amount * 1e8),
      scriptPubKey: u.scriptPubKey,
    }))
    return res.status(200).json({ utxos: mapped })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'rpc failed' })
  }
}

async function handleFee(req: VercelRequest, res: VercelResponse) {
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

async function handleBroadcast(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const body = readJsonBody(req)
  const hex = typeof body.hex === 'string' ? body.hex.trim() : ''
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action =
    typeof req.query.action === 'string'
      ? req.query.action
      : typeof req.query.slug === 'string'
        ? req.query.slug
        : ''

  switch (action) {
    case 'balance':
      return handleBalance(req, res)
    case 'utxos':
      return handleUtxos(req, res)
    case 'fee':
      return handleFee(req, res)
    case 'broadcast':
      return handleBroadcast(req, res)
    default:
      return res.status(404).json({ error: 'unknown action' })
  }
}
