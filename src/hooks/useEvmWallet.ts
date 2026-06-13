import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useCallback, useMemo } from 'react'
import type { Token } from '../data/tokens'
import { sendEvmTokenWithProvider } from '../utils/evmWallet'

export function useEvmWallet() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()

  const activeWallet = useMemo(() => {
    return wallets.find((w) => w.walletClientType !== 'privy') ?? wallets[0]
  }, [wallets])

  const address = activeWallet?.address ?? null
  const chainId = activeWallet?.chainId ? Number(activeWallet.chainId) : null

  const connect = useCallback(async () => {
    await login({
      loginMethods: ['wallet'],
      walletChainType: 'ethereum-only',
    })
  }, [login])

  const sendToken = useCallback(
    async (token: Token, amount: string, to: string) => {
      if (!activeWallet) throw new Error('wallet not connected')
      const provider = await activeWallet.getEthereumProvider()
      return sendEvmTokenWithProvider(provider, token, amount, to, activeWallet.address)
    },
    [activeWallet],
  )

  return {
    ready,
    authenticated,
    address,
    chainId,
    connect,
    disconnect: logout,
    sendToken,
  }
}
