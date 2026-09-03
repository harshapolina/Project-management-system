import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import { ensureDefaultTenant } from './middleware/tenant.js'
import { createApp, allowedOrigins } from './app.js'
import { startDeadlineScheduler } from './lib/deadlineReminders.js'

dotenv.config()

const { app, server } = createApp({ enableSockets: true })

const PORT = process.env.PORT || 5000

connectDB()
  .then(async () => {
    await ensureDefaultTenant()
    server.listen(PORT, () => {
      console.log(`Cubic API listening on :${PORT}`)
      console.log(`CORS origins: ${allowedOrigins.join(', ')}`)
      startDeadlineScheduler(app)
    })
  })
  .catch((err) => {
    console.error('Failed to start server', err)
    process.exit(1)
  })

export default app
