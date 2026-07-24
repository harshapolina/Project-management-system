import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import '../models/index.js'
import { Task } from '../models/Task.js'
import { ActivityLog, Notification, Comment } from '../models/Activity.js'
import { startOfDay, endOfDay, addDays } from './dateHelpers.js'

const router = express.Router()

router.get(
  '/home',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const upcomingEnd = endOfDay(addDays(now, 14))

    const populateTask = [
      { path: 'projectId', select: 'name coverImage' },
      { path: 'assignee', select: 'name avatar' },
    ]

    const tf = (extra) => tenantFilter(req, extra)

    const [
      today,
      overdue,
      next,
      unscheduled,
      assignedOpen,
      done,
      delegated,
      personal,
      priorities,
      assignedComments,
      approvals,
      activity,
      mentions,
      notifications,
      recentTasks,
    ] = await Promise.all([
      Task.find(tf({
        $or: [
          { assignee: userId, isPersonal: { $ne: true } },
          { isPersonal: true, $or: [{ assignee: userId }, { createdBy: userId }] },
        ],
        status: { $ne: 'done' },
        dueDate: { $gte: todayStart, $lte: todayEnd },
      }))
        .populate(populateTask)
        .sort({ priority: -1, dueDate: 1 })
        .limit(40),
      Task.find(tf({
        $or: [
          { assignee: userId, isPersonal: { $ne: true } },
          { isPersonal: true, $or: [{ assignee: userId }, { createdBy: userId }] },
        ],
        status: { $ne: 'done' },
        dueDate: { $lt: todayStart },
      }))
        .populate(populateTask)
        .sort({ dueDate: 1 })
        .limit(40),
      Task.find(tf({
        $or: [
          { assignee: userId, isPersonal: { $ne: true } },
          { isPersonal: true, $or: [{ assignee: userId }, { createdBy: userId }] },
        ],
        status: { $ne: 'done' },
        dueDate: { $gt: todayEnd, $lte: upcomingEnd },
      }))
        .populate(populateTask)
        .sort({ dueDate: 1 })
        .limit(40),
      Task.find(tf({
        status: { $ne: 'done' },
        $and: [
          {
            $or: [
              { assignee: userId, isPersonal: { $ne: true } },
              {
                isPersonal: true,
                $or: [{ assignee: userId }, { createdBy: userId }],
              },
            ],
          },
          { $or: [{ dueDate: null }, { dueDate: { $exists: false } }] },
        ],
      }))
        .populate(populateTask)
        .sort({ updatedAt: -1 })
        .limit(40),
      Task.find(tf({
        $or: [
          { assignee: userId, isPersonal: { $ne: true } },
          { isPersonal: true, $or: [{ assignee: userId }, { createdBy: userId }] },
        ],
        status: { $ne: 'done' },
      }))
        .populate(populateTask)
        .sort({ status: 1, dueDate: 1, updatedAt: -1 })
        .limit(80),
      Task.find(tf({
        status: 'done',
        $or: [
          { assignee: userId },
          { isPersonal: true, createdBy: userId },
        ],
      }))
        .populate(populateTask)
        .sort({ updatedAt: -1 })
        .limit(60),
      Task.find(tf({
        createdBy: userId,
        isPersonal: { $ne: true },
        assignee: { $exists: true, $nin: [null, userId] },
        status: { $ne: 'done' },
      }))
        .populate(populateTask)
        .sort({ updatedAt: -1 })
        .limit(40),
      Task.find(tf({
        isPersonal: true,
        $or: [{ assignee: userId }, { createdBy: userId }],
        status: { $ne: 'done' },
      }))
        .sort({ createdAt: -1 })
        .limit(40),
      Task.find(tf({
        status: { $ne: 'done' },
        priority: { $in: ['urgent', 'high'] },
        $or: [
          { assignee: userId, isPersonal: { $ne: true } },
          {
            isPersonal: true,
            $or: [{ assignee: userId }, { createdBy: userId }],
          },
        ],
      }))
        .populate(populateTask)
        .sort({ priority: -1, dueDate: 1 })
        .limit(30),
      Comment.find(tf({
        resolved: { $ne: true },
        $or: [{ assignedTo: userId }, { mentions: userId }],
      }))
        .populate('author', 'name avatar')
        .populate('assignedTo', 'name avatar')
        .populate({
          path: 'taskId',
          select: 'title projectId',
          populate: { path: 'projectId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .limit(15),
      Task.find(tf({
        requiresApproval: true,
        approvalStatus: 'pending',
        $or: [{ assignee: userId }, { createdBy: userId }],
      }))
        .populate('projectId', 'name')
        .populate('assignee', 'name avatar')
        .limit(15),
      ActivityLog.find(tf({
        $or: [{ actor: userId }, { mentions: userId }],
      }))
        .populate('actor', 'name avatar')
        .populate('projectId', 'name')
        .sort({ createdAt: -1 })
        .limit(15),
      ActivityLog.find(tf({ mentions: userId }))
        .populate('actor', 'name avatar')
        .populate('projectId', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
      Notification.find(tf({ userId })).sort({ createdAt: -1 }).limit(10),
      Task.find(tf({
        $or: [{ assignee: userId }, { createdBy: userId }],
      }))
        .populate('projectId', 'name')
        .sort({ updatedAt: -1 })
        .limit(8),
    ])

    // Keep legacy "upcoming" key for compatibility
    const upcoming = next

    // Agenda = dated tasks for next 7 days (for calendar view)
    const agenda = [...today, ...overdue, ...next]
      .filter((t) => t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

    res.json({
      success: true,
      data: {
        greeting: getGreeting(req.user.name),
        tasks: {
          today,
          upcoming,
          overdue,
          next,
          unscheduled,
          assigned: assignedOpen,
          done,
          delegated,
          personal,
          priorities,
        },
        agenda,
        assignedComments,
        recents: recentTasks,
        approvals,
        activity,
        mentions,
        notifications,
      },
    })
  }),
)

router.patch(
  '/tasks/:id/toggle',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
    assertTenantDoc(task, req, 'Task')

    const done = task.status === 'done'
    task.status = done ? 'todo' : 'done'
    task.progress = done ? 0 : 100
    await task.save()

    await ActivityLog.create(
      withTenant(req, {
        projectId: task.projectId,
        actor: req.user._id,
        type: 'task_toggled',
        message: done
          ? `Reopened “${task.title}”`
          : `Completed “${task.title}”`,
      }),
    )

    res.json({ success: true, task })
  }),
)

function getGreeting(name) {
  const hour = new Date().getHours()
  const first = (name || '').split(' ')[0] || 'there'
  if (hour < 12) return `Good morning, ${first}`
  if (hour < 17) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

export default router
