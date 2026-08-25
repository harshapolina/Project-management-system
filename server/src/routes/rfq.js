import express from 'express'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../lib/permissions.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { assertProjectAccess } from '../lib/projectScope.js'
import { Rfq, PurchaseOrder, Vendor } from '../models/index.js'

const router = express.Router()

const VENDOR_FIELDS = 'name contact phone email gst categories rating paymentTerms'

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Final landed cost for one vendor's quote: their line rates against the RFQ
 * quantities, plus every charge they add on top. This is the figure the
 * comparison ranks on — a cheap rate with expensive freight is not the cheapest.
 */
export function landedCostOf(rfq, entry) {
  const lines = (rfq.items || []).reduce((sum, item, i) => {
    const rate = num(entry.rates?.[i])
    return sum + rate * num(item.qty)
  }, 0)
  const extras =
    num(entry.freight) +
    num(entry.loading) +
    num(entry.installation) +
    num(entry.otherCharges)
  const taxable = lines + extras
  return taxable + (taxable * num(entry.gstPercent)) / 100
}

function nextNumber(prefix) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`
}

/* ─────────────────────────── list / read ─────────────────────────── */

router.get(
  '/rfqs',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const filter = tenantFilter(req, {})
    if (req.query.projectId) {
      await assertProjectAccess(req, req.query.projectId)
      filter.projectId = req.query.projectId
    }
    if (req.query.status) filter.status = req.query.status
    const rfqs = await Rfq.find(filter)
      .populate('vendors.vendor', VENDOR_FIELDS)
      .populate('awardedVendor', VENDOR_FIELDS)
      .populate('projectId', 'name clientName location')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
    res.json({ success: true, rfqs })
  }),
)

router.get(
  '/rfqs/:id',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
      .populate('vendors.vendor', VENDOR_FIELDS)
      .populate('awardedVendor', VENDOR_FIELDS)
      .populate('projectId', 'name clientName location')
    assertTenantDoc(rfq, req, 'RFQ')
    res.json({ success: true, rfq })
  }),
)

/* ─────────────────────────── create ─────────────────────────── */

router.post(
  '/rfqs',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const { projectId, items, vendorIds } = req.body
    if (!projectId) throw new AppError('projectId is required', 400)
    await assertProjectAccess(req, projectId)
    if (!Array.isArray(items) || !items.length) {
      throw new AppError('Pick at least one item to quote', 400)
    }
    const ids = Array.isArray(vendorIds) ? vendorIds.filter(Boolean) : []
    if (!ids.length) throw new AppError('Pick at least one vendor', 400)

    // only vendors this tenant owns
    const owned = await Vendor.find(tenantFilter(req, { _id: { $in: ids } })).select('_id')
    if (owned.length !== ids.length) {
      throw new AppError('One or more vendors are not available', 400)
    }

    const rfq = await Rfq.create(
      withTenant(req, {
        projectId,
        quotationId: req.body.quotationId || undefined,
        rfqNumber: req.body.rfqNumber || nextNumber('RFQ'),
        items: items.map((i) => ({
          description: i.description || '',
          unit: i.unit || 'nos',
          qty: num(i.qty),
          boqRate: num(i.boqRate ?? i.rate),
          boqItemId: i.boqItemId || i._id || undefined,
        })),
        vendors: owned.map((v) => ({ vendor: v._id, status: 'pending' })),
        closingDate: req.body.closingDate || undefined,
        notes: req.body.notes || '',
        status: 'draft',
        createdBy: req.user._id,
      }),
    )
    const full = await Rfq.findById(rfq._id)
      .populate('vendors.vendor', VENDOR_FIELDS)
      .populate('projectId', 'name clientName location')
    res.status(201).json({ success: true, rfq: full })
  }),
)

/* ─────────────────────────── update ─────────────────────────── */

router.patch(
  '/rfqs/:id',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
    assertTenantDoc(rfq, req, 'RFQ')
    for (const key of ['notes', 'closingDate', 'status', 'items']) {
      if (req.body[key] !== undefined) rfq[key] = req.body[key]
    }
    await rfq.save()
    const full = await Rfq.findById(rfq._id).populate('vendors.vendor', VENDOR_FIELDS)
    res.json({ success: true, rfq: full })
  }),
)

/** Add more vendors to an RFQ that is already out. */
router.post(
  '/rfqs/:id/vendors',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
    assertTenantDoc(rfq, req, 'RFQ')
    const ids = (Array.isArray(req.body.vendorIds) ? req.body.vendorIds : []).filter(
      Boolean,
    )
    const owned = await Vendor.find(tenantFilter(req, { _id: { $in: ids } })).select('_id')
    const already = new Set(rfq.vendors.map((v) => String(v.vendor)))
    for (const v of owned) {
      if (!already.has(String(v._id))) rfq.vendors.push({ vendor: v._id, status: 'pending' })
    }
    await rfq.save()
    const full = await Rfq.findById(rfq._id).populate('vendors.vendor', VENDOR_FIELDS)
    res.json({ success: true, rfq: full })
  }),
)

/** Mark the RFQ as sent to one vendor (or all of them). */
router.post(
  '/rfqs/:id/send',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
    assertTenantDoc(rfq, req, 'RFQ')
    const via = ['whatsapp', 'email', 'manual'].includes(req.body.via)
      ? req.body.via
      : 'whatsapp'
    const target = req.body.vendorId ? String(req.body.vendorId) : null
    let sent = 0
    for (const entry of rfq.vendors) {
      if (target && String(entry.vendor) !== target) continue
      // a vendor who already answered should not be reset to "sent"
      if (entry.status === 'quoted') continue
      entry.status = 'sent'
      entry.sentAt = new Date()
      entry.sentVia = via
      sent += 1
    }
    if (rfq.status === 'draft' && sent) rfq.status = 'sent'
    await rfq.save()
    const full = await Rfq.findById(rfq._id).populate('vendors.vendor', VENDOR_FIELDS)
    res.json({ success: true, sent, rfq: full })
  }),
)

/** Record what a vendor came back with. */
router.post(
  '/rfqs/:id/quote',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
    assertTenantDoc(rfq, req, 'RFQ')
    const entry = rfq.vendors.find(
      (v) => String(v.vendor) === String(req.body.vendorId),
    )
    if (!entry) throw new AppError('That vendor is not on this RFQ', 404)

    if (req.body.declined) {
      entry.status = 'declined'
      entry.quotedAt = new Date()
    } else {
      entry.rates = (rfq.items || []).map((_, i) => num(req.body.rates?.[i]))
      entry.gstPercent = req.body.gstPercent ?? 18
      entry.freight = num(req.body.freight)
      entry.loading = num(req.body.loading)
      entry.installation = num(req.body.installation)
      entry.otherCharges = num(req.body.otherCharges)
      entry.validUntil = req.body.validUntil || undefined
      entry.remarks = req.body.remarks || ''
      entry.landedCost = landedCostOf(rfq, entry)
      entry.status = 'quoted'
      entry.quotedAt = new Date()
    }

    if (rfq.status === 'sent' && rfq.vendors.some((v) => v.status === 'quoted')) {
      rfq.status = 'comparing'
    }
    await rfq.save()
    const full = await Rfq.findById(rfq._id).populate('vendors.vendor', VENDOR_FIELDS)
    res.json({ success: true, rfq: full })
  }),
)

/**
 * Award the RFQ and raise the purchase order from the winning quote, carrying
 * that vendor's rates and charges onto the PO so the two cannot disagree.
 */
router.post(
  '/rfqs/:id/award',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
    assertTenantDoc(rfq, req, 'RFQ')
    const entry = rfq.vendors.find(
      (v) => String(v.vendor) === String(req.body.vendorId),
    )
    if (!entry) throw new AppError('That vendor is not on this RFQ', 404)
    if (entry.status !== 'quoted') {
      throw new AppError('That vendor has not quoted yet', 400)
    }
    if (rfq.purchaseOrder) throw new AppError('This RFQ already has a PO', 400)

    const items = (rfq.items || []).map((item, i) => {
      const rate = num(entry.rates?.[i])
      return {
        description: item.description,
        qty: num(item.qty),
        rate,
        amount: rate * num(item.qty),
        boqItemId: item.boqItemId,
      }
    })
    const po = await PurchaseOrder.create(
      withTenant(req, {
        projectId: rfq.projectId,
        vendor: entry.vendor,
        rfq: rfq._id,
        items,
        value: entry.landedCost || landedCostOf(rfq, entry),
        gstPercent: entry.gstPercent,
        freight: entry.freight,
        loading: entry.loading,
        installation: entry.installation,
        otherCharges: entry.otherCharges,
        deliveryDate: req.body.deliveryDate || undefined,
        deliveryLocation: req.body.deliveryLocation || '',
        paymentTerms: req.body.paymentTerms || '',
        status: 'draft',
        poNumber: req.body.poNumber || nextNumber('PO'),
        createdBy: req.user._id,
      }),
    )

    rfq.status = 'awarded'
    rfq.awardedVendor = entry.vendor
    rfq.awardReason = req.body.reason || ''
    rfq.purchaseOrder = po._id
    await rfq.save()

    const full = await Rfq.findById(rfq._id)
      .populate('vendors.vendor', VENDOR_FIELDS)
      .populate('awardedVendor', VENDOR_FIELDS)
    const fullPo = await PurchaseOrder.findById(po._id)
      .populate('vendor', VENDOR_FIELDS)
      .populate('projectId', 'name')
    res.status(201).json({ success: true, rfq: full, purchaseOrder: fullPo })
  }),
)

router.delete(
  '/rfqs/:id',
  requireAuth,
  requirePermission('procurement'),
  asyncHandler(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id)
    assertTenantDoc(rfq, req, 'RFQ')
    if (rfq.purchaseOrder) {
      throw new AppError('Cancel the purchase order before deleting this RFQ', 400)
    }
    await rfq.deleteOne()
    res.json({ success: true })
  }),
)

export default router
