import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleRecords } from '../cp-records.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleRecords(req, res)
}
