import express from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { Project, Task, ActivityLog, User } from '../models/index.js'

const router = express.Router()

const STAGE_DEFS = [
  { key: 'design', label: 'Design' },
  { key: 'planning', label: 'Planning / BOQ' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'execution', label: 'Execution' },
  { key: 'handover', label: 'QC / Handover' },
]

const TEMPLATE_TASKS = {
  residential: [
    { title: 'Kickoff & brief capture', stage: 'design' },
    { title: 'Concept moodboards', stage: 'design' },
    { title: 'Client concept approval', stage: 'design', requiresApproval: true },
    { title: 'Draft BOQ — Standard', stage: 'planning' },
    { title: 'Vendor shortlist', stage: 'procurement' },
    { title: 'Raise primary POs', stage: 'procurement' },
    { title: 'Site mobilization', stage: 'execution' },
    { title: 'Snag walkthrough', stage: 'handover' },
  ],
  commercial: [
    { title: 'Brand & space brief', stage: 'design' },
    { title: 'Space planning drawings', stage: 'design' },
    { title: 'Commercial BOQ', stage: 'planning' },
    { title: 'MEP coordination', stage: 'planning' },
    { title: 'Bulk material POs', stage: 'procurement' },
    { title: 'Fit-out execution', stage: 'execution' },
    { title: 'Handover pack', stage: 'handover' },
  ],
  blank: [
    { title: 'Define project milestones', stage: 'design' },
  ],
}

function scopeProjects(user) {
  if (['admin', 'owner', 'project_manager'].includes(user.role)) return {}
  return {
    $or: [
      { projectManager: user._id },
      { clientId: user._id },
      { 'members.user': user._id },
    ],
  }
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, type, stage, q } = req.query
    const filter = tenantFilter(req, { ...scopeProjects(req.user) })
    if (status) filter.status = status
    if (type) filter.type = type
    if (stage) filter.currentStage = stage
    if (q) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { name: new RegExp(q, 'i') },
            { clientName: new RegExp(q, 'i') },
            { location: new RegExp(q, 'i') },
          ],
        },
      ]
    }

    const projects = await Project.find(filter)
      .populate('projectManager', 'name avatar')
      .populate('members.user', 'name avatar role')
      .sort({ updatedAt: -1 })

    res.json({ success: true, projects })
  }),
)

router.get(
  '/portfolio',
  requireAuth,
  requireRole('admin', 'owner', 'project_manager'),
  asyncHandler(async (req, res) => {
    const projects = await Project.find(tenantFilter(req, scopeProjects(req.user)))
      .populate('projectManager', 'name avatar')
      .populate('members.user', 'name avatar')

    const counts = {
      total: projects.length,
      ongoing: projects.filter((p) => p.status === 'in_progress').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      delayed: projects.filter((p) => p.status === 'delayed' || p.isDelayed).length,
      onHold: projects.filter((p) => p.status === 'on_hold').length,
    }

    const health = [
      { key: 'completed', label: 'Completed', value: counts.completed, color: 'var(--status-completed)' },
      { key: 'ongoing', label: 'Ongoing', value: counts.ongoing, color: 'var(--status-in-progress)' },
      { key: 'delayed', label: 'Delayed', value: counts.delayed, color: 'var(--status-delayed)' },
      { key: 'onHold', label: 'On hold', value: counts.onHold, color: 'var(--status-on-hold)' },
    ]

    const delayAlerts = projects
      .filter((p) => p.isDelayed || p.status === 'delayed')
      .map((p) => ({
        id: p._id,
        name: p.name,
        location: p.location,
        stage: p.currentStage,
        endDate: p.endDate,
      }))

    const upcomingDeadlines = await Task.find(
      tenantFilter(req, {
        status: { $ne: 'done' },
        dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 14 * 86400000) },
      }),
    )
      .populate('projectId', 'name')
      .populate('assignee', 'name avatar')
      .sort({ dueDate: 1 })
      .limit(8)

    const users = await User.find(
      tenantFilter(req, {
        role: { $in: ['project_manager', 'designer', 'site_supervisor'] },
        isActive: true,
        isPlatformAdmin: { $ne: true },
      }),
    ).select('name avatar role')

    const workload = await Promise.all(
      users.map(async (u) => {
        const open = await Task.countDocuments(
          tenantFilter(req, {
            assignee: u._id,
            status: { $ne: 'done' },
          }),
        )
        return { user: u, openTasks: open, load: Math.min(100, open * 12) }
      }),
    )

    res.json({
      success: true,
      data: { counts, health, projects, delayAlerts, upcomingDeadlines, workload },
    })
  }),
)

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const project = await Project.findOne(
      tenantFilter(req, {
        _id: req.params.id,
        ...scopeProjects(req.user),
      }),
    )
      .populate('projectManager', 'name avatar email title')
      .populate('members.user', 'name avatar role email title')
      .populate('clientId', 'name avatar email')

    if (!project) throw new AppError('Project not found', 404)

    const [openTasks, pendingApprovals, latestSite] = await Promise.all([
      Task.countDocuments(
        tenantFilter(req, { projectId: project._id, status: { $ne: 'done' } }),
      ),
      Task.countDocuments(
        tenantFilter(req, {
          projectId: project._id,
          requiresApproval: true,
          approvalStatus: 'pending',
        }),
      ),
      ActivityLog.find(tenantFilter(req, { projectId: project._id }))
        .populate('actor', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(1),
    ])

    res.json({
      success: true,
      project,
      stats: {
        openTasks,
        pendingApprovals,
        budgetVsSpent: {
          budget: project.budget,
          spent: project.spent,
          pct: project.budget ? Math.round((project.spent / project.budget) * 100) : 0,
        },
        latestActivity: latestSite[0] || null,
      },
    })
  }),
)

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      name,
      clientName,
      type = 'residential',
      location,
      startDate,
      endDate,
      budget,
      coverImage,
      description,
      spaceId,
    } = req.body

    if (!name || !clientName) throw new AppError('Name and client are required')

    const stages = STAGE_DEFS.map((s, i) => ({
      ...s,
      progress: 0,
      status: i === 0 ? 'in_progress' : 'not_started',
    }))

    const project = await Project.create(
      withTenant(req, {
        name,
        clientName,
        type,
        location,
        startDate,
        endDate,
        budget: budget || 0,
        spaceId: spaceId || undefined,
        coverImage:
          coverImage ||
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
        description,
        status: 'in_progress',
        currentStage: 'design',
        stages,
        projectManager: req.user._id,
        members: [{ user: req.user._id, role: req.user.role }],
        code: `CUB-${Math.floor(100 + Math.random() * 900)}`,
      }),
    )

    const template = TEMPLATE_TASKS[type] || TEMPLATE_TASKS.blank
    await Task.insertMany(
      template.map((t) =>
        withTenant(req, {
          ...t,
          projectId: project._id,
          createdBy: req.user._id,
          assignee: req.user._id,
          status: 'todo',
          priority: 'medium',
          approvalStatus: t.requiresApproval ? 'pending' : 'none',
        }),
      ),
    )

    await ActivityLog.create(
      withTenant(req, {
        projectId: project._id,
        actor: req.user._id,
        type: 'project_created',
        message: `${req.user.name} created project “${name}”`,
      }),
    )

    res.status(201).json({ success: true, project })
  }),
)

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'owner', 'project_manager'),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
    assertTenantDoc(project, req, 'Project')

    const allowed = [
      'name',
      'clientName',
      'status',
      'currentStage',
      'stages',
      'coverImage',
      'location',
      'description',
      'startDate',
      'endDate',
      'budget',
      'spent',
      'progress',
      'isDelayed',
      'members',
    ]
    for (const key of allowed) {
      if (req.body[key] !== undefined) project[key] = req.body[key]
    }
    await project.save()
    res.json({ success: true, project })
  }),
)

router.post(
  '/:id/members',
  requireAuth,
  requireRole('admin', 'owner', 'project_manager'),
  asyncHandler(async (req, res) => {
    const { userId, role } = req.body
    const project = await Project.findById(req.params.id)
    assertTenantDoc(project, req, 'Project')
    const exists = project.members.some((m) => String(m.user) === String(userId))
    if (!exists) project.members.push({ user: userId, role })
    await project.save()
    await project.populate('members.user', 'name avatar role email title')
    res.json({ success: true, project })
  }),
)

router.delete(
  '/:id/members/:userId',
  requireAuth,
  requireRole('admin', 'owner', 'project_manager'),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
    assertTenantDoc(project, req, 'Project')
    project.members = project.members.filter(
      (m) => String(m.user) !== String(req.params.userId),
    )
    await project.save()
    res.json({ success: true, project })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'owner', 'project_manager'),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
    assertTenantDoc(project, req, 'Project')

    const id = project._id
    await Task.deleteMany(tenantFilter(req, { projectId: id }))
    await ActivityLog.deleteMany(tenantFilter(req, { projectId: id }))
    await project.deleteOne()

    res.json({ success: true })
  }),
)

export default router
