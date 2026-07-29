import crypto from 'crypto'
import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { upload } from '../middleware/upload.js'
import {
  assertProjectAccess,
  isOpsUser,
  scopeProjects,
} from '../lib/projectScope.js'
import { notifyUser, actorSummary } from '../lib/notify.js'
import {
  canManageEmployeeAccess,
  requirePermission,
  resolvePermissions,
  sanitizePermissionOverrides,
} from '../lib/permissions.js'
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
  requirePermission('leads'),
  asyncHandler(async (req, res) => {
    const leads = await Lead.find(tenantFilter(req, {}))
      .populate('owner', 'name avatar')
      .sort({ updatedAt: -1 })
    res.json({ success: true, leads })
  }),
)

router.post(
  '/leads',
  requireAuth,
  requirePermission('leads'),
  asyncHandler(async (req, res) => {
    const lead = await Lead.create(withTenant(req, { ...req.body, owner: req.user._id }))
    res.status(201).json({ success: true, lead })
  }),
)

router.patch(
  '/leads/:id',
  requireAuth,
  requirePermission('leads'),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id)
    assertTenantDoc(lead, req, 'Lead')
    Object.assign(lead, req.body)
    await lead.save()
    await lead.populate('owner', 'name avatar')
    res.json({ success: true, lead })
  }),
)

router.post(
  '/leads/:id/convert',
  requireAuth,
  requirePermission('leads'),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id)
    assertTenantDoc(lead, req, 'Lead')

    const project = await Project.create(
      withTenant(req, {
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
      }),
    )

    const quotation = await Quotation.create(
      withTenant(req, {
        projectId: project._id,
        leadId: lead._id,
        title: `${lead.clientName} — Quotation`,
        versionLabel: 'Standard',
        status: 'draft',
        items: [],
        createdBy: req.user._id,
      }),
    )

    lead.stage = 'won'
    lead.convertedProjectId = project._id
    await lead.save()

    await ActivityLog.create(
      withTenant(req, {
        projectId: project._id,
        actor: req.user._id,
        type: 'lead_converted',
        message: `${req.user.name} converted lead “${lead.clientName}” to a project`,
      }),
    )

    res.status(201).json({ success: true, project, quotation })
  }),
)

/* ─── Quotations / BOQ ─── */
router.get(
  '/quotations',
  requireAuth,
  requirePermission('boq'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    } else if (req.query.leadId) {
      filter.leadId = req.query.leadId
    } else if (!isOpsUser(req.user)) {
      const allowed = await Project.find(
        tenantFilter(req, scopeProjects(req.user)),
      ).select('_id')
      filter.projectId = { $in: allowed.map((p) => p._id) }
    }
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
  requirePermission('boq'),
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('projectId', 'name clientName')
    assertTenantDoc(quotation, req, 'Quotation')
    res.json({ success: true, quotation })
  }),
)

router.post(
  '/quotations',
  requireAuth,
  requirePermission('boq'),
  asyncHandler(async (req, res) => {
    const items = req.body.items || []
    if (req.body.projectId) await assertProjectAccess(req, req.body.projectId)
    const subtotal = items.reduce((s, i) => s + (i.amount || i.qty * i.rate || 0), 0)
    const gstPercent = req.body.gstPercent ?? 18
    const discount = req.body.discount || 0
    const grandTotal = subtotal + (subtotal * gstPercent) / 100 - discount

    const quotation = await Quotation.create(
      withTenant(req, {
        ...req.body,
        items,
        subtotal,
        gstPercent,
        discount,
        grandTotal,
        createdBy: req.user._id,
      }),
    )
    res.status(201).json({ success: true, quotation })
  }),
)

router.patch(
  '/quotations/:id',
  requireAuth,
  requirePermission('boq'),
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
    assertTenantDoc(quotation, req, 'Quotation')

    const allowed = [
      'title',
      'versionLabel',
      'status',
      'items',
      'attachments',
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
        const project = await Project.findById(quotation.projectId)
        assertTenantDoc(project, req, 'Project')
        const updates = { budget: quotation.grandTotal }
        // Move journey forward into buying materials when still in early stages
        if (
          !project.currentStage ||
          project.currentStage === 'design' ||
          project.currentStage === 'planning'
        ) {
          updates.currentStage = 'procurement'
        }
        await Project.findByIdAndUpdate(quotation.projectId, updates)
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

router.delete(
  '/quotations/:id',
  requireAuth,
  requirePermission('boq'),
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
    assertTenantDoc(quotation, req, 'Quotation')
    await quotation.deleteOne()
    res.json({ success: true })
  }),
)

/**
 * Store a reference image for a BOQ and hand the URL back.
 * Stateless so unsaved (draft) sheets can attach images before their first save.
 */
router.post(
  '/quotations/upload-image',
  requireAuth,
  requirePermission('boq'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Image file is required', 400)
    if (!String(req.file.mimetype || '').startsWith('image/')) {
      throw new AppError('Only image files are allowed here', 400)
    }
    res.status(201).json({
      success: true,
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname || 'Reference image',
      mime: req.file.mimetype,
    })
  }),
)

/* ─── Files ─── */
router.get(
  '/files',
  requireAuth,
  requirePermission('files.manage'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
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

    const file = await ProjectFile.create(
      withTenant(req, {
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
      }),
    )

    await ActivityLog.create(
      withTenant(req, {
        projectId,
        actor: req.user._id,
        type: 'file_uploaded',
        message: `${req.user.name} uploaded ${name}`,
      }),
    )

    res.status(201).json({ success: true, file })
  }),
)

router.post(
  '/files/:id/version',
  requireAuth,
  requirePermission('files.manage'),
  asyncHandler(async (req, res) => {
    const file = await ProjectFile.findById(req.params.id)
    assertTenantDoc(file, req, 'File')
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
  requirePermission('files.manage'),
  asyncHandler(async (req, res) => {
    const file = await ProjectFile.findById(req.params.id)
    assertTenantDoc(file, req, 'File')
    Object.assign(file, req.body)
    await file.save()

    if (req.body.status === 'sent' || req.body.status === 'approved') {
      await ActivityLog.create(
        withTenant(req, {
          projectId: file.projectId,
          actor: req.user._id,
          type: 'file_status',
          message: `${req.user.name} marked ${file.name} as ${req.body.status}`,
        }),
      )
    }
    res.json({ success: true, file })
  }),
)

/* ─── Procurement ─── */
router.get(
  '/vendors',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const vendors = await Vendor.find(tenantFilter(req, {})).sort({ name: 1 })
    res.json({ success: true, vendors })
  }),
)

router.post(
  '/vendors',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const vendor = await Vendor.create(withTenant(req, req.body))
    res.status(201).json({ success: true, vendor })
  }),
)

router.get(
  '/purchase-orders',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    }
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
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    if (req.body.projectId) await assertProjectAccess(req, req.body.projectId)
    const po = await PurchaseOrder.create(
      withTenant(req, {
        ...req.body,
        createdBy: req.user._id,
        poNumber:
          req.body.poNumber || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      }),
    )
    await po.populate('vendor', 'name')
    res.status(201).json({ success: true, purchaseOrder: po })
  }),
)

router.patch(
  '/purchase-orders/:id',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findById(req.params.id)
    assertTenantDoc(po, req, 'PO')
    Object.assign(po, req.body)
    await po.save()
    await po.populate('vendor', 'name')
    res.json({ success: true, purchaseOrder: po })
  }),
)

/* ─── Finance ─── */
router.get(
  '/expenses',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    }
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
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const amount = Number(req.body.amount)
    if (!req.body.projectId) throw new AppError('Project is required', 400)
    await assertProjectAccess(req, req.body.projectId)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Expense amount must be greater than zero', 400)
    }
    const expense = await Expense.create(
      withTenant(req, {
        ...req.body,
        amount,
        status: 'pending',
        submittedBy: req.user._id,
      }),
    )
    res.status(201).json({ success: true, expense })
  }),
)

router.patch(
  '/expenses/:id',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id)
    assertTenantDoc(expense, req, 'Expense')
    const status = req.body.status
    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError('Status must be approved or rejected', 400)
    }
    if (expense.status !== 'pending') {
      throw new AppError('Only pending expenses can be reviewed', 409)
    }
    expense.status = status
    if (status === 'approved') expense.approvedBy = req.user._id
    await expense.save()
    await expense.populate('submittedBy', 'name avatar')
    await expense.populate('approvedBy', 'name avatar')
    await expense.populate('projectId', 'name')
    res.json({ success: true, expense })
  }),
)

router.get(
  '/payments',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    }
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
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const [projects, approvedExpenses, pendingExpenses, committedOrders] =
      await Promise.all([
        Project.find(tenantFilter(req, {}))
          .select('name budget spent status clientName progress')
          .lean(),
        Expense.find(tenantFilter(req, { status: 'approved' }))
          .select('projectId amount')
          .lean(),
        Expense.find(tenantFilter(req, { status: 'pending' }))
          .select('projectId amount')
          .lean(),
        PurchaseOrder.find(
          tenantFilter(req, {
            status: { $in: ['approved', 'ordered', 'in_transit', 'delivered'] },
          }),
        )
          .select('projectId value')
          .lean(),
      ])

    const sumByProject = (rows, amountKey) => {
      const totals = new Map()
      for (const row of rows) {
        const key = String(row.projectId || '')
        totals.set(key, (totals.get(key) || 0) + (Number(row[amountKey]) || 0))
      }
      return totals
    }

    const approvedByProject = sumByProject(approvedExpenses, 'amount')
    const pendingByProject = sumByProject(pendingExpenses, 'amount')
    const committedByProject = sumByProject(committedOrders, 'value')

    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const pnl = projects.map((p) => {
      const id = String(p._id)
      const quoted = Number(p.budget) || 0
      const recordedCosts = Number(p.spent) || 0
      const approvedExpensesTotal = approvedByProject.get(id) || 0
      const costs = recordedCosts + approvedExpensesTotal
      const profit = quoted - costs
      return {
        id: p._id,
        name: p.name,
        quoted,
        recordedCosts,
        approvedExpenses: approvedExpensesTotal,
        pendingExpenses: pendingByProject.get(id) || 0,
        committed: committedByProject.get(id) || 0,
        costs,
        profit,
        margin: quoted > 0 ? (profit / quoted) * 100 : null,
        health:
          quoted <= 0 ? 'no_budget' : profit < 0 ? 'over_budget' : 'on_track',
      }
    })
    const totalSpent = pnl.reduce((sum, row) => sum + row.costs, 0)
    const pendingAmount = pendingExpenses.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0,
    )
    const committedAmount = committedOrders.reduce(
      (sum, po) => sum + (Number(po.value) || 0),
      0,
    )

    res.json({
      success: true,
      data: {
        totalBudget,
        totalSpent,
        variance: totalBudget - totalSpent,
        approvedExpenseCount: approvedExpenses.length,
        pendingExpenseCount: pendingExpenses.length,
        pendingAmount,
        committedAmount,
        pnl,
      },
    })
  }),
)

/* ─── Site updates & snags ─── */
router.get(
  '/site-updates',
  requireAuth,
  requirePermission('site'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    } else if (!isOpsUser(req.user)) {
      const projects = await Project.find(
        tenantFilter(req, scopeProjects(req.user)),
      ).select('_id')
      filter.projectId = { $in: projects.map((project) => project._id) }
    }
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
  requirePermission('site'),
  asyncHandler(async (req, res) => {
    if (!req.body.projectId) throw new AppError('Project is required', 400)
    await assertProjectAccess(req, req.body.projectId)
    const update = await SiteUpdate.create(
      withTenant(req, {
        ...req.body,
        author: req.user._id,
      }),
    )
    await update.populate('author', 'name avatar')

    await ActivityLog.create(
      withTenant(req, {
        projectId: update.projectId,
        actor: req.user._id,
        type: 'site_update',
        message: `${req.user.name} posted a site update`,
      }),
    )

    res.status(201).json({ success: true, update })
  }),
)

router.get(
  '/snags',
  requireAuth,
  requirePermission('site'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
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
  requirePermission('site'),
  asyncHandler(async (req, res) => {
    const snag = await Snag.create(withTenant(req, req.body))
    res.status(201).json({ success: true, snag })
  }),
)

router.patch(
  '/snags/:id',
  requireAuth,
  requirePermission('site'),
  asyncHandler(async (req, res) => {
    const snag = await Snag.findById(req.params.id)
    assertTenantDoc(snag, req, 'Snag')
    Object.assign(snag, req.body)
    await snag.save()
    await snag.populate('assignee', 'name avatar')

    if (req.body.convertToTask && snag.status === 'open') {
      const task = await Task.create(
        withTenant(req, {
          projectId: snag.projectId,
          title: `Snag: ${snag.title}`,
          stage: 'execution',
          status: 'todo',
          priority: 'high',
          assignee: snag.assignee,
          createdBy: req.user._id,
        }),
      )
      snag.taskId = task._id
      await snag.save()

      if (task.assignee) {
        const project = await Project.findById(snag.projectId).select('name').lean()
        await notifyUser(req, {
          userId: task.assignee._id || task.assignee,
          type: 'task_assigned',
          title: `${req.user.name} assigned you a snag fix`,
          body: task.title,
          projectId: snag.projectId,
          link: `/projects/${snag.projectId}/tasks?task=${task._id}`,
          meta: {
            taskId: String(task._id),
            taskTitle: task.title,
            projectId: String(snag.projectId),
            projectName: project?.name || '',
            priority: 'high',
            status: 'todo',
            dueDate: null,
            actor: actorSummary(req.user),
          },
        })
      }

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
    const notifications = await Notification.find(
      tenantFilter(req, { userId: req.user._id }),
    )
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
      tenantFilter(req, { _id: req.params.id, userId: req.user._id }),
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
    await Notification.updateMany(
      tenantFilter(req, { userId: req.user._id, read: false }),
      { read: true },
    )
    res.json({ success: true })
  }),
)

router.get(
  '/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    } else if (!isOpsUser(req.user)) {
      // Employees only see activity from projects they can access
      const projects = await Project.find(
        tenantFilter(req, scopeProjects(req.user)),
      ).select('_id')
      filter.projectId = { $in: projects.map((p) => p._id) }
    }
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
  requirePermission('portfolio'),
  asyncHandler(async (req, res) => {
    const projects = await Project.find(tenantFilter(req, {}))
    const tasks = await Task.find(tenantFilter(req, {}))
    const leads = await Lead.find(tenantFilter(req, {}))
    const pos = await PurchaseOrder.find(tenantFilter(req, {}))

    const onTime = projects.filter(
      (p) => !p.isDelayed && p.status !== 'delayed',
    ).length
    const onTimePct = projects.length
      ? Math.round((onTime / projects.length) * 100)
      : 0

    const pipelineValue = leads
      .filter((l) => !['won', 'lost'].includes(l.stage))
      .reduce((s, l) => s + (l.estimatedValue || 0), 0)

    const team = await User.find(
      tenantFilter(req, { isPlatformAdmin: { $ne: true } }),
    )
      .select('name avatar role title isActive createdAt')
      .sort({ name: 1 })

    const now = new Date()
    const taskBuckets = new Map()
    for (const task of tasks) {
      if (!task.assignee) continue
      const key = String(task.assignee)
      const bucket = taskBuckets.get(key) || {
        total: 0,
        done: 0,
        open: 0,
        overdue: 0,
        review: 0,
        inProgress: 0,
        trackedSeconds: 0,
      }
      bucket.total += 1
      bucket.trackedSeconds += Number(task.timeSpent) || 0
      if (task.status === 'done') bucket.done += 1
      else bucket.open += 1
      if (task.status === 'review') bucket.review += 1
      if (task.status === 'in_progress') bucket.inProgress += 1
      if (task.status !== 'done' && task.dueDate && new Date(task.dueDate) < now) {
        bucket.overdue += 1
      }
      taskBuckets.set(key, bucket)
    }

    const teamPerf = team.map((user) => {
      const metrics = taskBuckets.get(String(user._id)) || {
        total: 0,
        done: 0,
        open: 0,
        overdue: 0,
        review: 0,
        inProgress: 0,
        trackedSeconds: 0,
      }
      return {
        user,
        ...metrics,
        completionRate: metrics.total
          ? Math.round((metrics.done / metrics.total) * 100)
          : 0,
        trackedHours: Math.round((metrics.trackedSeconds / 3600) * 10) / 10,
      }
    })

    const taskStatus = ['todo', 'in_progress', 'review', 'done'].map((status) => ({
      status,
      count: tasks.filter((task) => task.status === status).length,
    }))

    const projectHealth = projects
      .map((project) => {
        const projectTasks = tasks.filter(
          (task) => String(task.projectId || '') === String(project._id),
        )
        const done = projectTasks.filter((task) => task.status === 'done').length
        const overdue = projectTasks.filter(
          (task) =>
            task.status !== 'done' &&
            task.dueDate &&
            new Date(task.dueDate) < now,
        ).length
        return {
          _id: project._id,
          name: project.name,
          status: project.status,
          isDelayed: !!project.isDelayed || project.status === 'delayed',
          budget: Number(project.budget) || 0,
          spent: Number(project.spent) || 0,
          totalTasks: projectTasks.length,
          done,
          overdue,
          progress: projectTasks.length
            ? Math.round((done / projectTasks.length) * 100)
            : Number(project.progress) || 0,
        }
      })
      .sort((a, b) => b.overdue - a.overdue || a.progress - b.progress)

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
        taskStatus,
        projectHealth,
        taskCompletion: {
          done: tasks.filter((t) => t.status === 'done').length,
          total: tasks.length,
          overdue: tasks.filter(
            (t) =>
              t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now,
          ).length,
          unassigned: tasks.filter((t) => !t.assignee).length,
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

    const filter = tenantFilter(req, {
      createdAt: { $gte: since },
      taskId: { $ne: null },
    })

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
      const myTasks = await Task.find(tenantFilter(req, { assignee: me })).select('_id')
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
    assertTenantDoc(comment, req, 'Comment')

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
    const filter = tenantFilter(req, {
      isPlatformAdmin: { $ne: true },
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    })
    let users = await User.find(filter)
      .select('name email avatar role title isActive')
      .sort({ name: 1 })
      .lean()

    // Fallback: tenant members without active filter (legacy rows)
    if (!users.length) {
      users = await User.find(tenantFilter(req, { isPlatformAdmin: { $ne: true } }))
        .select('name email avatar role title isActive')
        .sort({ name: 1 })
        .lean()
    }

    res.json({ success: true, users })
  }),
)

/* ─── Admin team summary (People hub) ─── */
router.get(
  '/admin/team-summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (
      !['admin', 'owner', 'hr'].includes(req.user.role) &&
      !req.user.isPlatformAdmin
    ) {
      throw new AppError('Admin / HR only', 403)
    }

    const users = await User.find(
      tenantFilter(req, { isPlatformAdmin: { $ne: true } }),
    )
      .select('name email avatar role title isActive permissions createdAt')
      .sort({ name: 1 })
      .lean()

    const now = new Date()
    const members = await Promise.all(
      users.map(async (u) => {
        const base = tenantFilter(req, { assignee: u._id })
        const [open, overdue, done, timeAgg] = await Promise.all([
          Task.countDocuments({
            ...base,
            status: { $ne: 'done' },
          }),
          Task.countDocuments({
            ...base,
            status: { $ne: 'done' },
            dueDate: { $lt: now },
          }),
          Task.countDocuments({
            ...base,
            status: 'done',
          }),
          Task.aggregate([
            { $match: { ...base } },
            {
              $group: {
                _id: null,
                timeSpent: { $sum: { $ifNull: ['$timeSpent', 0] } },
              },
            },
          ]),
        ])
        return {
          user: {
            ...u,
            permissions:
              u.permissions && typeof u.permissions === 'object'
                ? { ...u.permissions }
                : {},
            effectivePermissions: resolvePermissions(u),
          },
          open,
          overdue,
          done,
          timeSpent: timeAgg[0]?.timeSpent || 0,
        }
      }),
    )

    res.json({
      success: true,
      data: {
        totalMembers: users.length,
        activeMembers: users.filter((u) => u.isActive !== false).length,
        members,
      },
    })
  }),
)

router.patch(
  '/admin/users/:id/permissions',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageEmployeeAccess(req.user)) {
      throw new AppError('Only an Admin or Owner can manage employee access', 403)
    }

    const target = await User.findOne(
      tenantFilter(req, {
        _id: req.params.id,
        isPlatformAdmin: { $ne: true },
      }),
    )
    if (!target) throw new AppError('Employee not found', 404)

    if (req.body.permissions !== undefined) {
      target.permissions = sanitizePermissionOverrides(req.body.permissions)
      target.markModified('permissions')
    }
    if (typeof req.body.isActive === 'boolean') {
      if (String(target._id) === String(req.user._id) && !req.body.isActive) {
        throw new AppError('You cannot deactivate your own account', 400)
      }
      target.isActive = req.body.isActive
    }
    await target.save()

    const safeUser = target.toSafeJSON()
    const effectivePermissions = resolvePermissions(target)
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${String(target._id)}`).emit('permissions:updated', {
        permissions: safeUser.permissions,
        effectivePermissions,
      })
    }

    res.json({
      success: true,
      user: {
        ...safeUser,
        effectivePermissions,
      },
    })
  }),
)

router.post(
  '/admin/users/:id/reset-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!['admin', 'owner'].includes(req.user.role)) {
      throw new AppError('Only a company Admin or Owner can reset passwords', 403)
    }

    if (String(req.user._id) === String(req.params.id)) {
      throw new AppError('Use Settings to change your own password', 400)
    }

    const target = await User.findOne(
      tenantFilter(req, {
        _id: req.params.id,
        isPlatformAdmin: { $ne: true },
      }),
    ).select('+refreshTokens +password')
    if (!target) throw new AppError('Company user not found', 404)

    if (req.user.role === 'admin' && target.role === 'owner') {
      throw new AppError('Only an Owner can reset another Owner password', 403)
    }

    const tempPassword = crypto.randomBytes(8).toString('hex')
    target.password = tempPassword
    target.mustChangePassword = true
    target.refreshTokens = []
    await target.save()

    res.json({
      success: true,
      user: target.toSafeJSON(),
      tempPassword,
      message: 'Password reset. Share the temporary password securely.',
    })
  }),
)

export default router
