import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vercel serverless filesystem is read-only except /tmp
export const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'cubic-uploads')
  : path.join(__dirname, '../../uploads')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safe}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB
})
