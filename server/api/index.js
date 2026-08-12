import dotenv from 'dotenv'
import { connectDB } from '../src/config/db.js'
import { ensureDefaultTenant } from '../src/middleware/tenant.js'
import { createApp } from '../src/app.js'

dotenv.config()

// Socket.IO / long-lived websockets are not supported on Vercel serverless.
const { app } = createApp({ enableSockets: false })

let ready

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await connectDB()
      await ensureDefaultTenant()
    })()
  }
  await ready
}

export default async function handler(req, res) {
  await ensureReady()
  return app(req, res)
}
