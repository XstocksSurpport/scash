export interface ScashMarketPrices {
  scashUsdt: number
  ethUsdt: number
  btcUsdt: number
  source: string
  updatedAt: number
}

export const NONKYC_SCASH_MARKET_URL = 'https://nonkyc.io/market/SCASH_USDT'

export const FALLBACK_PRICES: ScashMarketPrices = {
  scashUsdt: 0.0257,
  ethUsdt: 1678.44,
  btcUsdt: 64011.9,
  source: NONKYC_SCASH_MARKET_URL,
  updatedAt: 0,
}

export function getTokenRateFromScash(symbol: string, prices: ScashMarketPrices): number {
  switch (symbol) {
    case 'USDT':
    case 'USDC':
    case 'DAI':
      return prices.scashUsdt
    case 'WETH':
      return prices.ethUsdt > 0 ? prices.scashUsdt / prices.ethUsdt : 0
    case 'WBTC':
      return prices.btcUsdt > 0 ? prices.scashUsdt / prices.btcUsdt : 0
    default:
      return prices.scashUsdt
  }
}
