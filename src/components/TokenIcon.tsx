import { useState } from 'react'
import type { Token } from '../data/tokens'

interface Props {
  token: Token
  size?: number
  showChainBadge?: boolean
}

export default function TokenIcon({ token, size = 32, showChainBadge = false }: Props) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className="token-icon-wrap"
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <img
          className="token-icon-img"
          src={token.logo}
          alt={token.symbol}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="token-icon-fallback"
          style={{ background: token.color, width: size, height: size, fontSize: size * 0.38 }}
        >
          {token.symbol.slice(0, 1)}
        </div>
      )}
      {showChainBadge && token.chainLogo && token.chain !== 'Scash' && (
        <img
          className="token-chain-badge"
          src={token.chainLogo}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
    </div>
  )
}
