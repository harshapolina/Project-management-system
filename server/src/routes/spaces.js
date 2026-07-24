import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { Space } from '../models/Space.js'
import { Project } from '../models/Project.js'

const router = express.Router()

router.get(
  '/spaces',
  requireAuth,
  asyncHandler(async (req, res) => {
    const spaces = await Space.find(
      tenantFilter(req, {
        $or: [
          { createdBy: req.user._id },
          { 'members.user': req.user._id },
        ],
      }),
    )
      .sort({ name: 1 })
      .lean()

    const withCounts = await Promise.all(
      spaces.map(async (s) => {
        const projectCount = await Project.countDocuments(
          tenantFilter(req, { spaceId: s._id }),
        )
        return { ...s, projectCount }
      }),
    )

    res.json({ success: true, spaces: withCounts })
  }),
)

router.post(
  '/spaces',
  requireAuth,
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim()
    if (!name) throw new AppError('Space name is required', 400)

    const space = await Space.create(
      withTenant(req, {
        name,
        description: req.body.description || '',
        color: req.body.color || '#7B68EE',
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: 'owner' }],
      }),
    )

    res.status(201).json({ success: true, space })
  }),
)

router.patch(
  '/spaces/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const space = await Space.findById(req.params.id)
    assertTenantDoc(space, req, 'Space')
    if (req.body.name !== undefined) space.name = String(req.body.name).trim()
    if (req.body.description !== undefined)
      space.description = req.body.description
    if (req.body.color !== undefined) space.color = req.body.color
    await space.save()
    res.json({ success: true, space })
  }),
)

router.delete(
  '/spaces/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const space = await Space.findById(req.params.id)
    assertTenantDoc(space, req, 'Space')
    await Project.updateMany(
      tenantFilter(req, { spaceId: space._id }),
      { $unset: { spaceId: 1 } },
    )
    await space.deleteOne()
    res.json({ success: true })
  }),
)

export default router
