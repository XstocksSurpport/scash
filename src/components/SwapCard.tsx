import { useMemo, useState } from 'react'
import {
  EVM_DEPOSIT_ADDRESS,
  OUTPUT_TOKENS,
  SCASH_TOKEN,
  type SwapDirection,
  type Token,
} from '../data/tokens'
import { useEvmWallet } from '../hooks/useEvmWallet'
import {
  generateOrderId,
  initiateSwap,
  isValidEvmAddress,
  isValidScashAddress,
  truncateAddress,
  type WalletState,
} from '../utils/wallet'
import TokenSelectModal, { TokenButton } from './TokenSelectModal'

interface Props {
  direction: SwapDirection
  onDirectionChange: (direction: SwapDirection) => void
  scashWallet: WalletState | null
  onConnectScash: () => void
}

export default function SwapCard({
  direction,
  onDirectionChange,
  scashWallet,
  onConnectScash,
}: Props) {
  const toScash = direction === 'to-scash'
  const evm = useEvmWallet()

  const [inputToken, setInputToken] = useState<Token>(OUTPUT_TOKENS[0])
  const [outputToken, setOutputToken] = useState<Token>(OUTPUT_TOKENS[0])
  const [inputAmount, setInputAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [tokenModalTarget, setTokenModalTarget] = useState<'from' | 'to' | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [recipientError, setRecipientError] = useState(false)

  const fromToken = toScash ? inputToken : SCASH_TOKEN
  const toToken = toScash ? SCASH_TOKEN : outputToken
  const selectableToken = toScash ? inputToken : outputToken

  const outputAmount = useMemo(() => {
    const val = parseFloat(inputAmount)
    if (isNaN(val) || val <= 0) return ''

    if (toScash) {
      return (val / inputToken.rateFromScash).toFixed(6)
    }

    const out = val * outputToken.rateFromScash
    if (outputToken.symbol === 'WETH' || outputToken.symbol === 'WBTC') {
      return out.toFixed(8)
    }
    return out.toFixed(6)
  }, [inputAmount, inputToken, outputToken, toScash])

  const rateText = useMemo(() => {
    if (toScash) {
      const r = 1 / inputToken.rateFromScash
      if (inputToken.symbol === 'WETH' || inputToken.symbol === 'WBTC') {
        return `1 ${inputToken.symbol} = ${r.toFixed(2)} SCASH`
      }
      return `1 ${inputToken.symbol} = ${r.toFixed(4)} SCASH`
    }

    const r = outputToken.rateFromScash
    if (outputToken.symbol === 'WETH') return `1 SCASH = ${r.toFixed(8)} WETH`
    if (outputToken.symbol === 'WBTC') return `1 SCASH = ${r.toFixed(8)} WBTC`
    return `1 SCASH = ${r.toFixed(4)} ${outputToken.symbol}`
  }, [inputToken, outputToken, toScash])

  const usdEstimate = useMemo(() => {
    const out = parseFloat(outputAmount || '0')
    if (!out) return '0.00'
    if (toScash) return (parseFloat(inputAmount || '0') || out * 0.027).toFixed(2)
    const mult =
      outputToken.symbol === 'WETH' ? 3200 : outputToken.symbol === 'WBTC' ? 97000 : 1
    return (out * mult).toFixed(2)
  }, [outputAmount, inputAmount, outputToken.symbol, toScash])

  const canSwap = useMemo(() => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return false
    if (!recipient) return false

    if (toScash) {
      return evm.authenticated && !!evm.address && isValidScashAddress(recipient)
    }

    return !!scashWallet && isValidEvmAddress(recipient)
  }, [inputAmount, recipient, toScash, evm.authenticated, evm.address, scashWallet])

  function flipDirection() {
    onDirectionChange(toScash ? 'from-scash' : 'to-scash')
    setInputAmount('')
    setRecipient('')
    setRecipientError(false)
  }

  async function handleSwap() {
    if (!canSwap) return

    if (toScash) {
      if (!isValidScashAddress(recipient)) {
        setRecipientError(true)
        return
      }
    } else if (!isValidEvmAddress(recipient)) {
      setRecipientError(true)
      return
    }

    setRecipientError(false)
    setSwapping(true)

    const id = generateOrderId()

    try {
      if (toScash) {
        await evm.sendToken(inputToken, inputAmount, EVM_DEPOSIT_ADDRESS)
      } else {
        const message = `${id}|${outputToken.symbol}|${outputToken.chainId}|${recipient}|${outputAmount}`
        await initiateSwap(inputAmount, message)
      }
    } finally {
      setSwapping(false)
    }
  }

  function getButtonText() {
    if (toScash) {
      if (!evm.ready) return '加载中...'
      if (!evm.authenticated) return '连接钱包'
    } else if (!scashWallet) {
      return '连接钱包'
    }
    if (!inputAmount || parseFloat(inputAmount) <= 0) return '输入金额'
    if (!recipient) return '输入收款地址'
    if (toScash && !isValidScashAddress(recipient)) return '收款地址无效'
    if (!toScash && !isValidEvmAddress(recipient)) return '收款地址无效'
    if (swapping) return '确认中...'
    return '兑换'
  }

  function openTokenModal(target: 'from' | 'to') {
    setTokenModalTarget(target)
  }

  function handleTokenSelect(token: Token) {
    if (tokenModalTarget === 'from') setInputToken(token)
    else setOutputToken(token)
  }

  async function handleConnectClick() {
    if (toScash) {
      await evm.connect()
      return
    }
    onConnectScash()
  }

  return (
    <>
      <div className="tabs">
        <div className="tab active">兑换</div>
        <div className="tab">流动性</div>
      </div>

      <div className="swap-card">
        <div className="card-header">
          <button className="settings-btn" title="设置">
            ⚙
          </button>
        </div>

        <div className="token-panel">
          <div className="panel-label">从</div>
          <div className="panel-row">
            <input
              className="amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={inputAmount}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || /^\d*\.?\d*$/.test(v)) setInputAmount(v)
              }}
            />
            {toScash ? (
              <TokenButton token={fromToken} onClick={() => openTokenModal('from')} showChainBadge />
            ) : (
              <TokenButton token={SCASH_TOKEN} disabled />
            )}
          </div>
          <div className="panel-footer">
            <span>{fromToken.chain}</span>
            {toScash && evm.address && <span>{truncateAddress(evm.address)}</span>}
            {!toScash && scashWallet && <span>{truncateAddress(scashWallet.address)}</span>}
          </div>
        </div>

        <div className="swap-arrow-wrap">
          <button className="swap-arrow-btn" onClick={flipDirection} type="button">
            ↕
          </button>
        </div>

        <div className="token-panel">
          <div className="panel-label">到</div>
          <div className="panel-row">
            <input
              className="amount-input"
              type="text"
              placeholder="0.0"
              value={outputAmount}
              readOnly
            />
            {toScash ? (
              <TokenButton token={SCASH_TOKEN} disabled />
            ) : (
              <TokenButton token={toToken} onClick={() => openTokenModal('to')} showChainBadge />
            )}
          </div>
          <div className="panel-footer">
            <span>{toToken.chain}</span>
            <span>≈ ${usdEstimate}</span>
          </div>
        </div>

        <div className="recipient-field">
          <input
            className={`recipient-input ${recipientError ? 'error' : ''}`}
            placeholder={
              toScash
                ? 'SCASH 收款地址 scash1...'
                : `${outputToken.symbol} 收款地址（${outputToken.chain}）0x...`
            }
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value)
              setRecipientError(false)
            }}
          />
        </div>

        <div className="rate-row">
          <span>汇率</span>
          <span className="rate-value">{rateText}</span>
        </div>

        <button
          className={`swap-action-btn ${canSwap ? 'ready' : ''}`}
          disabled={swapping || (toScash && !evm.ready)}
          onClick={() => {
            if (toScash ? !evm.authenticated : !scashWallet) {
              handleConnectClick()
              return
            }
            handleSwap()
          }}
        >
          {getButtonText()}
        </button>
      </div>

      {tokenModalTarget && (
        <TokenSelectModal
          selected={selectableToken}
          onSelect={handleTokenSelect}
          onClose={() => setTokenModalTarget(null)}
        />
      )}
    </>
  )
}
