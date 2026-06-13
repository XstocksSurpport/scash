const RPC_URL = process.env.SCASH_RPC_URL ?? 'https://explorer.scash.network/api/rpc'
const RPC_USER = process.env.SCASH_RPC_USER ?? 'scash'
const RPC_PASS = process.env.SCASH_RPC_PASS ?? 'scash'

export async function scashRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64')
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}`)
  }

  const data = (await res.json()) as { result?: T; error?: { message?: string } }
  if (data.error) {
    throw new Error(data.error.message ?? 'RPC error')
  }
  return data.result as T
}

export interface ScanResult {
  success: boolean
  unspents: Array<{
    txid: string
    vout: number
    scriptPubKey: string
    amount: number
  }>
  total_amount: number
}

export async function scanAddressBalance(address: string): Promise<{ balanceSats: number; utxos: ScanResult['unspents'] }> {
  const result = await scashRpc<ScanResult>('scantxoutset', ['start', [`addr(${address})`]])
  const balanceSats = Math.round((result.total_amount ?? 0) * 1e8)
  const utxos = (result.unspents ?? []).map((u) => ({
    txid: u.txid,
    vout: u.vout,
    scriptPubKey: u.scriptPubKey,
    amount: u.amount,
  }))

  return { balanceSats, utxos }
}
