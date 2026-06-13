import { DEPOSIT_ADDRESS } from '../data/tokens'
import {
  connectScashExtension,
  getScashProvider,
  sendViaScashExtension,
} from './scashProvider'

const STORAGE_KEY = 'scash_swap_wallet'

export interface WalletState {
  address: string
  walletType: string
  mode?: 'provider' | 'uri' | 'manual'
  txHash?: string
}

export function loadWallet(): WalletState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WalletState
  } catch {
    return null
  }
}

export function saveWallet(state: WalletState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearWallet(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

export function isValidScashAddress(addr: string): boolean {
  return /^scash1[a-z0-9]{20,}$/.test(addr)
}

export function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export async function connectExtension(): Promise<string | null> {
  return connectScashExtension()
}

export function buildPaymentUri(amount: string, message: string): string {
  const params = new URLSearchParams({
    amount,
    label: 'ScashSwap',
    message,
  })
  return `scash:${DEPOSIT_ADDRESS}?${params.toString()}`
}

export async function initiateSwap(amount: string, message: string): Promise<boolean> {
  const txid = await sendViaScashExtension(DEPOSIT_ADDRESS, amount, message)
  if (txid) return true

  if (getScashProvider()) {
    throw new Error('send failed')
  }

  window.location.href = buildPaymentUri(amount, message)
  return true
}

export function generateOrderId(): string {
  return `SW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}
