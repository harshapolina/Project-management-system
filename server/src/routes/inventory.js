import express from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { tenantFilter } from '../middleware/tenant.js'
import { InventoryItem, InventoryMovement } from '../models/Inventory.js'

const router = express.Router()
const adminOnly = [requireAuth, requireRole('admin', 'owner')]

router.get(
  '/inventory/summary',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const items = await InventoryItem.find(
      tenantFilter(req, { isActive: true }),
    ).lean()
    const lowStock = items.filter((i) => i.quantity <= (i.reorderLevel || 0))
    const totalValue = items.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
      0,
    )
    res.json({
      totals: {
        items: items.length,
        lowStock: lowStock.length,
        units: items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
        value: totalValue,
      },
      lowStock: lowStock.slice(0, 8),
    })
  }),
)

router.get(
  '/inventory/items',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase()
    const filter = tenantFilter(req, { isActive: true })
    let items = await InventoryItem.find(filter).sort({ name: 1 }).lean()
    if (q) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.sku || '').toLowerCase().includes(q) ||
          (i.category || '').toLowerCase().includes(q) ||
          (i.location || '').toLowerCase().includes(q),
      )
    }
    res.json({ items })
  }),
)

router.post(
  '/inventory/items',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim()
    if (!name) throw new AppError('Item name is required', 400)

    const qty = Math.max(0, Number(req.body.quantity) || 0)
    const item = await InventoryItem.create({
      tenantId: req.tenantId,
      sku: String(req.body.sku || '').trim(),
      name,
      category: String(req.body.category || 'General').trim() || 'General',
      unit: String(req.body.unit || 'pcs').trim() || 'pcs',
      quantity: qty,
      reorderLevel: Math.max(0, Number(req.body.reorderLevel) || 0),
      location: String(req.body.location || '').trim(),
      unitCost: Math.max(0, Number(req.body.unitCost) || 0),
      notes: String(req.body.notes || '').trim(),
    })

    if (qty > 0) {
      await InventoryMovement.create({
        tenantId: req.tenantId,
        itemId: item._id,
        type: 'in',
        quantity: qty,
        balanceAfter: qty,
        note: 'Opening stock',
        createdBy: req.user._id,
      })
    }

    res.status(201).json({ item })
  }),
)

router.patch(
  '/inventory/items/:id',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne(
      tenantFilter(req, { _id: req.params.id }),
    )
    if (!item) throw new AppError('Inventory item not found', 404)

    const fields = [
      'sku',
      'name',
      'category',
      'unit',
      'reorderLevel',
      'location',
      'unitCost',
      'notes',
      'isActive',
    ]
    for (const key of fields) {
      if (req.body[key] === undefined) continue
      if (key === 'name') {
        const name = String(req.body.name || '').trim()
        if (!name) throw new AppError('Item name is required', 400)
        item.name = name
      } else if (key === 'reorderLevel' || key === 'unitCost') {
        item[key] = Math.max(0, Number(req.body[key]) || 0)
      } else if (key === 'isActive') {
        item.isActive = !!req.body.isActive
      } else {
        item[key] = String(req.body[key] || '').trim()
      }
    }
    await item.save()
    res.json({ item })
  }),
)

router.post(
  '/inventory/items/:id/move',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne(
      tenantFilter(req, { _id: req.params.id, isActive: true }),
    )
    if (!item) throw new AppError('Inventory item not found', 404)

    const type = String(req.body.type || '').toLowerCase()
    if (!['in', 'out', 'adjust'].includes(type)) {
      throw new AppError('type must be in, out, or adjust', 400)
    }

    const qty = Number(req.body.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError('quantity must be a positive number', 400)
    }

    let next = item.quantity
    if (type === 'in') next += qty
    else if (type === 'out') {
      if (qty > item.quantity) {
        throw new AppError('Not enough stock for this issue', 400)
      }
      next -= qty
    } else {
      next = qty
    }

    item.quantity = next
    await item.save()

    const movement = await InventoryMovement.create({
      tenantId: req.tenantId,
      itemId: item._id,
      type,
      quantity: type === 'adjust' ? qty : qty,
      balanceAfter: next,
      note: String(req.body.note || '').trim(),
      projectId: req.body.projectId || null,
      createdBy: req.user._id,
    })

    const populated = await InventoryMovement.findById(movement._id)
      .populate('itemId', 'name sku unit')
      .populate('createdBy', 'name')
      .populate('projectId', 'name')
      .lean()

    res.status(201).json({ item, movement: populated })
  }),
)

router.get(
  '/inventory/movements',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80))
    const filter = tenantFilter(req, {})
    if (req.query.itemId) filter.itemId = req.query.itemId

    const movements = await InventoryMovement.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('itemId', 'name sku unit category')
      .populate('createdBy', 'name')
      .populate('projectId', 'name')
      .lean()

    res.json({ movements })
  }),
)

export default router
