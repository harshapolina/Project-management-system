import { Task } from '../models/Task.js'
import { Tenant } from '../models/Tenant.js'
import {
  eventPref,
  getMailSettings,
  buildNotificationEmail,
  sendTenantMail,
  listAdminUserIds,
} from './mailer.js'
import { Notification } from '../models/Activity.js'

/**
 * Scan open tasks whose due date is within the configured window and notify
 * assignee / assigner / admins per MailSettings.deadline prefs.
 * Idempotent for ~20h via a meta.deadlineKey on notifications.
 */
export async function runDeadlineReminders(app) {
  const tenants = await Tenant.find({
    status: { $in: ['trial', 'active'] },
  })
    .select('_id name')
    .lean()

  const now = new Date()
  let sent = 0

  for (const tenant of tenants) {
    try {
      const settings = await getMailSettings(tenant._id)
      const pref = eventPref(settings, 'deadline')
      if (pref.popup === false && pref.email === false) continue

      const days = Number(pref.daysBefore) || 1
      const windowEnd = new Date(now.getTime() + days * 86400000)

      const tasks = await Task.find({
        tenantId: tenant._id,
        status: { $ne: 'done' },
        dueDate: { $gte: now, $lte: windowEnd },
        assignee: { $ne: null },
      })
        .select('title dueDate assignee createdBy projectId')
        .lean()

      const admins =
        pref.notifyAdmins !== false
          ? await listAdminUserIds(tenant._id)
          : []

      for (const task of tasks) {
        const dayKey = new Date(task.dueDate).toISOString().slice(0, 10)
        const deadlineKey = `${task._id}:${dayKey}`

        const recipients = new Map()
        if (pref.notifyTarget !== false && task.assignee) {
          recipients.set(String(task.assignee), 'assignee')
        }
        if (pref.notifyActor !== false && task.createdBy) {
          recipients.set(String(task.createdBy), 'assigner')
        }
        for (const a of admins) {
          recipients.set(String(a._id), 'admin')
        }

        for (const [userId] of recipients) {
          const already = await Notification.findOne({
            tenantId: tenant._id,
            userId,
            type: 'deadline',
            'meta.deadlineKey': deadlineKey,
          })
            .select('_id')
            .lean()
          if (already) continue

          const dueLabel = new Date(task.dueDate).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          const title = 'Task deadline approaching'
          const body = `“${task.title}” is due ${dueLabel}`
          const link = task.projectId
            ? `/projects/${task.projectId}/tasks`
            : '/my-work'

          if (pref.popup !== false) {
            const notification = await Notification.create({
              tenantId: tenant._id,
              userId,
              type: 'deadline',
              title,
              body,
              link,
              projectId: task.projectId || undefined,
              meta: { deadlineKey, taskId: String(task._id), taskTitle: task.title },
            })
            const io = app.get('io')
            if (io) {
              io.to(`user:${userId}`).emit('notification:new', {
                _id: String(notification._id),
                type: 'deadline',
                title,
                body,
                link,
                meta: notification.meta,
                createdAt: notification.createdAt,
              })
            }
          }

          if (pref.email !== false && settings.enabled) {
            const { User } = await import('../models/User.js')
            const user = await User.findById(userId).select('email').lean()
            if (user?.email) {
              const mail = buildNotificationEmail({
                title,
                body,
                link,
                workspaceName: tenant.name,
              })
              await sendTenantMail(tenant._id, {
                to: user.email,
                subject: mail.subject,
                text: mail.text,
                html: mail.html,
              }).catch((err) =>
                console.warn('[mail] deadline email failed:', err.message),
              )
            }
          }
          sent += 1
        }
      }
    } catch (err) {
      console.warn('[deadlines] tenant scan failed:', err.message)
    }
  }

  return sent
}

export function startDeadlineScheduler(app) {
  const tick = () => {
    runDeadlineReminders(app).catch((err) =>
      console.warn('[deadlines] run failed:', err.message),
    )
  }
  // First run shortly after boot, then every 6 hours
  setTimeout(tick, 45_000)
  setInterval(tick, 6 * 60 * 60 * 1000)
}
