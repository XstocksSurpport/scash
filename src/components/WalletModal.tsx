import { useState } from 'react'
import { TOKEN_LOGOS } from '../data/logos'
import { WALLET_OPTIONS } from '../data/tokens'
import {
  connectExtension,
  isValidScashAddress,
  saveWallet,
  truncateAddress,
  type WalletState,
} from '../utils/wallet'
import {
  bootstrapScashProviders,
  getScashProvider,
  SCASH_EXTENSION_URL,
} from '../utils/scashProvider'
import ManualConnectModal from './ManualConnectModal'

interface Props {
  onClose: () => void
  onConnect: (wallet: WalletState) => void
}

export default function WalletModal({ onClose, onConnect }: Props) {
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  async function handleWallet(id: string, name: string) {
    setError('')
    setHint('')
    setLoading(id)

    if (id === 'scash-extension') {
      try {
        bootstrapScashProviders()
        const address = await connectExtension()
        if (address && isValidScashAddress(address)) {
          const state: WalletState = { address, walletType: name, mode: 'provider' }
          saveWallet(state)
          onConnect(state)
          onClose()
          return
        }

        if (getScashProvider()) {
          setError('连接被拒绝')
        } else {
          setError('未检测到扩展')
          setHint('打开 SCASH 扩展 → 允许本站访问 → 再次点击连接')
        }
      } catch {
        setError('连接失败')
        setHint('打开 SCASH 扩展 → 允许本站访问 → 再次点击连接')
      } finally {
        setLoading(null)
      }
      return
    }

    if (id === 'scash-web') {
      window.open('https://wallet.scash.network/', '_blank')
      setLoading(null)
      return
    }

    if (id === 'scash-core') {
      window.open('https://scashnetwork.org/', '_blank')
      setLoading(null)
      return
    }

    setLoading(null)
  }

  function handleManualConnect(wallet: WalletState) {
    onConnect(wallet)
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">连接钱包</div>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="modal-section-label">SCASH 钱包</div>
            <div className="wallet-list">
              {WALLET_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  className="wallet-option"
                  disabled={loading === w.id}
                  onClick={() => handleWallet(w.id, w.name)}
                >
                  <div className="wallet-option-icon">
                    <img src={TOKEN_LOGOS.SCASH} alt="SCASH" />
                  </div>
                  <div className="wallet-option-info">
                    <div className="wallet-option-name">{w.name}</div>
                    <div className="wallet-option-desc">{w.desc}</div>
                  </div>
                  {loading === w.id ? (
                    <span className="wallet-option-loading">···</span>
                  ) : (
                    <span className="wallet-option-arrow">→</span>
                  )}
                </button>
              ))}
            </div>

            <div className="wallet-actions-row">
              <button
                className="wallet-action-link"
                type="button"
                onClick={() => setShowManual(true)}
              >
                无法连接？
              </button>
              <a
                className="wallet-action-link"
                href={SCASH_EXTENSION_URL}
                target="_blank"
                rel="noreferrer"
              >
                安装扩展
              </a>
            </div>

            {error && <div className="wallet-error">{error}</div>}
            {hint && <div className="wallet-hint">{hint}</div>}
          </div>
        </div>
      </div>

      {showManual && (
        <ManualConnectModal
          onClose={() => setShowManual(false)}
          onConnect={handleManualConnect}
        />
      )}
    </>
  )
}

export function WalletButton({
  wallet,
  onConnectClick,
  onDisconnect,
}: {
  wallet: WalletState | null
  onConnectClick: () => void
  onDisconnect: () => void
}) {
  if (!wallet) {
    return (
      <button className="connect-btn" onClick={onConnectClick}>
        连接钱包
      </button>
    )
  }

  return (
    <button
      className="connect-btn connected"
      onClick={onDisconnect}
      title={wallet.address}
    >
      {truncateAddress(wallet.address)}
    </button>
  )
}
