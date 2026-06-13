export const SCASH_EXTENSION_ID = 'depmcfopjjbogpekdnegegifhkihanpl'

export const SCASH_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/scash-wallet/depmcfopjjbogpekdnegegifhkihanpl'

export interface ScashProvider {
  requestAccounts: () => Promise<string[]>
  sendPayment: (to: string, amount: string, message?: string) => Promise<string>
}

type AnyRecord = Record<string, unknown>

declare global {
  interface Window {
    scash?: AnyRecord
    SCASH?: AnyRecord
    scashWallet?: AnyRecord
    ScashWallet?: AnyRecord
    $scash?: AnyRecord
    scashProvider?: AnyRecord
    ScashProvider?: AnyRecord
    wbip_providers?: Array<{
      id?: string
      name?: string
      provider?: AnyRecord
      methods?: string[]
    }>
  }
}

const PROVIDER_KEYS = [
  'scash',
  'SCASH',
  'scashWallet',
  'ScashWallet',
  '$scash',
  'scashProvider',
  'ScashProvider',
] as const

const REQUEST_EVENTS = [
  'wbip:requestProvider',
  'scash:requestProvider',
  'scash#requestProvider',
  'scash#connect',
  'SCASH_WALLET_CONNECT',
  'scash:connect',
  'scashwallet:connect',
]

const READY_EVENTS = [
  'wbip:announceProvider',
  'scash:provider',
  'scash#initialized',
  'SCASH_WALLET_READY',
  'scash:ready',
]

const EXT_INPAGE_PATHS = [
  'inpage.js',
  'provider.js',
  'inject.js',
  'scripts/inpage.js',
  'scripts/provider.js',
  'next-assets/inpage.js',
]

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const list = value.filter((item): item is string => typeof item === 'string')
  return list.length ? list : null
}

function pickAddress(value: unknown): string | null {
  if (typeof value === 'string' && value.startsWith('scash1')) return value
  if (Array.isArray(value)) return asStringArray(value)?.[0] ?? null
  if (value && typeof value === 'object') {
    const obj = value as AnyRecord
    if (typeof obj.address === 'string') return obj.address
    if (Array.isArray(obj.accounts)) return asStringArray(obj.accounts)?.[0] ?? null
    if (Array.isArray(obj.result)) return asStringArray(obj.result)?.[0] ?? null
    if (obj.data && typeof obj.data === 'object') {
      return pickAddress(obj.data)
    }
  }
  return null
}

async function callProviderMethod(
  provider: AnyRecord,
  names: string[],
  params: unknown[] = [],
): Promise<unknown> {
  for (const name of names) {
    const fn = provider[name]
    if (typeof fn === 'function') {
      return fn.apply(provider, params.length ? params : [])
    }
  }

  if (typeof provider.request === 'function') {
    for (const method of names) {
      try {
        return await provider.request.call(provider, { method, params })
      } catch {
        try {
          return await provider.request.call(provider, method, ...params)
        } catch {
          try {
            return await provider.request.call(provider, method, params[0] ?? {})
          } catch {
            // continue
          }
        }
      }
    }
  }

  throw new Error('method not found')
}

function normalizeProvider(raw: AnyRecord): ScashProvider | null {
  const hasConnect =
    typeof raw.requestAccounts === 'function' ||
    typeof raw.connect === 'function' ||
    typeof raw.enable === 'function' ||
    typeof raw.getAccounts === 'function' ||
    typeof raw.getAddresses === 'function' ||
    typeof raw.request === 'function'

  const hasSend =
    typeof raw.sendScash === 'function' ||
    typeof raw.sendBitcoin === 'function' ||
    typeof raw.sendTransaction === 'function' ||
    typeof raw.transfer === 'function' ||
    typeof raw.request === 'function'

  if (!hasConnect && !hasSend) return null

  return {
    async requestAccounts() {
      const attempts: unknown[] = []

      for (const name of ['requestAccounts', 'connect', 'enable', 'getAccounts', 'getAddresses']) {
        const fn = raw[name]
        if (typeof fn === 'function') {
          attempts.push(await fn.call(raw))
        }
      }

      if (typeof raw.request === 'function') {
        for (const method of [
          'requestAccounts',
          'scash_requestAccounts',
          'getAccounts',
          'getAddresses',
          'connect',
          'scash_connect',
        ]) {
          try {
            attempts.push(await callProviderMethod(raw, [method]))
          } catch {
            // continue
          }
        }
      }

      for (const attempt of attempts) {
        const accounts = asStringArray(attempt)
        if (accounts?.length) return accounts
        const address = pickAddress(attempt)
        if (address) return [address]
      }

      throw new Error('no accounts')
    },

    async sendPayment(to: string, amount: string, message?: string) {
      const numericAmount = Number(amount)
      const sats = Math.round(numericAmount * 1e8)
      const payload = { to, amount, value: amount, message, label: 'ScashSwap', memo: message }

      if (typeof raw.sendScash === 'function') {
        return String(await raw.sendScash.call(raw, to, amount, { message }))
      }
      if (typeof raw.sendBitcoin === 'function') {
        try {
          return String(await raw.sendBitcoin.call(raw, to, sats))
        } catch {
          return String(await raw.sendBitcoin.call(raw, to, numericAmount))
        }
      }
      if (typeof raw.sendTransaction === 'function') {
        return String(await raw.sendTransaction.call(raw, payload))
      }
      if (typeof raw.transfer === 'function') {
        return String(await raw.transfer.call(raw, payload))
      }
      if (typeof raw.request === 'function') {
        for (const method of [
          'sendScash',
          'sendBitcoin',
          'sendTransaction',
          'transfer',
          'scash_send',
        ]) {
          try {
            const res = await callProviderMethod(raw, [method], [payload])
            if (typeof res === 'string') return res
            if (res && typeof res === 'object' && typeof (res as AnyRecord).txid === 'string') {
              return (res as AnyRecord).txid as string
            }
          } catch {
            try {
              const res = await callProviderMethod(raw, [method], [to, amount, message])
              if (typeof res === 'string') return res
            } catch {
              // continue
            }
          }
        }
      }

      throw new Error('send not supported')
    },
  }
}

function resolveGlobalProvider(id: string | undefined): AnyRecord | null {
  if (!id) return null
  const root = window as unknown as AnyRecord
  if (root[id] && typeof root[id] === 'object') return root[id] as AnyRecord

  const parts = id.split('.')
  let current: unknown = window
  for (const part of parts) {
    if (!current || typeof current !== 'object') return null
    current = (current as AnyRecord)[part]
  }
  return current && typeof current === 'object' ? (current as AnyRecord) : null
}

function getWbipProvider(): ScashProvider | null {
  const entries = window.wbip_providers
  if (!Array.isArray(entries)) return null

  for (const entry of entries) {
    const label = `${entry.id ?? ''} ${entry.name ?? ''}`.toLowerCase()
    if (entry.id && !label.includes('scash') && !label.includes('satosh')) {
      continue
    }

    if (entry.provider) {
      const provider = normalizeProvider(entry.provider)
      if (provider) return provider
    }

    const globalProvider = resolveGlobalProvider(entry.id)
    if (globalProvider) {
      const provider = normalizeProvider(globalProvider)
      if (provider) return provider
    }
  }
  return null
}

function getNestedProvider(): ScashProvider | null {
  for (const key of PROVIDER_KEYS) {
    const raw = window[key]
    if (!raw || typeof raw !== 'object') continue

    const direct = normalizeProvider(raw as AnyRecord)
    if (direct) return direct

    const nested = (raw as AnyRecord).provider ?? (raw as AnyRecord).bitcoin
    if (nested && typeof nested === 'object') {
      const provider = normalizeProvider(nested as AnyRecord)
      if (provider) return provider
    }
  }
  return getWbipProvider()
}

export function getScashProvider(): ScashProvider | null {
  return getNestedProvider()
}

function dispatchConnectEvents() {
  for (const name of REQUEST_EVENTS) {
    window.dispatchEvent(new CustomEvent(name, { detail: { source: 'scash-swap' } }))
  }
}

function injectExtensionScripts() {
  for (const path of EXT_INPAGE_PATHS) {
    const src = `chrome-extension://${SCASH_EXTENSION_ID}/${path}`
    if (document.querySelector(`script[data-scash-bridge="${src}"]`)) continue
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.scashBridge = src
    script.onerror = () => script.remove()
    document.documentElement.appendChild(script)
  }
}

export function bootstrapScashProviders() {
  dispatchConnectEvents()
  injectExtensionScripts()
}

export async function waitForScashProvider(maxWaitMs = 15000): Promise<ScashProvider | null> {
  bootstrapScashProviders()

  const existing = getScashProvider()
  if (existing) return existing

  return new Promise((resolve) => {
    let settled = false
    const finish = (provider: ScashProvider | null) => {
      if (settled) return
      settled = true
      for (const name of READY_EVENTS) {
        window.removeEventListener(name, onReady as EventListener)
      }
      window.removeEventListener('message', onMessage)
      clearInterval(timer)
      clearTimeout(timeout)
      resolve(provider)
    }

    const onReady = () => finish(getScashProvider())

    for (const name of READY_EVENTS) {
      window.addEventListener(name, onReady as EventListener)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data as AnyRecord | null
      if (!data || typeof data !== 'object') return
      const type = typeof data.type === 'string' ? data.type.toLowerCase() : ''
      const target = typeof data.target === 'string' ? data.target.toLowerCase() : ''
      if (
        type.includes('scash') ||
        target.includes('scash') ||
        data.source === 'scash-wallet' ||
        data.source === SCASH_EXTENSION_ID
      ) {
        if (getScashProvider()) finish(getScashProvider())
      }
    }
    window.addEventListener('message', onMessage)

    const timer = window.setInterval(() => {
      bootstrapScashProviders()
      const provider = getScashProvider()
      if (provider) finish(provider)
    }, 250)

    const timeout = window.setTimeout(() => finish(getScashProvider()), maxWaitMs)
  })
}

async function connectViaEventBridge(): Promise<string | null> {
  return new Promise((resolve) => {
    const eventId = crypto.randomUUID()
    let settled = false
    let timeout = 0

    const finish = (address: string | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('scash:provider', onProvider as EventListener)
      window.removeEventListener('wbip:announceProvider', onProvider as EventListener)
      window.removeEventListener(eventId, onResponse as EventListener)
      clearTimeout(timeout)
      resolve(address)
    }

    const onProvider = (event: Event) => {
      const detail = (event as CustomEvent).detail as AnyRecord | undefined
      const nested = detail?.detail as AnyRecord | undefined
      const data = detail?.data as AnyRecord | undefined
      const providerRaw = detail?.provider ?? nested?.provider ?? data?.provider ?? detail
      if (providerRaw && typeof providerRaw === 'object') {
        const provider = normalizeProvider(providerRaw as AnyRecord)
        if (provider) {
          provider
            .requestAccounts()
            .then((accounts) => finish(accounts[0] ?? null))
            .catch(() => finish(null))
          return
        }
      }
      const address = pickAddress(detail)
      if (address) finish(address)
    }

    const onResponse = (event: Event) => {
      const detail = (event as CustomEvent).detail as AnyRecord | undefined
      if (detail?.error) {
        finish(null)
        return
      }
      const address = pickAddress(detail?.data ?? detail?.result ?? detail)
      if (address) finish(address)
    }

    window.addEventListener('scash:provider', onProvider as EventListener)
    window.addEventListener('wbip:announceProvider', onProvider as EventListener)
    window.addEventListener(eventId, onResponse as EventListener)

    window.dispatchEvent(
      new CustomEvent('scash:connect', {
        detail: {
          eventId,
          extensionId: SCASH_EXTENSION_ID,
          method: 'scash:connect',
          origin: window.location.origin,
        },
      }),
    )

    timeout = window.setTimeout(() => finish(null), 8000)
  })
}

async function postMessageRequest(method: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()

    const handler = (event: MessageEvent) => {
      const data = event.data as AnyRecord | null
      if (!data || typeof data !== 'object') return

      const sameId = data.id === id || data.requestId === id
      const fromScash =
        typeof data.source === 'string' && data.source.toLowerCase().includes('scash')
      const scashType = typeof data.type === 'string' && data.type.toLowerCase().includes('scash')

      if (!sameId && !fromScash && !scashType) return

      window.removeEventListener('message', handler)
      if (data.error) {
        reject(new Error(String(data.error)))
        return
      }
      resolve(data.result ?? data.data ?? data.accounts ?? data.address ?? data)
    }

    window.addEventListener('message', handler)

    const targets = [
      'scash-wallet',
      'SCASH_WALLET',
      'scash',
      'scash-provider',
      'SCASH',
      'scashWallet',
      SCASH_EXTENSION_ID,
    ]

    for (const target of targets) {
      window.postMessage(
        {
          target,
          source: 'scash-swap',
          type: 'SCASH_WALLET_REQUEST',
          id,
          method,
          params,
        },
        '*',
      )
    }

    window.setTimeout(() => {
      window.removeEventListener('message', handler)
      reject(new Error('timeout'))
    }, 5000)
  })
}

export async function connectScashExtension(): Promise<string | null> {
  openScashExtensionPopup()
  bootstrapScashProviders()

  const provider = await waitForScashProvider(12000)
  if (provider) {
    try {
      const accounts = await provider.requestAccounts()
      return accounts[0] ?? null
    } catch {
      // continue
    }
  }

  const eventAddress = await connectViaEventBridge()
  if (eventAddress) return eventAddress

  try {
    const res = await postMessageRequest('requestAccounts')
    const accounts = asStringArray(res)
    if (accounts?.[0]) return accounts[0]
    const address = pickAddress(res)
    if (address) return address
  } catch {
    // continue
  }

  try {
    const res = await postMessageRequest('connect')
    const address = pickAddress(res)
    if (address) return address
  } catch {
    // continue
  }

  return null
}

export async function sendViaScashExtension(
  to: string,
  amount: string,
  message?: string,
): Promise<string | null> {
  const provider = getScashProvider() ?? (await waitForScashProvider(5000))
  if (provider) {
    return provider.sendPayment(to, amount, message)
  }

  try {
    const res = await postMessageRequest('sendScash', [{ to, amount, message }])
    if (typeof res === 'string') return res
    if (res && typeof res === 'object' && typeof (res as AnyRecord).txid === 'string') {
      return (res as AnyRecord).txid as string
    }
  } catch {
    // continue
  }

  return null
}

export function isExtensionPossiblyInstalled(): boolean {
  return PROVIDER_KEYS.some((key) => window[key] !== undefined) || !!getScashProvider()
}

export function openScashExtensionPopup() {
  window.open(`chrome-extension://${SCASH_EXTENSION_ID}/index.html`, '_blank', 'noopener,noreferrer')
}
