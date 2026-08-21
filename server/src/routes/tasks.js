import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import {
  Task,
  ActivityLog,
  Comment,
  User,
} from '../models/index.js'
import { CustomFieldDefinition } from '../models/CustomField.js'
import { parseMentionsFromBody } from '../lib/mentions.js'
import { notifyUser, actorSummary } from '../lib/notify.js'
import { hasPermission } from '../lib/permissions.js'
import { assertProjectAccess } from '../lib/projectScope.js'
import { scoreTaskCompletion } from '../lib/impactEngine.js'

function taskLink(task) {
  const projectId = task.projectId?._id || task.projectId
  if (!projectId) return '/?view=assigned'
  return `/projects/${projectId}/tasks?task=${task._id}`
}

function taskMeta(task, req) {
  return {
    taskId: String(task._id),
    taskTitle: task.title,
    projectId: task.projectId ? String(task.projectId._id || task.projectId) : null,
    projectName: task.projectId?.name || '',
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    dueDate: task.dueDate || null,
    actor: actorSummary(req.user),
  }
}

const router = express.Router()

function isTaskWorker(task, user) {
  const userId = String(user?._id || '')
  return (
    String(task?.assignee?._id || task?.assignee || '') === userId ||
    (!!task?.isPersonal &&
      String(task?.createdBy?._id || task?.createdBy || '') === userId)
  )
}

function assertTaskRead(task, user) {
  if (hasPermission(user, 'tasks.manage') || isTaskWorker(task, user)) return
  throw new AppError('Task not found', 404)
}

const STATUS_LABELS = {
  todo: 'Not started',
  in_progress: 'Working on it',
  review: 'Needs check',
  done: 'Finished',
}

const STATUS_PROGRESS = {
  todo: 0,
  in_progress: 40,
  review: 80,
  done: 100,
}

const PRIORITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Normal',
  low: 'Low',
}

function formatDateVal(v) {
  if (!v) return 'Empty'
  try {
    return new Date(v).toISOString().slice(0, 10)
  } catch {
    return String(v)
  }
}

function formatEstimate(mins) {
  if (mins == null || mins === '') return 'Empty'
  const n = Math.round(Number(mins))
  if (!Number.isFinite(n) || n <= 0) return 'Empty'
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

function formatTracked(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function sameId(a, b) {
  return String(a || '') === String(b || '')
}

function tagsEqual(a, b) {
  const aa = Array.isArray(a) ? a.map(String) : []
  const bb = Array.isArray(b) ? b.map(String) : []
  if (aa.length !== bb.length) return false
  return aa.every((t, i) => t === bb[i])
}

async function resolveUserName(id, cache) {
  if (!id) return 'Unassigned'
  const key = String(id)
  if (cache.has(key)) return cache.get(key)
  const u = await User.findById(id).select('name')
  const name = u?.name || 'Someone'
  cache.set(key, name)
  return name
}

async function buildFieldDiffs(task, body, actorName) {
  const diffs = []
  const userCache = new Map()

  const push = (field, label, from, to, extra = {}) => {
    diffs.push({
      field,
      label,
      from,
      to,
      message: `${actorName} changed ${label} from ${from} to ${to}`,
      ...extra,
    })
  }

  if (body.title !== undefined && body.title !== task.title) {
    push('title', 'Title', task.title || 'Empty', body.title || 'Empty')
  }

  if (
    body.description !== undefined &&
    String(body.description || '') !== String(task.description || '')
  ) {
    push(
      'description',
      'Description',
      task.description ? 'updated' : 'Empty',
      body.description ? 'updated' : 'Empty',
    )
  }

  if (body.status !== undefined && body.status !== task.status) {
    push(
      'status',
      'Status',
      STATUS_LABELS[task.status] || task.status || 'Empty',
      STATUS_LABELS[body.status] || body.status || 'Empty',
      { fromValue: task.status, toValue: body.status },
    )
  }

  if (body.priority !== undefined && body.priority !== task.priority) {
    push(
      'priority',
      'Priority',
      PRIORITY_LABELS[task.priority] || task.priority || 'Empty',
      PRIORITY_LABELS[body.priority] || body.priority || 'Empty',
      { fromValue: task.priority, toValue: body.priority },
    )
  }

  if (body.assignee !== undefined) {
    const prevId = task.assignee?._id || task.assignee
    const nextId = body.assignee || null
    if (!sameId(prevId, nextId)) {
      const from = await resolveUserName(prevId, userCache)
      const to = await resolveUserName(nextId, userCache)
      push('assignee', 'Assignee', from, to)
    }
  }

  if (body.startDate !== undefined) {
    const prev = formatDateVal(task.startDate)
    const next = formatDateVal(body.startDate)
    if (prev !== next) push('startDate', 'Start date', prev, next)
  }

  if (body.dueDate !== undefined) {
    const prev = formatDateVal(task.dueDate)
    const next = formatDateVal(body.dueDate)
    if (prev !== next) push('dueDate', 'Due date', prev, next)
  }

  if (body.tags !== undefined && !tagsEqual(task.tags, body.tags)) {
    const from = (task.tags || []).join(', ') || 'Empty'
    const to = (Array.isArray(body.tags) ? body.tags : []).join(', ') || 'Empty'
    push('tags', 'Tags', from, to)
  }

  if (body.timeEstimate !== undefined) {
    const prev = formatEstimate(task.timeEstimate)
    const next = formatEstimate(body.timeEstimate)
    if (prev !== next) push('timeEstimate', 'Time estimate', prev, next)
  }

  if (
    body.timeTrackingStartedAt !== undefined ||
    body.timeSpent !== undefined
  ) {
    const wasRunning = !!task.timeTrackingStartedAt
    const willRun =
      body.timeTrackingStartedAt !== undefined
        ? !!body.timeTrackingStartedAt
        : wasRunning
    const prevSpent = Number(task.timeSpent) || 0
    const nextSpent =
      body.timeSpent !== undefined ? Number(body.timeSpent) || 0 : prevSpent

    if (!wasRunning && willRun) {
      push('timeTracking', 'Track time', 'Stopped', 'Started')
    } else if (wasRunning && !willRun) {
      push(
        'timeTracking',
        'Track time',
        'Running',
        `Stopped at ${formatTracked(nextSpent)}`,
      )
    } else if (prevSpent !== nextSpent) {
      push(
        'timeSpent',
        'Tracked time',
        formatTracked(prevSpent),
        formatTracked(nextSpent),
      )
    }
  }

  if (body.checklist !== undefined) {
    const prevLen = Array.isArray(task.checklist) ? task.checklist.length : 0
    const nextLen = Array.isArray(body.checklist) ? body.checklist.length : 0
    const prevDone = (task.checklist || []).filter((c) => c.done).length
    const nextDone = (body.checklist || []).filter((c) => c.done).length
    if (prevLen !== nextLen) {
      push(
        'checklist',
        'Checklist',
        `${prevLen} item${prevLen === 1 ? '' : 's'}`,
        `${nextLen} item${nextLen === 1 ? '' : 's'}`,
      )
    } else if (prevDone !== nextDone) {
      push(
        'checklist',
        'Checklist',
        `${prevDone} done`,
        `${nextDone} done`,
      )
    }
  }

  if (body.customFields && typeof body.customFields === 'object') {
    const fieldDefs = await CustomFieldDefinition.find({
      tenantId: task.tenantId,
      slug: { $in: Object.keys(body.customFields) },
    })

    const defMap = Object.fromEntries(fieldDefs.map((f) => [f.slug, f]))
    const prevCf = task.customFields || {}

    for (const [slug, nextVal] of Object.entries(body.customFields)) {
      const prevVal = prevCf[slug]
      if (String(prevVal ?? '') === String(nextVal ?? '')) continue
      const def = defMap[slug]
      const label = def?.name || slug
      let from = prevVal == null || prevVal === '' ? 'Empty' : String(prevVal)
      let to = nextVal == null || nextVal === '' ? 'Empty' : String(nextVal)
      if (def?.type === 'user') {
        from = await resolveUserName(prevVal, userCache)
        to = await resolveUserName(nextVal, userCache)
      }
      push(`customFields.${slug}`, label, from, to)
    }
  }

  return diffs
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId, status, stage, assignee } = req.query
    const filter = tenantFilter(req, {})
    if (projectId) filter.projectId = projectId
    if (status) filter.status = status
    if (stage) filter.stage = stage
    if (assignee) filter.assignee = assignee
    if (!hasPermission(req.user, 'tasks.manage')) {
      filter.$or = [
        { assignee: req.user._id },
        { isPersonal: true, createdBy: req.user._id },
      ]
    }

    const tasks = await Task.find(filter)
      .populate('assignee', 'name avatar')
      .populate('createdBy', 'name avatar')
      .populate('projectId', 'name')
      .sort({ dueDate: 1, createdAt: -1 })

    res.json({ success: true, tasks })
  }),
)

/** Current user's running timer (for top-bar chip) */
router.get(
  '/active-timer',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findOne(
      tenantFilter(req, {
        timeTrackingStartedAt: { $ne: null },
        $or: [
          { timeTrackingUserId: req.user._id },
          { timeTrackingUserId: null, assignee: req.user._id },
          { timeTrackingUserId: null, createdBy: req.user._id },
        ],
      }),
    )
      .populate('projectId', 'name')
      .select(
        'title timeSpent timeTrackingStartedAt timeTrackingUserId projectId isPersonal',
      )
      .sort({ timeTrackingStartedAt: -1 })

    res.json({ success: true, task: task || null })
  }),
)

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .populate('projectId', 'name')
      .populate('dependsOn', 'title status')

    assertTenantDoc(task, req, 'Task')
    assertTaskRead(task, req.user)

    const comments = await Comment.find(tenantFilter(req, { taskId: task._id }))
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 })

    const activity = await ActivityLog.find(
      tenantFilter(req, {
        $or: [
          { 'meta.taskId': task._id },
          { 'meta.taskId': String(task._id) },
        ],
      }),
    )
      .populate('actor', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ success: true, task, comments, activity })
  }),
)

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const isPersonal = !!req.body.isPersonal
    if (!isPersonal && !req.body.projectId) {
      throw new AppError('projectId is required', 400)
    }
    if (!isPersonal) {
      if (!hasPermission(req.user, 'tasks.create')) {
        throw new AppError('You do not have permission to create project tasks', 403)
      }
      await assertProjectAccess(req, req.body.projectId)
    }

    const payload = {
      ...req.body,
      isPersonal,
      projectId: isPersonal ? undefined : req.body.projectId,
      createdBy: req.user._id,
      assignee: req.body.assignee || req.user._id,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      timeEstimate:
        req.body.timeEstimate == null || req.body.timeEstimate === ''
          ? null
          : Number(req.body.timeEstimate),
      customFields:
        req.body.customFields && typeof req.body.customFields === 'object'
          ? req.body.customFields
          : {},
    }

    const task = await Task.create(withTenant(req, payload))
    await task.populate('assignee', 'name avatar')
    if (task.projectId) await task.populate('projectId', 'name')

    await ActivityLog.create(
      withTenant(req, {
        projectId: task.projectId || undefined,
        actor: req.user._id,
        type: 'task_created',
        message: `${req.user.name} created this task: ${task.title}`,
        meta: { taskId: task._id, isPersonal, title: task.title, field: 'created' },
      }),
    )

    if (!isPersonal && task.assignee) {
      await notifyUser(req, {
        userId: task.assignee._id || task.assignee,
        type: 'task_assigned',
        title: `${req.user.name} assigned you a task`,
        body: task.title,
        projectId: task.projectId?._id || task.projectId,
        link: taskLink(task),
        meta: taskMeta(task, req),
      })
    }

    res.status(201).json({ success: true, task })
  }),
)

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
    assertTenantDoc(task, req, 'Task')

    const prevAssigneeId = task.assignee ? String(task.assignee) : null
    const previousStatus = task.status
    const canManage = hasPermission(req.user, 'tasks.manage')
    if (!canManage && !isTaskWorker(task, req.user)) {
      throw new AppError('Task not found', 404)
    }

    if (!canManage) {
      const workerFields = new Set([
        'status',
        'checklist',
        'attachments',
        'progress',
        'timeSpent',
        'timeTrackingStartedAt',
        'timeTrackingUserId',
      ])
      const blocked = Object.keys(req.body).filter((key) => !workerFields.has(key))
      if (blocked.length) {
        throw new AppError(
          'Employees can only update status, checklist, files, and time on assigned tasks',
          403,
        )
      }
    }
    const diffs = await buildFieldDiffs(task, req.body, req.user.name)

    const allowed = [
      'title',
      'description',
      'stage',
      'status',
      'priority',
      'assignee',
      'participants',
      'dueDate',
      'startDate',
      'location',
      'videoLink',
      'progress',
      'checklist',
      'requiresApproval',
      'approvalStatus',
      'dependsOn',
      'isMilestone',
      'attachments',
      'tags',
      'timeEstimate',
      'timeSpent',
      'timeTrackingStartedAt',
      'timeTrackingUserId',
    ]
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        let val = req.body[key]
        if (
          (key === 'timeTrackingStartedAt' ||
            key === 'dueDate' ||
            key === 'startDate' ||
            key === 'timeTrackingUserId') &&
          (val === '' || val === null)
        ) {
          val = null
        }
        if (key === 'timeSpent' && val != null) {
          val = Math.max(0, Number(val) || 0)
        }
        task[key] = val
      }
    }

    // Starting a timer: attribute to current user and stop their other timers
    if (req.body.timeTrackingStartedAt) {
      task.timeTrackingUserId = req.user._id
      const others = await Task.find(
        tenantFilter(req, {
          _id: { $ne: task._id },
          timeTrackingUserId: req.user._id,
          timeTrackingStartedAt: { $ne: null },
        }),
      )
      for (const other of others) {
        const started = other.timeTrackingStartedAt
          ? new Date(other.timeTrackingStartedAt).getTime()
          : null
        const base = Number(other.timeSpent) || 0
        if (started) {
          other.timeSpent =
            base + Math.max(0, Math.floor((Date.now() - started) / 1000))
        }
        other.timeTrackingStartedAt = null
        other.timeTrackingUserId = null
        await other.save()
      }
    }

    if (
      req.body.timeTrackingStartedAt === null ||
      req.body.timeTrackingStartedAt === ''
    ) {
      task.timeTrackingUserId = null
    }

    if (req.body.customFields && typeof req.body.customFields === 'object') {
      task.customFields = {
        ...(task.customFields || {}),
        ...req.body.customFields,
      }
      task.markModified('customFields')
    }

    if (req.body.status !== undefined && STATUS_PROGRESS[task.status] != null) {
      task.progress = STATUS_PROGRESS[task.status]
    } else if (task.status === 'done') {
      task.progress = 100
    }
    await task.save()
    await task.populate('assignee', 'name avatar')
    if (task.projectId) await task.populate('projectId', 'name')

    try {
      await scoreTaskCompletion({
        tenantId: req.tenantId,
        task,
        previousStatus,
      })
    } catch {
      // Impact scoring must never block task updates
    }

    const nextAssigneeId = task.assignee
      ? String(task.assignee._id || task.assignee)
      : null
    if (
      req.body.assignee !== undefined &&
      nextAssigneeId &&
      nextAssigneeId !== prevAssigneeId
    ) {
      await notifyUser(req, {
        userId: nextAssigneeId,
        type: 'task_assigned',
        title: `${req.user.name} assigned you a task`,
        body: task.title,
        projectId: task.projectId?._id || task.projectId,
        link: taskLink(task),
        meta: taskMeta(task, req),
      })
    }

    if (diffs.length) {
      for (const d of diffs) {
        await ActivityLog.create(
          withTenant(req, {
            projectId: task.projectId || undefined,
            actor: req.user._id,
            type: 'task_updated',
            message: d.message,
            meta: {
              taskId: task._id,
              field: d.field,
              label: d.label,
              from: d.from,
              to: d.to,
              ...(d.fromValue != null ? { fromValue: d.fromValue } : {}),
              ...(d.toValue != null ? { toValue: d.toValue } : {}),
            },
          }),
        )
      }
    } else if (
      Object.keys(req.body).some((k) =>
        [...allowed, 'customFields'].includes(k),
      )
    ) {
      // checklist / other silent fields still get a generic line if nothing else logged
      const silent = ['checklist', 'progress', 'attachments']
      const changed = Object.keys(req.body).filter((k) => silent.includes(k))
      if (changed.length) {
        await ActivityLog.create(
          withTenant(req, {
            projectId: task.projectId || undefined,
            actor: req.user._id,
            type: 'task_updated',
            message: `${req.user.name} updated “${task.title}”`,
            meta: { taskId: task._id, changes: changed },
          }),
        )
      }
    }

    res.json({ success: true, task })
  }),
)

router.post(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
    assertTenantDoc(task, req, 'Task')
    assertTaskRead(task, req.user)

    let mentions = Array.isArray(req.body.mentions) ? [...req.body.mentions] : []
    if (!mentions.length && req.body.body) {
      const users = await User.find(
        tenantFilter(req, { isActive: true, isPlatformAdmin: { $ne: true } }),
      ).select('name')
      mentions = parseMentionsFromBody(req.body.body, users)
    }

    const assignedTo =
      req.body.assignedTo || (mentions.length ? mentions[0] : undefined)

    const comment = await Comment.create(
      withTenant(req, {
        projectId: task.projectId,
        taskId: task._id,
        author: req.user._id,
        body: req.body.body,
        mentions,
        assignedTo,
      }),
    )
    await comment.populate('author', 'name avatar')
    await comment.populate('assignedTo', 'name avatar')

    await ActivityLog.create(
      withTenant(req, {
        projectId: task.projectId,
        actor: req.user._id,
        type: 'comment',
        message: `${req.user.name} commented on “${task.title}”`,
        meta: { taskId: task._id, commentId: comment._id },
        mentions,
      }),
    )

    const notifyIds = new Set(
      [...mentions.map(String), assignedTo ? String(assignedTo) : ''].filter(
        Boolean,
      ),
    )
    notifyIds.delete(String(req.user._id))
    if (notifyIds.size && task.projectId) {
      await task.populate('projectId', 'name')
    }
    for (const uid of notifyIds) {
      const isDirectAssign = assignedTo && String(assignedTo) === uid
      await notifyUser(req, {
        userId: uid,
        type: 'mention',
        title: isDirectAssign
          ? `${req.user.name} asked you to handle a comment`
          : `${req.user.name} mentioned you`,
        body: req.body.body.slice(0, 200),
        link: taskLink(task),
        projectId: task.projectId?._id || task.projectId,
        meta: {
          ...taskMeta(task, req),
          commentId: String(comment._id),
          commentBody: req.body.body.slice(0, 400),
        },
      })
    }

    res.status(201).json({ success: true, comment })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
    assertTenantDoc(task, req, 'Task')
    if (!hasPermission(req.user, 'tasks.manage')) {
      throw new AppError('You do not have permission to delete tasks', 403)
    }
    await task.deleteOne()
    res.json({ success: true })
  }),
)

export default router
