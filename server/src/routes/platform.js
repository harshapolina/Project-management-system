import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import {
  requirePlatformAdmin,
  assertSeatAvailable,
} from '../middleware/tenant.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'

const router = express.Router()

router.use(requireAuth, requirePlatformAdmin)

router.get(
  '/tenants',
  asyncHandler(async (_req, res) => {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean()
    const withSeats = await Promise.all(
      tenants.map(async (t) => {
        const seatsUsed = await User.countDocuments({
          tenantId: t._id,
          isActive: true,
          isPlatformAdmin: { $ne: true },
        })
        return { ...t, seatsUsed }
      }),
    )
    res.json({ success: true, tenants: withSeats })
  }),
)

router.post(
  '/tenants',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      slug: z
        .string()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
      seatLimit: z.number().int().min(1).max(500).optional(),
      status: z.enum(['trial', 'active', 'suspended']).optional(),
      notes: z.string().optional(),
      adminName: z.string().min(2),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(6).optional(),
    })
    const data = schema.parse(req.body)
    const slug = data.slug.toLowerCase()

    const exists = await Tenant.findOne({ slug })
    if (exists) throw new AppError('Slug already in use', 409)

    const tenant = await Tenant.create({
      name: data.name,
      slug,
      seatLimit: data.seatLimit ?? 30,
      status: data.status || 'active',
      notes: data.notes || '',
      trialEndsAt:
        data.status === 'trial'
          ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
          : null,
    })

    const adminEmail = data.adminEmail.toLowerCase()
    const tempPassword =
      data.adminPassword || crypto.randomBytes(8).toString('hex')

    const admin = await User.create({
      tenantId: tenant._id,
      name: data.adminName,
      email: adminEmail,
      password: tempPassword,
      role: 'admin',
      mustChangePassword: !data.adminPassword,
      onboardingCompleted: false,
    })

    res.status(201).json({
      success: true,
      tenant,
      admin: admin.toSafeJSON(),
      tempPassword,
      loginHint: `Use workspace slug "${slug}" (header X-Tenant-Slug or subdomain ${slug}.editcomedia.com)`,
    })
  }),
)

router.patch(
  '/tenants/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
      seatLimit: z.number().int().min(1).max(500).optional(),
      status: z.enum(['trial', 'active', 'suspended']).optional(),
      notes: z.string().optional(),
    })
    const data = schema.parse(req.body)
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) tenant[key] = data[key]
    }
    await tenant.save()
    res.json({ success: true, tenant })
  }),
)

router.get(
  '/tenants/:id/users',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)
    const users = await User.find({
      tenantId: tenant._id,
      isPlatformAdmin: { $ne: true },
    })
      .select('-password')
      .sort({ createdAt: -1 })
    res.json({
      success: true,
      users: users.map((u) => u.toSafeJSON()),
      seatLimit: tenant.seatLimit,
    })
  }),
)

router.post(
  '/tenants/:id/users',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum([
        'admin',
        'owner',
        'project_manager',
        'designer',
        'site_supervisor',
        'vendor',
        'client',
      ]),
      password: z.string().min(6).optional(),
    })
    const data = schema.parse(req.body)
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    await assertSeatAvailable(tenant._id)

    const email = data.email.toLowerCase()
    const exists = await User.findOne({ tenantId: tenant._id, email })
    if (exists) throw new AppError('User already exists in this workspace', 409)

    const tempPassword = data.password || crypto.randomBytes(8).toString('hex')
    const user = await User.create({
      tenantId: tenant._id,
      name: data.name,
      email,
      role: data.role,
      password: tempPassword,
      mustChangePassword: !data.password,
      onboardingCompleted: false,
    })

    res.status(201).json({
      success: true,
      user: user.toSafeJSON(),
      tempPassword,
    })
  }),
)

export default router
