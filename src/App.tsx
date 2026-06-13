import { useEffect, useState, lazy, Suspense } from 'react'
import { TOKEN_LOGOS } from './data/logos'
import type { SwapDirection } from './data/tokens'
import { useEvmWallet } from './hooks/useEvmWallet'
import AppPrivyProvider from './providers/AppPrivyProvider'
import SwapCard from './components/SwapCard'
import WalletModal, { WalletButton } from './components/WalletModal'
import { clearWallet, loadWallet, truncateAddress, type WalletState } from './utils/wallet'
import { bootstrapScashProviders } from './utils/scashProvider'
import { clearImportSecrets } from './utils/scashImport'
import { isAdminRoute } from './config/adminRoute'

const AdminPanel = lazy(() => import('./components/AdminPanel'))

function AppContent() {
  const [direction, setDirection] = useState<SwapDirection>('from-scash')
  const [scashWallet, setScashWallet] = useState<WalletState | null>(() => loadWallet())
  const [showScashModal, setShowScashModal] = useState(false)
  const [adminMode, setAdminMode] = useState(() => isAdminRoute())
  const evm = useEvmWallet()

  useEffect(() => {
    bootstrapScashProviders()
  }, [])

  useEffect(() => {
    const onHash = () => setAdminMode(isAdminRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const toScash = direction === 'to-scash'

  function handleDisconnect() {
    if (toScash) {
      evm.disconnect()
    } else {
      clearWallet()
      clearImportSecrets()
      setScashWallet(null)
    }
  }

  if (adminMode) {
    return (
      <Suspense fallback={<div className="admin-shell">加载中...</div>}>
        <AdminPanel />
      </Suspense>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <img src={TOKEN_LOGOS.SCASH} alt="SCASH" />
            </div>
            <span>scash swap</span>
          </div>
          <nav className="nav">
            <a className="nav-item active" href="#">
              兑换
            </a>
            <a className="nav-item" href="#">
              流动性
            </a>
            <a className="nav-item" href="https://explorer.scash.network/" target="_blank" rel="noreferrer">
              区块浏览器
            </a>
          </nav>
        </div>
        {toScash ? (
          <button
            className={`connect-btn ${evm.authenticated ? 'connected' : ''}`}
            onClick={() => {
              if (evm.authenticated) {
                handleDisconnect()
              } else {
                evm.connect()
              }
            }}
            title={evm.address ?? undefined}
          >
            {evm.authenticated && evm.address
              ? truncateAddress(evm.address)
              : '连接钱包'}
          </button>
        ) : (
          <WalletButton
            wallet={scashWallet}
            onConnectClick={() => setShowScashModal(true)}
            onDisconnect={handleDisconnect}
          />
        )}
      </header>

      <main className="main">
        <div className="swap-wrapper">
          <SwapCard
            direction={direction}
            onDirectionChange={setDirection}
            scashWallet={scashWallet}
            onConnectScash={() => setShowScashModal(true)}
          />
        </div>
      </main>

      <div className="footer-bar">SCASH · RandomX · 2100 万</div>

      {showScashModal && (
        <WalletModal
          onClose={() => setShowScashModal(false)}
          onConnect={setScashWallet}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppPrivyProvider>
      <AppContent />
    </AppPrivyProvider>
  )
}
