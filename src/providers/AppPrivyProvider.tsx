import { PrivyProvider } from '@privy-io/react-auth'
import type { ReactNode } from 'react'
import { arbitrum, avalanche, base, bsc, mainnet, polygon } from 'viem/chains'
import { PRIVY_APP_ID } from '../config/privy'

const SUPPORTED_CHAINS = [mainnet, bsc, arbitrum, polygon, base, avalanche]

export default function AppPrivyProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet'],
        defaultChain: mainnet,
        supportedChains: SUPPORTED_CHAINS,
        appearance: {
          theme: 'dark',
          accentColor: '#1fc7d4',
          walletChainType: 'ethereum-only',
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
