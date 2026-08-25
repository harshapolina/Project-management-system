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

/** Path only — Vercel rewrites can bring a query string along. */
function pathOf(req) {
  const raw = req.url || '/'
  const i = raw.indexOf('?')
  const path = i === -1 ? raw : raw.slice(0, i)
  // strip a trailing slash so "/api/" and "/api" behave the same
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

const STATUS_PATHS = new Set(['/', '/api', '/health', '/api/health', '/index'])

export default async function handler(req, res) {
  // Fast health probe — works even before DB if env is wrong. Matched on the
  // path rather than the raw url, because the catch-all rewrite in vercel.json
  // means the root arrives as "/api" rather than "/".
  if (STATUS_PATHS.has(pathOf(req))) {
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
    console.error('[api] request failed before Express could answer', err)
    // Never let the function exit without a response — that surfaces as
    // FUNCTION_INVOCATION_FAILED, which tells the reader nothing.
    if (res.headersSent) {
      res.end()
      return
    }
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
