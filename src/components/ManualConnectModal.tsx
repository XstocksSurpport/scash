import { useState } from 'react'
import { DEPOSIT_ADDRESS } from '../data/tokens'
import { copyText, isValidScashAddress, saveWallet, type WalletState } from '../utils/wallet'

interface Props {
  onClose: () => void
  onConnect: (wallet: WalletState) => void
}

function isValidTxHash(hash: string): boolean {
  const v = hash.trim()
  return /^[a-fA-F0-9]{32,64}$/.test(v)
}

export default function ManualConnectModal({ onClose, onConnect }: Props) {
  const [address, setAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copyText(DEPOSIT_ADDRESS)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function handleSubmit() {
    if (!isValidScashAddress(address.trim())) {
      setError('收款地址无效')
      return
    }
    if (!isValidTxHash(txHash)) {
      setError('转账哈希无效')
      return
    }

    const state: WalletState = {
      address: address.trim(),
      walletType: '手动',
      mode: 'manual',
      txHash: txHash.trim(),
    }
    saveWallet(state)
    onConnect(state)
    onClose()
  }

  return (
    <div className="modal-overlay manual-overlay" onClick={onClose}>
      <div className="modal manual-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">无法连接</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="manual-tip">
            请将需要兑换的资金转入资金池地址，将自动向您返回等额目标代币
          </p>
          <div className="manual-field">
            <div className="manual-label">资金池地址</div>
            <div className="manual-address-row">
              <span className="manual-address">{DEPOSIT_ADDRESS}</span>
              <button type="button" className="payment-copy" onClick={handleCopy}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <input
            className="recipient-input manual-input"
            placeholder="收款地址 scash1..."
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
              setError('')
            }}
          />

          <input
            className="recipient-input manual-input"
            placeholder="转账哈希"
            value={txHash}
            onChange={(e) => {
              setTxHash(e.target.value)
              setError('')
            }}
          />

          {error && <div className="wallet-error">{error}</div>}

          <button type="button" className="swap-action-btn ready manual-submit" onClick={handleSubmit}>
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
