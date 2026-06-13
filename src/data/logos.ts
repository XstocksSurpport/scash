export const TW =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains'

export const TOKEN_LOGOS = {
  SCASH: '/icons/scash.png',
  USDT: `${TW}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  USDC: `${TW}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
  DAI: `${TW}/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png`,
  WETH: `${TW}/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png`,
  WBTC: `${TW}/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png`,
} as const

export const CHAIN_LOGOS: Record<string, string> = {
  SCASH: '/icons/scash.png',
  以太坊: `${TW}/ethereum/info/logo.png`,
  'BNB 链': `${TW}/smartchain/info/logo.png`,
  Arbitrum: `${TW}/arbitrum/info/logo.png`,
  Polygon: `${TW}/polygon/info/logo.png`,
  Base: `${TW}/base/info/logo.png`,
  Avalanche: `${TW}/avalanchec/info/logo.png`,
}
