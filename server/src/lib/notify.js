import { Notification } from '../models/Activity.js'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import { withTenant } from '../middleware/tenant.js'
import {
  buildNotificationEmail,
  eventPref,
  getMailSettings,
  listAdminUserIds,
  sendTenantMail,
} from './mailer.js'

/**
 * Persist a notification, push a live popup (when enabled), and optionally
 * send email via the workspace SMTP settings.
 */
export async function notifyUser(
  req,
  {
    userId,
    type,
    title,
    body = '',
    link = '',
    projectId,
    meta = {},
    /** Force channels; otherwise uses MailSettings.events[type] */
    forcePopup,
    forceEmail,
    /** Skip email even if prefs say yes */
    skipEmail = false,
  } = {},
) {
  if (!userId) return null
  const recipient = String(userId)
  if (req.user && recipient === String(req.user._id)) return null

  const tenantId = req.tenantId || req.user?.tenantId
  const settings = tenantId ? await getMailSettings(tenantId) : null
  const pref = eventPref(settings, type)

  const wantPopup = forcePopup !== undefined ? forcePopup : pref.popup !== false
  const wantEmail =
    !skipEmail && (forceEmail !== undefined ? forceEmail : pref.email !== false)

  let notification = null
  if (wantPopup) {
    notification = await Notification.create(
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
  }

  if (wantEmail && tenantId) {
    try {
      const user = await User.findById(recipient).select('email name').lean()
      if (user?.email) {
        const tenant = await Tenant.findById(tenantId).select('name').lean()
        const mail = buildNotificationEmail({
          title,
          body,
          link,
          workspaceName: tenant?.name,
        })
        await sendTenantMail(tenantId, {
          to: user.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        })
      }
    } catch (err) {
      console.warn('[mail] failed to send notification email:', err.message)
    }
  }

  return notification
}

/**
 * Fan-out for task assignment: assignee, assigner (actor), and admins —
 * each gated by MailSettings event prefs.
 */
export async function notifyTaskAssignment(req, {
  assigneeId,
  taskTitle,
  projectId,
  link,
  meta = {},
}) {
  const tenantId = req.tenantId || req.user?.tenantId
  const settings = tenantId ? await getMailSettings(tenantId) : null
  const pref = eventPref(settings, 'task_assigned')
  const actorId = req.user?._id
  const actorName = req.user?.name || 'Someone'

  const baseMeta = {
    ...meta,
    actor: actorSummary(req.user),
    taskTitle,
  }

  if (pref.notifyTarget && assigneeId) {
    await notifyUser(req, {
      userId: assigneeId,
      type: 'task_assigned',
      title: `${actorName} assigned you a task`,
      body: taskTitle,
      projectId,
      link,
      meta: baseMeta,
    })
  }

  if (pref.notifyActor && actorId && String(actorId) !== String(assigneeId)) {
    // Assigner confirmation — allow self (normally skipped)
    await notifySelfAllowed(req, {
      userId: actorId,
      type: 'task_assigned',
      title: `You assigned a task`,
      body: taskTitle,
      projectId,
      link,
      meta: { ...baseMeta, roleInEvent: 'assigner' },
    })
  }

  if (pref.notifyAdmins && tenantId) {
    const admins = await listAdminUserIds(tenantId)
    for (const admin of admins) {
      if (String(admin._id) === String(assigneeId)) continue
      if (String(admin._id) === String(actorId)) continue
      await notifyUser(req, {
        userId: admin._id,
        type: 'task_assigned',
        title: `${actorName} assigned a task`,
        body: taskTitle,
        projectId,
        link,
        meta: { ...baseMeta, roleInEvent: 'admin' },
      })
    }
  }
}

/**
 * Fan-out when a task moves status/stage or due date changes.
 * Notifies assignee, creator/assigner, and admins (popup + email per prefs).
 */
export async function notifyTaskMoved(req, {
  task,
  changes = [],
  link,
  meta = {},
}) {
  if (!changes.length) return

  const tenantId = req.tenantId || req.user?.tenantId
  const settings = tenantId ? await getMailSettings(tenantId) : null
  const pref = eventPref(settings, 'task_moved')
  const actorId = req.user?._id
  const actorName = req.user?.name || 'Someone'
  const assigneeId = task.assignee?._id || task.assignee || null
  const creatorId = task.createdBy?._id || task.createdBy || null
  const changeLine = changes.join(' · ')
  const title = `Task updated: ${task.title}`
  const body = `${actorName} moved this task — ${changeLine}`
  const projectId = task.projectId?._id || task.projectId
  const baseMeta = {
    ...meta,
    actor: actorSummary(req.user),
    taskTitle: task.title,
    taskId: String(task._id),
    changes,
  }

  const recipients = new Map()

  if (pref.notifyTarget !== false && assigneeId) {
    recipients.set(String(assigneeId), 'assignee')
  }
  if (pref.notifyActor !== false) {
    // Person who made the move gets a confirmation
    if (actorId) recipients.set(String(actorId), 'mover')
    // Original creator also stays in the loop
    if (creatorId) recipients.set(String(creatorId), 'creator')
  }
  if (pref.notifyAdmins !== false && tenantId) {
    const admins = await listAdminUserIds(tenantId)
    for (const admin of admins) {
      recipients.set(String(admin._id), 'admin')
    }
  }

  for (const [userId, role] of recipients) {
    const isSelf = req.user && String(userId) === String(req.user._id)
    const payload = {
      userId,
      type: 'task_moved',
      title,
      body,
      projectId,
      link,
      meta: { ...baseMeta, roleInEvent: role },
    }
    if (isSelf) {
      await notifySelfAllowed(req, payload)
    } else {
      await notifyUser(req, payload)
    }
  }
}

/** Like notifyUser but does not skip the current user (for assigner receipts). */
async function notifySelfAllowed(
  req,
  { userId, type, title, body = '', link = '', projectId, meta = {} },
) {
  if (!userId) return null
  const recipient = String(userId)
  const tenantId = req.tenantId || req.user?.tenantId
  const settings = tenantId ? await getMailSettings(tenantId) : null
  const pref = eventPref(settings, type)

  let notification = null
  if (pref.popup !== false) {
    notification = await Notification.create(
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
  }

  if (pref.email !== false && tenantId) {
    try {
      const user = await User.findById(recipient).select('email name').lean()
      if (user?.email) {
        const tenant = await Tenant.findById(tenantId).select('name').lean()
        const mail = buildNotificationEmail({
          title,
          body,
          link,
          workspaceName: tenant?.name,
        })
        await sendTenantMail(tenantId, {
          to: user.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        })
      }
    } catch (err) {
      console.warn('[mail] failed to send notification email:', err.message)
    }
  }

  return notification
}

export function actorSummary(user) {
  if (!user) return null
  return { name: user.name, avatar: user.avatar || '', role: user.role || '' }
}
