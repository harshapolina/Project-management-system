import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { Channel } from '../models/Channel.js'
import { Project } from '../models/Project.js'

/**
 * Attach authenticated user to every socket connection.
 * Clients must pass access token via handshake.auth.token.
 */
export function registerSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers?.authorization || '')
          .replace(/^Bearer\s+/i, '')
          .trim()

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
      const user = await User.findById(payload.sub).select(
        '_id name email role tenantId isActive isPlatformAdmin',
      )
      if (!user || !user.isActive) {
        return next(new Error('User not found'))
      }

      socket.data.user = user
      socket.data.userId = String(user._id)
      socket.data.tenantId = user.tenantId ? String(user.tenantId) : null
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })
}

/**
 * Secure room joins — never trust client-supplied user ids.
 */
export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.userId
    const tenantId = socket.data.tenantId

    // Always join own private room
    socket.join(`user:${userId}`)
    if (tenantId) socket.join(`tenant:${tenantId}`)

    socket.on('join:channel', async (channelId) => {
      try {
        if (!channelId) return
        const channel = await Channel.findById(channelId).select(
          'members tenantId isPrivate',
        )
        if (!channel) return
        if (
          tenantId &&
          channel.tenantId &&
          String(channel.tenantId) !== tenantId &&
          !socket.data.user?.isPlatformAdmin
        ) {
          return
        }
        const isMember = (channel.members || []).some(
          (m) => String(m) === userId,
        )
        if (channel.isPrivate && !isMember) return
        socket.join(`channel:${channelId}`)
      } catch {
        /* ignore */
      }
    })

    socket.on('leave:channel', (channelId) => {
      if (channelId) socket.leave(`channel:${channelId}`)
    })

    socket.on('join:project', async (projectId) => {
      try {
        if (!projectId) return
        const project = await Project.findById(projectId).select(
          'tenantId members projectManager clientId',
        )
        if (!project) return
        if (
          tenantId &&
          project.tenantId &&
          String(project.tenantId) !== tenantId &&
          !socket.data.user?.isPlatformAdmin
        ) {
          return
        }
        const memberIds = [
          ...(project.members || []).map((m) => String(m.user || m)),
          project.projectManager ? String(project.projectManager) : '',
          project.clientId ? String(project.clientId) : '',
        ].filter(Boolean)
        const elevated = ['admin', 'owner', 'hr'].includes(
          socket.data.user?.role,
        )
        if (
          !elevated &&
          !socket.data.user?.isPlatformAdmin &&
          !memberIds.includes(userId)
        ) {
          return
        }
        socket.join(`project:${projectId}`)
      } catch {
        /* ignore */
      }
    })

    // Reject legacy spoofed joins
    socket.on('join:user', () => {
      /* no-op — room is auto-joined from token */
    })
  })
}
