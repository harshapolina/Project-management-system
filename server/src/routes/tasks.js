import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { Task, ActivityLog, Comment, Notification, User } from '../models/index.js'

const router = express.Router()

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId, status, stage, assignee } = req.query
    const filter = {}
    if (projectId) filter.projectId = projectId
    if (status) filter.status = status
    if (stage) filter.stage = stage
    if (assignee) filter.assignee = assignee

    const tasks = await Task.find(filter)
      .populate('assignee', 'name avatar')
      .populate('createdBy', 'name avatar')
      .populate('projectId', 'name')
      .sort({ dueDate: 1, createdAt: -1 })

    res.json({ success: true, tasks })
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

    if (!task) throw new AppError('Task not found', 404)

    const comments = await Comment.find({ taskId: task._id })
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 })

    const activity = await ActivityLog.find({
      'meta.taskId': task._id,
    })
      .populate('actor', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20)

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

    const task = await Task.create({
      ...req.body,
      isPersonal,
      projectId: isPersonal ? undefined : req.body.projectId,
      createdBy: req.user._id,
      assignee: req.body.assignee || req.user._id,
    })
    await task.populate('assignee', 'name avatar')
    if (task.projectId) await task.populate('projectId', 'name')

    await ActivityLog.create({
      projectId: task.projectId || undefined,
      actor: req.user._id,
      type: 'task_created',
      message: `${req.user.name} created task “${task.title}”`,
      meta: { taskId: task._id, isPersonal },
    })

    if (
      !isPersonal &&
      task.assignee &&
      String(task.assignee._id || task.assignee) !== String(req.user._id)
    ) {
      await Notification.create({
        userId: task.assignee._id || task.assignee,
        type: 'task',
        title: 'New task assigned',
        body: task.title,
        projectId: task.projectId,
        link: `/projects/${task.projectId}/tasks`,
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
    if (!task) throw new AppError('Task not found', 404)

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
    ]
    for (const key of allowed) {
      if (req.body[key] !== undefined) task[key] = req.body[key]
    }

    if (task.status === 'done') task.progress = 100
    await task.save()
    await task.populate('assignee', 'name avatar')

    await ActivityLog.create({
      projectId: task.projectId,
      actor: req.user._id,
      type: 'task_updated',
      message: `${req.user.name} updated “${task.title}”`,
      meta: { taskId: task._id, changes: Object.keys(req.body) },
    })

    res.json({ success: true, task })
  }),
)

router.post(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
    if (!task) throw new AppError('Task not found', 404)

    let mentions = req.body.mentions || []
    // Resolve @Name mentions from body if not provided
    if (!mentions.length && req.body.body) {
      const users = await User.find({ isActive: true }).select('name')
      const found = []
      for (const u of users) {
        const first = u.name.split(' ')[0]
        if (
          new RegExp(`@${first}\\b`, 'i').test(req.body.body) ||
          new RegExp(`@${u.name.replace(/\s+/g, '')}\\b`, 'i').test(req.body.body)
        ) {
          found.push(u._id)
        }
      }
      mentions = found
    }

    const assignedTo =
      req.body.assignedTo || (mentions.length ? mentions[0] : undefined)

    const comment = await Comment.create({
      projectId: task.projectId,
      taskId: task._id,
      author: req.user._id,
      body: req.body.body,
      mentions,
      assignedTo,
    })
    await comment.populate('author', 'name avatar')
    await comment.populate('assignedTo', 'name avatar')

    await ActivityLog.create({
      projectId: task.projectId,
      actor: req.user._id,
      type: 'comment',
      message: `${req.user.name} commented on “${task.title}”`,
      meta: { taskId: task._id, commentId: comment._id },
      mentions,
    })

    const notifyIds = new Set(
      [...mentions.map(String), assignedTo ? String(assignedTo) : ''].filter(
        Boolean,
      ),
    )
    notifyIds.delete(String(req.user._id))
    for (const uid of notifyIds) {
      await Notification.create({
        userId: uid,
        type: 'mention',
        title: `${req.user.name} mentioned you`,
        body: req.body.body.slice(0, 140),
        link: `/assigned-comments`,
        projectId: task.projectId,
      })
    }

    res.status(201).json({ success: true, comment })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findByIdAndDelete(req.params.id)
    if (!task) throw new AppError('Task not found', 404)
    res.json({ success: true })
  }),
)

export default router
