import type { Token } from '../data/tokens'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export async function switchToChain(provider: Eip1193Provider, chainId: number): Promise<void> {
  const hex = `0x${chainId.toString(16)}`
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hex }],
    })
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code !== 4902) throw err
    throw new Error('network not added')
  }
}

function toTokenUnits(amount: string, decimals: number): bigint {
  const normalized = amount.trim()
  if (!normalized || normalized === '.') return 0n
  const [whole = '0', fraction = ''] = normalized.split('.')
  const cleanWhole = whole.replace(/^0+(?=\d)/, '') || '0'
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(cleanWhole + padded)
}

function encodeTransferData(to: string, amount: bigint): string {
  const method = 'a9059cbb'
  const addr = to.replace(/^0x/i, '').toLowerCase().padStart(64, '0')
  const value = amount.toString(16).padStart(64, '0')
  return `0x${method}${addr}${value}`
}

export async function sendEvmTokenWithProvider(
  provider: Eip1193Provider,
  token: Token,
  amount: string,
  to: string,
  from: string,
): Promise<string> {
  if (!token.contract) throw new Error('no contract')

  await switchToChain(provider, token.chainId)

  const value = toTokenUnits(amount, token.decimals)
  const data = encodeTransferData(to, value)

  const hash = (await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: token.contract,
        data,
      },
    ],
  })) as string

  return hash
}
