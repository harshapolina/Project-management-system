import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { requirePermission } from '../lib/permissions.js'
import { upload } from '../middleware/upload.js'
import { VendorInvoice } from '../models/VendorInvoice.js'
import { Vendor, PurchaseOrder } from '../models/ProcurementFinance.js'

const router = express.Router()

function resolveStatus(doc) {
  if (doc.status === 'paid' || doc.status === 'cancelled') return doc.status
  if (doc.dueDate && new Date(doc.dueDate) < new Date()) return 'overdue'
  return doc.status === 'overdue' ? 'unpaid' : doc.status || 'unpaid'
}

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc }
  obj.status = resolveStatus(obj)
  return obj
}

/** Vendors + POs for invoice form (finance users may not have procurement). */
router.get(
  '/billing/options',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const [vendors, purchaseOrders] = await Promise.all([
      Vendor.find(tenantFilter(req, {})).sort({ name: 1 }).lean(),
      PurchaseOrder.find(tenantFilter(req, {}))
        .sort({ createdAt: -1 })
        .populate('vendor', 'name')
        .populate('projectId', 'name')
        .lean(),
    ])
    res.json({ success: true, vendors, purchaseOrders })
  }),
)

router.get(
  '/billing/summary',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const invoices = await VendorInvoice.find(tenantFilter(req, {})).lean()
    const now = Date.now()
    let unpaidAmount = 0
    let paidAmount = 0
    let overdueCount = 0
    let paidThisMonth = 0
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    for (const inv of invoices) {
      const status = resolveStatus(inv)
      if (status === 'paid') {
        paidAmount += inv.amount || 0
        if (inv.paidAt && new Date(inv.paidAt) >= monthStart) {
          paidThisMonth += inv.amount || 0
        }
      } else if (status !== 'cancelled') {
        unpaidAmount += inv.amount || 0
        if (status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < now)) {
          overdueCount += 1
        }
      }
    }

    res.json({
      success: true,
      summary: {
        total: invoices.length,
        unpaidAmount,
        paidAmount,
        paidThisMonth,
        overdueCount,
      },
    })
  }),
)

router.get(
  '/billing/invoices',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const { status, vendorId, q } = req.query
    const filter = tenantFilter(req, {})
    if (vendorId) filter.vendor = vendorId

    let invoices = await VendorInvoice.find(filter)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .populate('vendor', 'name contact phone email gst')
      .populate('purchaseOrder', 'poNumber value status')
      .populate('projectId', 'name clientName')
      .populate('createdBy', 'name avatar')
      .lean()

    invoices = invoices.map(serialize)

    if (status && status !== 'all') {
      invoices = invoices.filter((inv) => inv.status === status)
    }
    if (q && String(q).trim()) {
      const needle = String(q).trim().toLowerCase()
      invoices = invoices.filter((inv) => {
        const hay = [
          inv.invoiceNumber,
          inv.vendor?.name,
          inv.purchaseOrder?.poNumber,
          inv.projectId?.name,
          inv.notes,
          inv.fileName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }

    res.json({ success: true, invoices })
  }),
)

router.post(
  '/billing/invoices',
  requireAuth,
  requirePermission('finance'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const {
      invoiceNumber,
      vendorId,
      purchaseOrderId,
      projectId,
      amount,
      invoiceDate,
      dueDate,
      notes,
      status,
    } = req.body

    if (!invoiceNumber?.trim()) throw new AppError('Invoice number is required', 400)
    if (!vendorId) throw new AppError('Vendor is required', 400)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 0) {
      throw new AppError('Valid amount is required', 400)
    }

    const vendor = await Vendor.findOne(tenantFilter(req, { _id: vendorId }))
    if (!vendor) throw new AppError('Vendor not found', 404)

    let po = null
    if (purchaseOrderId) {
      po = await PurchaseOrder.findOne(
        tenantFilter(req, { _id: purchaseOrderId }),
      )
      if (!po) throw new AppError('Purchase order not found', 404)
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : ''
    const fileName = req.file?.originalname || ''
    const mimeType = req.file?.mimetype || ''

    const invoice = await VendorInvoice.create(
      withTenant(req, {
        invoiceNumber: invoiceNumber.trim(),
        vendor: vendor._id,
        purchaseOrder: po?._id || null,
        projectId: projectId || po?.projectId || null,
        amount: amt,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status === 'paid' ? 'paid' : 'unpaid',
        paidAt: status === 'paid' ? new Date() : null,
        fileUrl,
        fileName,
        mimeType,
        notes: notes || '',
        createdBy: req.user._id,
      }),
    )

    await invoice.populate([
      { path: 'vendor', select: 'name contact phone email gst' },
      { path: 'purchaseOrder', select: 'poNumber value status' },
      { path: 'projectId', select: 'name clientName' },
      { path: 'createdBy', select: 'name avatar' },
    ])

    res.status(201).json({ success: true, invoice: serialize(invoice) })
  }),
)

router.patch(
  '/billing/invoices/:id',
  requireAuth,
  requirePermission('finance'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const invoice = await VendorInvoice.findById(req.params.id)
    assertTenantDoc(invoice, req, 'Invoice')

    const allowed = [
      'invoiceNumber',
      'amount',
      'invoiceDate',
      'dueDate',
      'notes',
      'status',
      'vendor',
      'purchaseOrder',
      'projectId',
    ]
    for (const key of allowed) {
      if (req.body[key] === undefined) continue
      if (key === 'amount') invoice.amount = Number(req.body.amount)
      else if (key === 'invoiceDate' || key === 'dueDate') {
        invoice[key] = req.body[key] ? new Date(req.body[key]) : null
      } else if (key === 'vendor') invoice.vendor = req.body.vendor || req.body.vendorId
      else if (key === 'purchaseOrder') {
        invoice.purchaseOrder =
          req.body.purchaseOrder || req.body.purchaseOrderId || null
      } else if (key === 'status') {
        invoice.status = req.body.status
        if (req.body.status === 'paid' && !invoice.paidAt) {
          invoice.paidAt = new Date()
        }
        if (req.body.status !== 'paid') invoice.paidAt = null
      } else {
        invoice[key] = req.body[key]
      }
    }

    if (req.body.vendorId) invoice.vendor = req.body.vendorId
    if (req.body.purchaseOrderId !== undefined) {
      invoice.purchaseOrder = req.body.purchaseOrderId || null
    }

    if (req.file) {
      invoice.fileUrl = `/uploads/${req.file.filename}`
      invoice.fileName = req.file.originalname || ''
      invoice.mimeType = req.file.mimetype || ''
    }

    await invoice.save()
    await invoice.populate([
      { path: 'vendor', select: 'name contact phone email gst' },
      { path: 'purchaseOrder', select: 'poNumber value status' },
      { path: 'projectId', select: 'name clientName' },
      { path: 'createdBy', select: 'name avatar' },
    ])

    res.json({ success: true, invoice: serialize(invoice) })
  }),
)

router.delete(
  '/billing/invoices/:id',
  requireAuth,
  requirePermission('finance'),
  asyncHandler(async (req, res) => {
    const invoice = await VendorInvoice.findById(req.params.id)
    assertTenantDoc(invoice, req, 'Invoice')
    await invoice.deleteOne()
    res.json({ success: true })
  }),
)

export default router
