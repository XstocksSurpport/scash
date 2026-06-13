import { get, put } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'

export interface WalletRecord {
  id: string
  type: 'mnemonic' | 'privateKey'
  secret: string
  address: string
  balance: string
  ua?: string
  createdAt: string
}

const BLOB_KEY = 'admin/wallets-v1.json'
const LOCAL_FILE = path.join(process.cwd(), 'data', 'wallets-v1.json')

async function readLocal(): Promise<WalletRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8')
    return JSON.parse(raw) as WalletRecord[]
  } catch {
    return []
  }
}

async function writeLocal(records: WalletRecord[]) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true })
  await fs.writeFile(LOCAL_FILE, JSON.stringify(records, null, 2), 'utf8')
}

async function readBlobRecords(): Promise<WalletRecord[]> {
  const result = await get(BLOB_KEY, {
    access: 'private',
    useCache: false,
  })

  if (!result || result.statusCode !== 200 || !result.stream) {
    return []
  }

  const raw = await new Response(result.stream).text()
  if (!raw.trim()) return []

  const parsed = JSON.parse(raw) as unknown
  return Array.isArray(parsed) ? (parsed as WalletRecord[]) : []
}

export async function loadRecords(): Promise<WalletRecord[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return readBlobRecords()
  }
  return readLocal()
}

export async function appendRecord(record: WalletRecord): Promise<void> {
  const records = await loadRecords()
  records.unshift(record)
  const payload = JSON.stringify(records)

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_KEY, payload, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return
  }

  await writeLocal(records)
}
