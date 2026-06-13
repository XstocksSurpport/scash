import { useMemo, useState } from 'react'
import { OUTPUT_TOKENS, SCASH_TOKEN, type Token, tokenKey } from '../data/tokens'
import TokenIcon from './TokenIcon'

interface Props {
  selected: Token
  onSelect: (token: Token) => void
  onClose: () => void
}

const CHAINS = ['全部', ...Array.from(new Set(OUTPUT_TOKENS.map((t) => t.chain)))]

export default function TokenSelectModal({ selected, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [chain, setChain] = useState('全部')

  const filtered = useMemo(() => {
    return OUTPUT_TOKENS.filter((t) => {
      const matchChain = chain === '全部' || t.chain === chain
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.chain.toLowerCase().includes(q)
      return matchChain && matchSearch
    })
  }, [search, chain])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">选择代币</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <input
            className="search-input"
            placeholder="搜索名称 / 符号 / 链"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="chain-filter">
            {CHAINS.map((c) => (
              <button
                key={c}
                className={`chain-chip ${chain === c ? 'active' : ''}`}
                onClick={() => setChain(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {filtered.map((t) => (
            <button
              key={tokenKey(t)}
              className="token-list-item"
              onClick={() => {
                onSelect(t)
                onClose()
              }}
            >
              <TokenIcon token={t} size={40} showChainBadge />
              <div className="token-list-info">
                <div className="token-list-name">{t.symbol}</div>
                <div className="token-list-chain">{t.chain}</div>
              </div>
              {tokenKey(t) === tokenKey(selected) && (
                <span style={{ color: 'var(--accent)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TokenButton({
  token,
  onClick,
  disabled,
  showChainBadge,
}: {
  token: Token
  onClick?: () => void
  disabled?: boolean
  showChainBadge?: boolean
}) {
  return (
    <button
      className={`token-btn ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <TokenIcon token={token} size={32} showChainBadge={showChainBadge} />
      <span className="token-symbol">{token.symbol}</span>
      {!disabled && <span className="token-chevron">▼</span>}
    </button>
  )
}

export { SCASH_TOKEN }
