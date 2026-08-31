import express from 'express'
import { z } from 'zod'
import { ClientInvoice } from '../models/ClientInvoice.js'
import { Quotation } from '../models/LeadQuotationFile.js'
import { Project } from '../models/Project.js'
import { Tenant } from '../models/Tenant.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { tenantFilter, withTenant } from '../middleware/tenant.js'

const router = express.Router()

const DEFAULTS = {
  companyName: 'CUBIC ASSOCIATES PRIVATE LIMITED',
  companyAddress:
    '320, East Avenue, Fifth Floor, Ayyappa Society Main Rd, VI Phase, Madhapur, Hyderabad, Telangana 500081',
  companyGstin: '36AAJCC5637R1ZW',
  companyStateName: 'Telangana',
  companyStateCode: '36',
  companyPhone: '040-40047888',
  companyEmail: 'srinivas@cubicassociates.com',
  companyWebsite: 'www.cubicassociates.com',
  bank: {
    accountName: 'CUBIC ASSOCIATES PRIVATE LIMITED',
    bankName: 'HDFC BANK LTD',
    accountNo: '',
    branch: 'Hitex Kondapur',
    ifsc: 'HDFC0009628',
  },
}

function computeTotals(doc) {
  const items = (doc.items || []).map((it) => {
    const qty = Number(it.qty) || 0
    const rate = Number(it.rate) || 0
    const amount = Number(it.amount) || qty * rate
    return { ...it, qty, rate, amount }
  })
  const taxable = items.reduce((s, it) => s + it.amount, 0)

  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0

  if (doc.gstMode === 'igst') {
    igstAmount = (taxable * (Number(doc.igstPercent) || 18)) / 100
  } else {
    cgstAmount = (taxable * (Number(doc.cgstPercent) || 9)) / 100
    sgstAmount = (taxable * (Number(doc.sgstPercent) || 9)) / 100
  }

  const grandTotal = taxable + cgstAmount + sgstAmount + igstAmount

  return {
    items,
    taxableAmount: taxable,
    cgstAmount,
    sgstAmount,
    igstAmount,
    grandTotal,
  }
}

function mergeDefaults(body, tenant) {
  return {
    ...DEFAULTS,
    companyName: tenant?.name?.toUpperCase() || DEFAULTS.companyName,
    companyLogo: tenant?.logoUrl || '',
    ...body,
    bank: { ...DEFAULTS.bank, ...(body.bank || {}) },
    consignee: body.consignee || {},
    buyer: body.buyer || {},
  }
}

const lineSchema = z.object({
  description: z.string().optional(),
  hsnSac: z.string().optional(),
  gstRate: z.number().optional(),
  qty: z.number().optional(),
  unit: z.string().optional(),
  rate: z.number().optional(),
  amount: z.number().optional(),
})

router.get(
  '/tax-invoices',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) filter.projectId = req.query.projectId
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status
    }
    const q = String(req.query.q || '').trim()
    if (q) {
      filter.$or = [
        { invoiceNumber: new RegExp(q, 'i') },
        { 'buyer.name': new RegExp(q, 'i') },
        { 'consignee.name': new RegExp(q, 'i') },
      ]
    }

    const invoices = await ClientInvoice.find(filter)
      .populate('projectId', 'name clientName')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(200)
      .lean()

    res.json({ success: true, invoices })
  }),
)

router.get(
  '/tax-invoices/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const inv = await ClientInvoice.findOne(
      tenantFilter(req, { _id: req.params.id }),
    )
      .populate('projectId', 'name clientName clientEmail location address')
      .populate('quotationId', 'title versionLabel grandTotal')
      .lean()
    if (!inv) throw new AppError('Tax invoice not found', 404)
    res.json({ success: true, invoice: inv })
  }),
)

router.post(
  '/tax-invoices/from-quotation/:quotationId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findOne(
      tenantFilter(req, { _id: req.params.quotationId }),
    ).lean()
    if (!quotation) throw new AppError('Quotation not found', 404)

    const tenant = req.tenant || (await Tenant.findById(req.tenantId))
    const project = quotation.projectId
      ? await Project.findById(quotation.projectId).lean()
      : null

    const meta = quotation.docMeta || {}
    const items = (quotation.items || [])
      .filter((it) => it.description?.trim())
      .map((it) => {
        const qty = Number(it.qty) || 1
        const rate = Number(it.rate) || 0
        return {
          description: it.description,
          hsnSac: it.hsnSac || '998391',
          gstRate: Number(quotation.gstPercent) || 18,
          qty,
          unit: (it.unit || 'nos').toUpperCase(),
          rate,
          amount: Number(it.amount) || qty * rate,
        }
      })

    const buyerName = meta.customerName || project?.clientName || ''
    const buyerAddress =
      meta.clientAddress || project?.location || project?.address || ''

    const count = await ClientInvoice.countDocuments(tenantFilter(req, {}))
    const invoiceNumber = `CAPL-${count + 1}`

    const draft = mergeDefaults(
      {
        invoiceNumber,
        invoiceDate: new Date(),
        projectId: quotation.projectId,
        quotationId: quotation._id,
        items,
        buyer: {
          name: buyerName,
          address: buyerAddress,
          gstin: meta.buyerGstin || project?.clientGstin || '',
          stateName: meta.buyerStateName || '',
          stateCode: meta.buyerStateCode || '',
        },
        consignee: {
          name: buyerName,
          address: buyerAddress,
          gstin: meta.buyerGstin || project?.clientGstin || '',
          stateName: meta.buyerStateName || '',
          stateCode: meta.buyerStateCode || '',
        },
        buyersOrderNo: meta.quoteNo || quotation.versionLabel || '',
        createdBy: req.user._id,
      },
      tenant,
    )

    const totals = computeTotals(draft)
    const invoice = await ClientInvoice.create(
      withTenant(req, { ...draft, ...totals }),
    )

    res.status(201).json({ success: true, invoice })
  }),
)

router.post(
  '/tax-invoices',
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string().optional(),
      invoiceType: z.enum(['tax', 'proforma']).optional(),
      status: z.enum(['draft', 'issued', 'paid', 'cancelled']).optional(),
      projectId: z.string().optional(),
      quotationId: z.string().optional(),
      companyName: z.string().optional(),
      companyAddress: z.string().optional(),
      companyGstin: z.string().optional(),
      companyStateName: z.string().optional(),
      companyStateCode: z.string().optional(),
      companyPhone: z.string().optional(),
      companyEmail: z.string().optional(),
      companyWebsite: z.string().optional(),
      companyLogo: z.string().optional(),
      buyersOrderNo: z.string().optional(),
      buyersOrderDate: z.string().optional(),
      deliveryNote: z.string().optional(),
      modeOfPayment: z.string().optional(),
      referenceNo: z.string().optional(),
      dispatchDocNo: z.string().optional(),
      dispatchedThrough: z.string().optional(),
      destination: z.string().optional(),
      consignee: z.record(z.string()).optional(),
      buyer: z.record(z.string()).optional(),
      items: z.array(lineSchema).optional(),
      gstMode: z.enum(['cgst_sgst', 'igst']).optional(),
      cgstPercent: z.number().optional(),
      sgstPercent: z.number().optional(),
      igstPercent: z.number().optional(),
      bank: z.record(z.string()).optional(),
      signatoryName: z.string().optional(),
      signatoryTitle: z.string().optional(),
      declaration: z.string().optional(),
      jurisdiction: z.string().optional(),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tenant = req.tenant || (await Tenant.findById(req.tenantId))
    const merged = mergeDefaults(
      { ...data, createdBy: req.user._id, invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date() },
      tenant,
    )
    const totals = computeTotals(merged)

    const exists = await ClientInvoice.findOne(
      tenantFilter(req, { invoiceNumber: merged.invoiceNumber }),
    )
    if (exists) throw new AppError('Invoice number already in use', 409)

    const invoice = await ClientInvoice.create(
      withTenant(req, { ...merged, ...totals }),
    )
    res.status(201).json({ success: true, invoice })
  }),
)

router.patch(
  '/tax-invoices/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoice = await ClientInvoice.findOne(
      tenantFilter(req, { _id: req.params.id }),
    )
    if (!invoice) throw new AppError('Tax invoice not found', 404)

    const allowed = [
      'invoiceNumber',
      'invoiceDate',
      'invoiceType',
      'status',
      'projectId',
      'companyName',
      'companyAddress',
      'companyGstin',
      'companyStateName',
      'companyStateCode',
      'companyPhone',
      'companyEmail',
      'companyWebsite',
      'companyLogo',
      'buyersOrderNo',
      'buyersOrderDate',
      'deliveryNote',
      'modeOfPayment',
      'referenceNo',
      'dispatchDocNo',
      'dispatchedThrough',
      'destination',
      'consignee',
      'buyer',
      'items',
      'gstMode',
      'cgstPercent',
      'sgstPercent',
      'igstPercent',
      'bank',
      'signatoryName',
      'signatoryTitle',
      'declaration',
      'jurisdiction',
      'notes',
    ]

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'invoiceDate') {
          invoice.invoiceDate = new Date(req.body.invoiceDate)
        } else if (key === 'consignee' || key === 'buyer' || key === 'bank') {
          invoice[key] = { ...invoice[key]?.toObject?.() || invoice[key], ...req.body[key] }
          invoice.markModified(key)
        } else if (key === 'items') {
          invoice.items = req.body.items
          invoice.markModified('items')
        } else {
          invoice[key] = req.body[key]
        }
      }
    }

    const totals = computeTotals(invoice)
    Object.assign(invoice, totals)
    await invoice.save()

    res.json({ success: true, invoice })
  }),
)

router.delete(
  '/tax-invoices/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoice = await ClientInvoice.findOne(
      tenantFilter(req, { _id: req.params.id }),
    )
    if (!invoice) throw new AppError('Tax invoice not found', 404)
    await ClientInvoice.deleteOne({ _id: invoice._id })
    res.json({ success: true })
  }),
)

export default router
