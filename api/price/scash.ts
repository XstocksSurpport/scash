import type { VercelRequest, VercelResponse } from '@vercel/node'

const NONKYC_API = 'https://nonkyc.io/api/v2/ticker'
const NONKYC_MARKET = 'https://nonkyc.io/market/SCASH_USDT'

interface TickerResponse {
  last_price?: string
}

async function fetchTicker(market: string): Promise<number> {
  const res = await fetch(`${NONKYC_API}/${market}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`ticker ${market} failed`)
  const data = (await res.json()) as TickerResponse
  const price = Number(data.last_price)
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`invalid price for ${market}`)
  }
  return price
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')

  try {
    const [scashUsdt, ethUsdt, btcUsdt] = await Promise.all([
      fetchTicker('SCASH_USDT'),
      fetchTicker('ETH_USDT'),
      fetchTicker('BTC_USDT'),
    ])

    return res.status(200).json({
      scashUsdt,
      ethUsdt,
      btcUsdt,
      source: NONKYC_MARKET,
      updatedAt: Date.now(),
    })
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'price fetch failed',
    })
  }
}
