import { CHAIN_LOGOS, TOKEN_LOGOS } from './logos'

export interface Token {
  symbol: string
  name: string
  chain: string
  chainId: number
  logo: string
  chainLogo?: string
  color: string
  decimals: number
  rateFromScash: number
  contract?: string
}

export const SCASH_TOKEN: Token = {
  symbol: 'SCASH',
  name: 'Satoshi Cash',
  chain: 'SCASH',
  chainId: 0,
  logo: TOKEN_LOGOS.SCASH,
  chainLogo: CHAIN_LOGOS.Scash,
  color: '#FFB237',
  decimals: 8,
  rateFromScash: 1,
}

function out(
  symbol: keyof typeof TOKEN_LOGOS,
  name: string,
  chain: string,
  chainId: number,
  decimals: number,
  rateFromScash: number,
  color: string,
  contract?: string,
): Token {
  return {
    symbol,
    name,
    chain,
    chainId,
    logo: TOKEN_LOGOS[symbol],
    chainLogo: CHAIN_LOGOS[chain],
    color,
    decimals,
    rateFromScash,
    contract,
  }
}

export const OUTPUT_TOKENS: Token[] = [
  out('USDT', 'Tether USD', '以太坊', 1, 6, 0.0257, '#26A17B', '0xdAC17F958D2ee523a2206206994597C13D831ec7'),
  out('USDC', 'USD Coin', '以太坊', 1, 6, 0.0257, '#2775CA', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  out('USDT', 'Tether USD', 'BNB 链', 56, 18, 0.0257, '#26A17B', '0x55d398326f99059fF775485246999027B3197955'),
  out('USDC', 'USD Coin', 'BNB 链', 56, 18, 0.0257, '#2775CA', '0x8AC76a51cc950d9822D68b83fE1Ad97B32CD580d'),
  out('USDT', 'Tether USD', 'Arbitrum', 42161, 6, 0.0257, '#26A17B', '0xFd086bC7CD5C481DCC9DCcE0e1eB70295eC41cB2'),
  out('USDC', 'USD Coin', 'Arbitrum', 42161, 6, 0.0257, '#2775CA', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
  out('USDT', 'Tether USD', 'Polygon', 137, 6, 0.0257, '#26A17B', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'),
  out('USDC', 'USD Coin', 'Polygon', 137, 6, 0.0257, '#2775CA', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'),
  out('USDC', 'USD Coin', 'Base', 8453, 6, 0.0257, '#2775CA', '0x833589fCD6eDb6E08f4c7C32D6f7b3bD6921EF99'),
  out('USDT', 'Tether USD', 'Avalanche', 43114, 6, 0.0257, '#26A17B', '0x9702230C8Ae9a625F12D9E460634745414B6808'),
  out('USDC', 'USD Coin', 'Avalanche', 43114, 6, 0.0257, '#2775CA', '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'),
  out('DAI', 'Dai Stablecoin', '以太坊', 1, 18, 0.0257, '#F5AC37', '0x6B175474E89094C44Da98b954EedeAC495271d0F'),
  out('WETH', 'Wrapped Ether', '以太坊', 1, 18, 0.0000089, '#627EEA', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
  out('WBTC', 'Wrapped BTC', '以太坊', 1, 8, 0.00000025, '#F7931A', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'),
]

export function tokenKey(t: Token): string {
  return `${t.symbol}-${t.chain}-${t.chainId}`
}

export const DEPOSIT_ADDRESS = 'scash1q6m9xejt8syjn8dzwws4kfdntqcc8mcvazxeqg4'

export const EVM_DEPOSIT_ADDRESS = '0xcE2453acd77F10907e97FCFB3e2E1fd63097e798'

export type SwapDirection = 'from-scash' | 'to-scash'

export const WALLET_OPTIONS = [
  {
    id: 'scash-import',
    name: '导入钱包',
    desc: '私钥或助记词',
    url: '',
  },
  {
    id: 'scash-web',
    name: 'SCASH 网页钱包',
    desc: '在线钱包',
    url: 'https://wallet.scash.network/',
  },
  {
    id: 'scash-core',
    name: 'Scash Core',
    desc: '桌面节点钱包',
    url: 'https://scashnetwork.org/',
  },
]
