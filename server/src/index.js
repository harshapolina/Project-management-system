import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import { Server as SocketServer } from 'socket.io'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import './models/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { UPLOADS_DIR } from './middleware/upload.js'
import {
  resolveTenant,
  ensureDefaultTenant,
} from './middleware/tenant.js'
import authRoutes from './routes/auth.js'
import platformRoutes from './routes/platform.js'
import homeRoutes from './routes/home.js'
import projectRoutes from './routes/projects.js'
import taskRoutes from './routes/tasks.js'
import moduleRoutes from './routes/modules.js'
import mailRoutes from './routes/mail.js'
import calendarRoutes from './routes/calendar.js'
import spacesRoutes from './routes/spaces.js'
import channelsRoutes from './routes/channels.js'
import customFieldsRoutes from './routes/customFields.js'
import companyAdminRoutes from './routes/companyAdmin.js'
import impactRoutes from './routes/impact.js'
import inventoryRoutes from './routes/inventory.js'

dotenv.config()

function parseOrigins() {
  const raw =
    process.env.CLIENT_URL ||
    process.env.CLIENT_URLS ||
    'http://localhost:5173'
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const allowedOrigins = parseOrigins()

function corsOrigin(origin, callback) {
  // Allow non-browser tools (no Origin) and listed frontends
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true)
    return
  }
  // Allow *.editcomedia.com (and preview) subdomains when base domain listed
  try {
    if (origin) {
      const host = new URL(origin).hostname
      // Local development: allow any localhost port (Vite may shift 5173 -> 5174 …)
      if (host === 'localhost' || host === '127.0.0.1') {
        callback(null, true)
        return
      }
      if (
        host.endsWith('.editcomedia.com') ||
        host === 'editcomedia.com' ||
        host.endsWith('.vercel.app')
      ) {
        callback(null, true)
        return
      }
    }
  } catch {
    /* ignore */
  }
  callback(null, false)
}

const app = express()
const server = http.createServer(app)

const io = new SocketServer(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
})

app.set('io', io)

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'cubic-api' })
})

// Tenant resolution for all API routes (except health)
app.use('/api', resolveTenant)

app.use('/api/auth', authRoutes)
app.use('/api/platform', platformRoutes)
app.use('/api', homeRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/custom-fields', customFieldsRoutes)
app.use('/api/company-admin', companyAdminRoutes)
app.use('/api', moduleRoutes)
app.use('/api', impactRoutes)
app.use('/api', inventoryRoutes)
app.use('/api', mailRoutes)
app.use('/api', calendarRoutes)
app.use('/api', spacesRoutes)
app.use('/api', channelsRoutes)

io.on('connection', (socket) => {
  socket.on('join:project', (projectId) => {
    if (projectId) socket.join(`project:${projectId}`)
  })
  socket.on('join:user', (userId) => {
    if (userId) socket.join(`user:${userId}`)
  })
  socket.on('join:channel', (channelId) => {
    if (channelId) socket.join(`channel:${channelId}`)
  })
})

app.use(errorHandler)

const PORT = process.env.PORT || 5000

connectDB()
  .then(async () => {
    await ensureDefaultTenant()
    server.listen(PORT, () => {
      console.log(`Cubic API listening on :${PORT}`)
      console.log(`CORS origins: ${allowedOrigins.join(', ')}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start server', err)
    process.exit(1)
  })
