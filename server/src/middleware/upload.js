import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Legacy disk folder (old /uploads/* links only). New uploads use MongoDB GridFS. */
export const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'cubic-uploads')
  : path.join(__dirname, '../../uploads')

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
} catch {
  /* ignore */
}

const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB — Atlas free-tier friendly
})
