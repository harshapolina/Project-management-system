import express from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { upload } from '../middleware/upload.js'
import {
  Lead,
  Quotation,
  Project,
  Task,
  ActivityLog,
  Comment,
  ProjectFile,
  Vendor,
  PurchaseOrder,
  Expense,
  Payment,
  SiteUpdate,
  Snag,
  Notification,
  User,
} from '../models/index.js'

const router = express.Router()

const STAGE_DEFS = [
  { key: 'design', label: 'Design' },
  { key: 'planning', label: 'Planning / BOQ' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'execution', label: 'Execution' },
  { key: 'handover', label: 'QC / Handover' },
]

/* ─── Leads ─── */
router.get(
  '/leads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const leads = await Lead.find()
      .populate('owner', 'name avatar')
      .sort({ updatedAt: -1 })
    res.json({ success: true, leads })
  }),
)

router.post(
  '/leads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const lead = await Lead.create({ ...req.body, owner: req.user._id })
    res.status(201).json({ success: true, lead })
  }),
)

router.patch(
  '/leads/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('owner', 'name avatar')
    if (!lead) throw new AppError('Lead not found', 404)
    res.json({ success: true, lead })
  }),
)

router.post(
  '/leads/:id/convert',
  requireAuth,
  requireRole('admin', 'owner', 'project_manager'),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id)
    if (!lead) throw new AppError('Lead not found', 404)

    const project = await Project.create({
      name: `${lead.clientName} Project`,
      clientName: lead.clientName,
      type: 'residential',
      status: 'in_progress',
      currentStage: 'design',
      stages: STAGE_DEFS.map((s, i) => ({
        ...s,
        progress: 0,
        status: i === 0 ? 'in_progress' : 'not_started',
      })),
      coverImage:
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
      budget: lead.estimatedValue || 0,
      projectManager: req.user._id,
      members: [{ user: req.user._id, role: req.user.role }],
      leadId: lead._id,
      code: `CUB-${Math.floor(100 + Math.random() * 900)}`,
    })

    const quotation = await Quotation.create({
      projectId: project._id,
      leadId: lead._id,
      title: `${lead.clientName} — Quotation`,
      versionLabel: 'Standard',
      status: 'draft',
      items: [],
      createdBy: req.user._id,
    })

    lead.stage = 'won'
    lead.convertedProjectId = project._id
    await lead.save()

    await ActivityLog.create({
      projectId: project._id,
      actor: req.user._id,
      type: 'lead_converted',
      message: `${req.user.name} converted lead “${lead.clientName}” to a project`,
    })

    res.status(201).json({ success: true, project, quotation })
  }),
)

/* ─── Quotations / BOQ ─── */
router.get(
  '/quotations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    if (req.query.leadId) filter.leadId = req.query.leadId
    const quotations = await Quotation.find(filter)
      .populate('createdBy', 'name avatar')
      .populate('projectId', 'name clientName')
      .populate('leadId', 'clientName')
      .sort({ updatedAt: -1 })
    res.json({ success: true, quotations })
  }),
)

router.get(
  '/quotations/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('projectId', 'name clientName')
    if (!quotation) throw new AppError('Quotation not found', 404)
    res.json({ success: true, quotation })
  }),
)

router.post(
  '/quotations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = req.body.items || []
    const subtotal = items.reduce((s, i) => s + (i.amount || i.qty * i.rate || 0), 0)
    const gstPercent = req.body.gstPercent ?? 18
    const discount = req.body.discount || 0
    const grandTotal = subtotal + (subtotal * gstPercent) / 100 - discount

    const quotation = await Quotation.create({
      ...req.body,
      items,
      subtotal,
      gstPercent,
      discount,
      grandTotal,
      createdBy: req.user._id,
    })
    res.status(201).json({ success: true, quotation })
  }),
)

router.patch(
  '/quotations/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
    if (!quotation) throw new AppError('Quotation not found', 404)

    const allowed = [
      'title',
      'versionLabel',
      'status',
      'items',
      'gstPercent',
      'discount',
      'subtotal',
      'grandTotal',
    ]
    for (const key of allowed) {
      if (req.body[key] !== undefined) quotation[key] = req.body[key]
    }

    const shouldRecalc =
      req.body.items !== undefined ||
      req.body.gstPercent !== undefined ||
      req.body.discount !== undefined

    if (shouldRecalc) {
      quotation.subtotal = (quotation.items || []).reduce((s, i) => {
        const amount =
          Number(i.amount) ||
          (Number(i.qty) || 0) * (Number(i.rate) || 0) ||
          0
        return s + amount
      }, 0)
      quotation.grandTotal =
        quotation.subtotal +
        (quotation.subtotal * (Number(quotation.gstPercent) || 0)) / 100 -
        (Number(quotation.discount) || 0)
    }

    if (req.body.status === 'sent') quotation.sentAt = new Date()
    if (req.body.status === 'viewed') quotation.viewedAt = new Date()
    if (req.body.status === 'approved') {
      quotation.approvedAt = new Date()
      if (quotation.projectId) {
        await Project.findByIdAndUpdate(quotation.projectId, {
          budget: quotation.grandTotal,
        })
      }
    }
    if (req.body.status === 'draft') {
      quotation.sentAt = undefined
      quotation.approvedAt = undefined
    }

    await quotation.save()
    res.json({ success: true, quotation })
  }),
)

/* ─── Files ─── */
router.get(
  '/files',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    if (req.query.folder) filter.folder = req.query.folder
    if (req.query.clientVisible === 'true') filter.clientVisible = true

    const files = await ProjectFile.find(filter).sort({ updatedAt: -1 })
    res.json({ success: true, files })
  }),
)

router.post(
  '/files',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const projectId = req.body.projectId
    const folder = req.body.folder || 'concepts'
    const clientVisible =
      req.body.clientVisible === true || req.body.clientVisible === 'true'

    let name = req.body.name
    let mime = req.body.mime || ''
    let url = req.body.url

    if (req.file) {
      name = name || req.file.originalname
      mime = req.file.mimetype || mime
      url = `/uploads/${req.file.filename}`
    }

    if (!projectId || !name || !url) {
      throw new AppError('projectId, name, and file (or url) required', 400)
    }

    const file = await ProjectFile.create({
      projectId,
      folder,
      name,
      mime,
      clientVisible,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          url,
          uploadedBy: req.user._id,
          note: 'Initial upload',
        },
      ],
      status: 'draft',
    })

    await ActivityLog.create({
      projectId,
      actor: req.user._id,
      type: 'file_uploaded',
      message: `${req.user.name} uploaded ${name}`,
    })

    res.status(201).json({ success: true, file })
  }),
)

router.post(
  '/files/:id/version',
  requireAuth,
  asyncHandler(async (req, res) => {
    const file = await ProjectFile.findById(req.params.id)
    if (!file) throw new AppError('File not found', 404)
    const next = (file.currentVersion || file.versions.length) + 1
    file.versions.push({
      version: next,
      url: req.body.url,
      uploadedBy: req.user._id,
      note: req.body.note || `Version ${next}`,
    })
    file.currentVersion = next
    file.status = 'draft'
    await file.save()
    res.json({ success: true, file })
  }),
)

router.patch(
  '/files/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const file = await ProjectFile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    if (!file) throw new AppError('File not found', 404)

    if (req.body.status === 'sent' || req.body.status === 'approved') {
      await ActivityLog.create({
        projectId: file.projectId,
        actor: req.user._id,
        type: 'file_status',
        message: `${req.user.name} marked ${file.name} as ${req.body.status}`,
      })
    }
    res.json({ success: true, file })
  }),
)

/* ─── Procurement ─── */
router.get(
  '/vendors',
  requireAuth,
  asyncHandler(async (req, res) => {
    const vendors = await Vendor.find().sort({ name: 1 })
    res.json({ success: true, vendors })
  }),
)

router.post(
  '/vendors',
  requireAuth,
  asyncHandler(async (req, res) => {
    const vendor = await Vendor.create(req.body)
    res.status(201).json({ success: true, vendor })
  }),
)

router.get(
  '/purchase-orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    const pos = await PurchaseOrder.find(filter)
      .populate('vendor', 'name contact categories rating')
      .populate('projectId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
    res.json({ success: true, purchaseOrders: pos })
  }),
)

router.post(
  '/purchase-orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.create({
      ...req.body,
      createdBy: req.user._id,
      poNumber:
        req.body.poNumber || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
    })
    await po.populate('vendor', 'name')
    res.status(201).json({ success: true, purchaseOrder: po })
  }),
)

router.patch(
  '/purchase-orders/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('vendor', 'name')
    if (!po) throw new AppError('PO not found', 404)
    res.json({ success: true, purchaseOrder: po })
  }),
)

/* ─── Finance ─── */
router.get(
  '/expenses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    const expenses = await Expense.find(filter)
      .populate('submittedBy', 'name avatar')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
    res.json({ success: true, expenses })
  }),
)

router.post(
  '/expenses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const expense = await Expense.create({
      ...req.body,
      submittedBy: req.user._id,
    })
    res.status(201).json({ success: true, expense })
  }),
)

router.patch(
  '/expenses/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id)
    if (!expense) throw new AppError('Expense not found', 404)
    Object.assign(expense, req.body)
    if (req.body.status === 'approved') expense.approvedBy = req.user._id
    await expense.save()
    res.json({ success: true, expense })
  }),
)

router.get(
  '/payments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    const payments = await Payment.find(filter)
      .populate('vendorId', 'name')
      .populate('projectId', 'name')
      .sort({ dueDate: 1 })
    res.json({ success: true, payments })
  }),
)

router.get(
  '/finance/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await Project.find().select(
      'name budget spent status clientName progress',
    )
    const expenses = await Expense.find({ status: 'approved' })
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0)
    const pnl = projects.map((p) => ({
      id: p._id,
      name: p.name,
      quoted: p.budget,
      costs: p.spent,
      profit: (p.budget || 0) - (p.spent || 0),
      margin:
        p.budget > 0
          ? Math.round((((p.budget || 0) - (p.spent || 0)) / p.budget) * 100)
          : 0,
    }))

    res.json({
      success: true,
      data: {
        totalBudget,
        totalSpent,
        variance: totalBudget - totalSpent,
        expenseCount: expenses.length,
        pnl,
        projects,
      },
    })
  }),
)

/* ─── Site updates & snags ─── */
router.get(
  '/site-updates',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    const updates = await SiteUpdate.find(filter)
      .populate('author', 'name avatar')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
    res.json({ success: true, updates })
  }),
)

router.post(
  '/site-updates',
  requireAuth,
  asyncHandler(async (req, res) => {
    const update = await SiteUpdate.create({
      ...req.body,
      author: req.user._id,
    })
    await update.populate('author', 'name avatar')

    await ActivityLog.create({
      projectId: update.projectId,
      actor: req.user._id,
      type: 'site_update',
      message: `${req.user.name} posted a site update`,
    })

    res.status(201).json({ success: true, update })
  }),
)

router.get(
  '/snags',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    const snags = await Snag.find(filter)
      .populate('assignee', 'name avatar')
      .sort({ createdAt: -1 })
    res.json({ success: true, snags })
  }),
)

router.post(
  '/snags',
  requireAuth,
  asyncHandler(async (req, res) => {
    const snag = await Snag.create(req.body)
    res.status(201).json({ success: true, snag })
  }),
)

router.patch(
  '/snags/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const snag = await Snag.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('assignee', 'name avatar')
    if (!snag) throw new AppError('Snag not found', 404)

    if (req.body.convertToTask && snag.status === 'open') {
      const task = await Task.create({
        projectId: snag.projectId,
        title: `Snag: ${snag.title}`,
        stage: 'execution',
        status: 'todo',
        priority: 'high',
        assignee: snag.assignee,
        createdBy: req.user._id,
      })
      snag.taskId = task._id
      await snag.save()
      return res.json({ success: true, snag, task })
    }

    res.json({ success: true, snag })
  }),
)

/* ─── Notifications & activity ─── */
router.get(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ success: true, notifications })
  }),
)

router.patch(
  '/notifications/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true },
    )
    res.json({ success: true, notification: n })
  }),
)

router.post(
  '/notifications/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true })
    res.json({ success: true })
  }),
)

router.get(
  '/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.projectId) filter.projectId = req.query.projectId
    const activity = await ActivityLog.find(filter)
      .populate('actor', 'name avatar')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ success: true, activity })
  }),
)

/* ─── Reports ─── */
router.get(
  '/reports/overview',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await Project.find()
    const tasks = await Task.find()
    const leads = await Lead.find()
    const pos = await PurchaseOrder.find()

    const onTime = projects.filter(
      (p) => !p.isDelayed && p.status !== 'delayed',
    ).length
    const onTimePct = projects.length
      ? Math.round((onTime / projects.length) * 100)
      : 0

    const pipelineValue = leads
      .filter((l) => !['won', 'lost'].includes(l.stage))
      .reduce((s, l) => s + (l.estimatedValue || 0), 0)

    const team = await User.find({
      role: { $in: ['project_manager', 'designer', 'site_supervisor'] },
    }).select('name avatar role')

    const teamPerf = await Promise.all(
      team.map(async (u) => {
        const done = await Task.countDocuments({ assignee: u._id, status: 'done' })
        const open = await Task.countDocuments({
          assignee: u._id,
          status: { $ne: 'done' },
        })
        return { user: u, done, open }
      }),
    )

    res.json({
      success: true,
      data: {
        health: {
          total: projects.length,
          delayed: projects.filter((p) => p.isDelayed || p.status === 'delayed')
            .length,
          onTimePct,
        },
        budgetVariance: projects.reduce(
          (s, p) => s + ((p.budget || 0) - (p.spent || 0)),
          0,
        ),
        crmPipelineValue: pipelineValue,
        leadStages: [
          'new_enquiry',
          'site_visit',
          'quotation_sent',
          'negotiation',
          'won',
          'lost',
        ].map((stage) => ({
          stage,
          count: leads.filter((l) => l.stage === stage).length,
        })),
        vendorPerformance: {
          totalPOs: pos.length,
          delivered: pos.filter((p) => p.status === 'delivered').length,
          inTransit: pos.filter((p) => p.status === 'in_transit').length,
        },
        teamPerf,
        taskCompletion: {
          done: tasks.filter((t) => t.status === 'done').length,
          total: tasks.length,
        },
      },
    })
  }),
)

/* ─── Assigned Comments (ClickUp-style) ─── */
router.get(
  '/comments/assigned',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.user._id
    const { scope = 'to_me', resolved, q, days } = req.query
    const since = new Date()
    since.setDate(since.getDate() - (Number(days) || 90))

    const filter = {
      createdAt: { $gte: since },
      taskId: { $ne: null },
    }

    if (resolved === 'true') filter.resolved = true
    else if (resolved !== 'all') filter.resolved = { $ne: true }

    if (scope === 'by_me') {
      // Delegated by me — I authored & tagged/assigned someone else
      filter.author = me
      filter.$or = [
        { assignedTo: { $exists: true, $ne: null, $nin: [me] } },
        { 'mentions.0': { $exists: true } },
      ]
    } else {
      // Assigned to me — tagged, assigned, or comments on my tasks
      const myTasks = await Task.find({ assignee: me }).select('_id')
      const myTaskIds = myTasks.map((t) => t._id)
      filter.$or = [
        { assignedTo: me },
        { mentions: me },
        { taskId: { $in: myTaskIds }, author: { $ne: me } },
      ]
    }

    if (q) {
      filter.body = new RegExp(q, 'i')
    }

    const comments = await Comment.find(filter)
      .populate('author', 'name avatar email')
      .populate('assignedTo', 'name avatar')
      .populate('mentions', 'name avatar')
      .populate({
        path: 'taskId',
        select: 'title status projectId assignee',
        populate: { path: 'projectId', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .limit(100)

    res.json({ success: true, comments })
  }),
)

router.patch(
  '/comments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id)
    if (!comment) throw new AppError('Comment not found', 404)

    if (req.body.resolved === true) {
      comment.resolved = true
      comment.resolvedAt = new Date()
      comment.resolvedBy = req.user._id
    }
    if (req.body.resolved === false) {
      comment.resolved = false
      comment.resolvedAt = null
      comment.resolvedBy = undefined
    }
    if (req.body.assignedTo !== undefined) {
      comment.assignedTo = req.body.assignedTo || undefined
    }
    await comment.save()
    await comment.populate('author', 'name avatar')
    await comment.populate('assignedTo', 'name avatar')
    res.json({ success: true, comment })
  }),
)

/* ─── Users (for assignees) ─── */
router.get(
  '/users',
  requireAuth,
  asyncHandler(async (req, res) => {
    const users = await User.find({ isActive: true })
      .select('name email avatar role title')
      .sort({ name: 1 })
    res.json({ success: true, users })
  }),
)

export default router
