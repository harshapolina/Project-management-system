import { Notification } from '../models/Activity.js'
import { withTenant } from '../middleware/tenant.js'

/**
 * Persist a notification and push it live to the recipient's socket room.
 * Self-notifications are skipped so people never get alerted by their own action.
 */
export async function notifyUser(
  req,
  { userId, type, title, body = '', link = '', projectId, meta = {} },
) {
  if (!userId) return null
  const recipient = String(userId)
  if (req.user && recipient === String(req.user._id)) return null

  const notification = await Notification.create(
    withTenant(req, {
      userId: recipient,
      type,
      title,
      body,
      link,
      projectId: projectId || undefined,
      meta,
    }),
  )

  const io = req.app.get('io')
  if (io) {
    io.to(`user:${recipient}`).emit('notification:new', {
      _id: String(notification._id),
      type,
      title,
      body,
      link,
      meta,
      createdAt: notification.createdAt,
    })
  }

  return notification
}

export function actorSummary(user) {
  if (!user) return null
  return { name: user.name, avatar: user.avatar || '', role: user.role || '' }
}
