import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { CustomFieldDefinition } from '../models/CustomField.js'
import { requirePermission } from '../lib/permissions.js'

const router = express.Router()

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const fields = await CustomFieldDefinition.find(
      tenantFilter(req, { isActive: { $ne: false } }),
    ).sort({ order: 1, createdAt: 1 })

    res.json({ success: true, fields })
  }),
)

router.get(
  '/all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const fields = await CustomFieldDefinition.find(tenantFilter(req, {})).sort({
      order: 1,
      createdAt: 1,
    })
    res.json({ success: true, fields })
  }),
)

router.post(
  '/',
  requireAuth,
  requirePermission('tasks.manage'),
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim()
    if (!name) throw new AppError('name is required', 400)

    const type = req.body.type || 'text'
    if (!['text', 'user', 'select', 'number'].includes(type)) {
      throw new AppError('Invalid field type', 400)
    }

    let slug = slugify(req.body.slug || name)
    if (!slug) throw new AppError('Invalid field name', 400)

    const existing = await CustomFieldDefinition.findOne(
      tenantFilter(req, { slug }),
    )
    if (existing) {
      slug = `${slug}_${Date.now().toString(36).slice(-4)}`
    }

    const count = await CustomFieldDefinition.countDocuments(tenantFilter(req, {}))

    const field = await CustomFieldDefinition.create(
      withTenant(req, {
        name,
        slug,
        type,
        options: Array.isArray(req.body.options) ? req.body.options : [],
        order: req.body.order ?? count,
        isActive: true,
      }),
    )

    res.status(201).json({ success: true, field })
  }),
)

router.patch(
  '/:id',
  requireAuth,
  requirePermission('tasks.manage'),
  asyncHandler(async (req, res) => {
    const field = await CustomFieldDefinition.findById(req.params.id)
    assertTenantDoc(field, req, 'Custom field')

    const allowed = ['name', 'type', 'options', 'order', 'isActive']
    for (const key of allowed) {
      if (req.body[key] !== undefined) field[key] = req.body[key]
    }
    if (
      req.body.type !== undefined &&
      !['text', 'user', 'select', 'number'].includes(req.body.type)
    ) {
      throw new AppError('Invalid field type', 400)
    }
    await field.save()
    res.json({ success: true, field })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  requirePermission('tasks.manage'),
  asyncHandler(async (req, res) => {
    const field = await CustomFieldDefinition.findById(req.params.id)
    assertTenantDoc(field, req, 'Custom field')
    field.isActive = false
    await field.save()
    res.json({ success: true, field })
  }),
)

export default router
