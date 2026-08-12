import dotenv from 'dotenv'

dotenv.config()

let app
let ready

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const { connectDB } = await import('../src/config/db.js')
      const { ensureDefaultTenant } = await import('../src/middleware/tenant.js')
      const { createApp } = await import('../src/app.js')

      if (!process.env.MONGODB_URI) {
        const err = new Error(
          'MONGODB_URI is not set. Add it in Vercel → Project → Settings → Environment Variables.',
        )
        err.statusCode = 500
        throw err
      }

      await connectDB()
      // Lightweight tenant ensure only (skip heavy backfills on serverless cold start)
      await ensureDefaultTenant({ skipBackfill: process.env.VERCEL === '1' })
      ;({ app } = createApp({ enableSockets: false }))
    })().catch((err) => {
      ready = null
      throw err
    })
  }
  await ready
}

export default async function handler(req, res) {
  // Fast health probe — works even before DB if env is wrong
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/') {
    try {
      await ensureReady()
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: true,
          service: 'cubic-api',
          runtime: 'vercel',
        }),
      )
      return
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: false,
          runtime: 'vercel',
          error: err.message || 'Startup failed',
          hint: 'Check Vercel env vars: MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLIENT_URL',
        }),
      )
      return
    }
  }

  try {
    await ensureReady()
    return app(req, res)
  } catch (err) {
    res.statusCode = err.statusCode || 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: false,
        error: err.message || 'Internal Server Error',
      }),
    )
  }
}
