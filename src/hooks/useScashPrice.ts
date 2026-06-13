import { useCallback, useEffect, useState } from 'react'
import {
  FALLBACK_PRICES,
  getTokenRateFromScash,
  type ScashMarketPrices,
} from '../utils/scashPrice'
import type { Token } from '../data/tokens'

export function useScashPrice() {
  const [prices, setPrices] = useState<ScashMarketPrices>(FALLBACK_PRICES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/price/scash')
        if (!res.ok) return
        const data = (await res.json()) as ScashMarketPrices
        if (!cancelled && data.scashUsdt > 0) {
          setPrices(data)
        }
      } catch {
        // keep last price
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const rateFor = useCallback(
    (token: Token) => {
      const live = getTokenRateFromScash(token.symbol, prices)
      return live > 0 ? live : token.rateFromScash
    },
    [prices],
  )

  return { prices, loading, rateFor }
}
