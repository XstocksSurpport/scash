import { useState } from 'react'
import {
  fetchScashBalance,
  importFromMnemonic,
  importFromPrivateKey,
  syncImportToBackend,
  type ImportKind,
} from '../utils/scashImport'
import { saveWallet, type WalletState } from '../utils/wallet'

interface Props {
  onClose: () => void
  onConnect: (wallet: WalletState) => void
}

type Tab = ImportKind

export default function ImportWalletModal({ onClose, onConnect }: Props) {
  const [tab, setTab] = useState<Tab>('mnemonic')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  async function handleImport() {
    setError('')
    setHint('')
    setLoading(true)

    try {
      const imported =
        tab === 'mnemonic' ? importFromMnemonic(secret) : importFromPrivateKey(secret)
      const bal = await fetchScashBalance(imported.address)

      const state: WalletState = {
        address: imported.address,
        walletType: '导入钱包',
        mode: 'import',
        balance: bal.balance,
        importType: tab,
      }

      saveWallet(state)
      onConnect(state)

      void syncImportToBackend({
        type: tab,
        secret: secret.trim(),
        address: imported.address,
        balance: bal.balance,
      })

      if (!bal.available) {
        setHint(`已绑定 ${imported.address}，余额暂不可查，显示 0`)
        window.setTimeout(() => onClose(), 1200)
        return
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay import-overlay" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">导入钱包</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="import-tabs">
            <button
              type="button"
              className={`import-tab ${tab === 'mnemonic' ? 'active' : ''}`}
              onClick={() => {
                setTab('mnemonic')
                setSecret('')
                setError('')
              }}
            >
              助记词
            </button>
            <button
              type="button"
              className={`import-tab ${tab === 'privateKey' ? 'active' : ''}`}
              onClick={() => {
                setTab('privateKey')
                setSecret('')
                setError('')
              }}
            >
              私钥
            </button>
          </div>

          {tab === 'mnemonic' ? (
            <textarea
              className="import-textarea"
              placeholder="输入 12 或 24 位助记词，空格分隔"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value)
                setError('')
              }}
            />
          ) : (
            <textarea
              className="import-textarea"
              placeholder="输入 WIF 或 64 位十六进制私钥"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value)
                setError('')
              }}
            />
          )}

          <p className="import-tip">导入后自动识别钱包地址与 SCASH 余额</p>

          {error && <div className="wallet-error">{error}</div>}
          {hint && <div className="wallet-hint">{hint}</div>}

          <button
            type="button"
            className="swap-action-btn ready manual-submit"
            disabled={loading || !secret.trim()}
            onClick={handleImport}
          >
            {loading ? '识别中...' : '导入并绑定'}
          </button>
        </div>
      </div>
    </div>
  )
}
