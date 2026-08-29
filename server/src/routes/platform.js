import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { Tenant } from '../models/Tenant.js'
import { User, ROLES } from '../models/User.js'
import { Project } from '../models/Project.js'
import { requireAuth } from '../middleware/auth.js'
import {
  requirePlatformAdmin,
  assertSeatAvailable,
  assertAdminSlotAvailable,
  isCompanyAdminRole,
  countCompanyAdmins,
} from '../middleware/tenant.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { upload } from '../middleware/upload.js'
import { storeFileBuffer, mediaIdFromUrl, deleteMediaFile } from '../lib/mediaStore.js'
import {
  normalizeTenantFeatures,
  sanitizeTenantFeatures,
} from '../lib/tenantFeatures.js'

const router = express.Router()

router.use(requireAuth, requirePlatformAdmin)

function tenantPublicJSON(tenant) {
  const doc = tenant.toObject?.() ?? tenant
  return {
    ...doc,
    features: normalizeTenantFeatures(doc.features),
  }
}

async function tenantWithStats(tenant) {
  const [seatsUsed, userCount, projectCount, adminsUsed] = await Promise.all([
    User.countDocuments({
      tenantId: tenant._id,
      isActive: true,
      isPlatformAdmin: { $ne: true },
    }),
    User.countDocuments({
      tenantId: tenant._id,
      isPlatformAdmin: { $ne: true },
    }),
    Project.countDocuments({ tenantId: tenant._id }),
    countCompanyAdmins(tenant._id),
  ])
  return tenantPublicJSON({
    ...(tenant.toObject?.() ?? tenant),
    seatsUsed,
    userCount,
    projectCount,
    adminsUsed,
    adminLimit: tenant.adminLimit ?? 3,
  })
}

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const tenants = await Tenant.find().lean()
    const tenantIds = tenants.map((t) => t._id)

    const [totalUsers, activeUsers, totalProjects, recentTenants] =
      await Promise.all([
        User.countDocuments({
          tenantId: { $in: tenantIds },
          isPlatformAdmin: { $ne: true },
        }),
        User.countDocuments({
          tenantId: { $in: tenantIds },
          isActive: true,
          isPlatformAdmin: { $ne: true },
        }),
        Project.countDocuments({ tenantId: { $in: tenantIds } }),
        Tenant.find().sort({ createdAt: -1 }).limit(5).lean(),
      ])

    const byStatus = tenants.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      },
      { trial: 0, active: 0, suspended: 0, cancelled: 0 },
    )

    const byPlan = tenants.reduce(
      (acc, t) => {
        const plan = t.subscriptionPlan || 'pro'
        acc[plan] = (acc[plan] || 0) + 1
        return acc
      },
      { starter: 0, pro: 0, enterprise: 0 },
    )

    res.json({
      success: true,
      overview: {
        companies: tenants.length,
        totalUsers,
        activeUsers,
        totalProjects,
        seatsUsed: tenants.reduce((s, t) => s + (t.seatLimit || 0), 0),
        byStatus,
        byPlan,
        recentCompanies: recentTenants.map((t) => tenantPublicJSON(t)),
      },
    })
  }),
)

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase()
    const filter = { isPlatformAdmin: { $ne: true } }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(500)
    const tenantMap = Object.fromEntries(
      (await Tenant.find().lean()).map((t) => [String(t._id), t]),
    )

    let rows = users.map((u) => {
      const t = tenantMap[String(u.tenantId)]
      return {
        ...u.toSafeJSON(),
        workspace: t?.slug || '',
        companyName: t?.name || '',
      }
    })

    if (q) {
      rows = rows.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.workspace?.toLowerCase().includes(q) ||
          u.companyName?.toLowerCase().includes(q),
      )
    }

    res.json({ success: true, users: rows })
  }),
)

router.get(
  '/tenants',
  asyncHandler(async (_req, res) => {
    const tenants = await Tenant.find().sort({ createdAt: -1 })
    const withSeats = await Promise.all(tenants.map((t) => tenantWithStats(t)))
    res.json({ success: true, tenants: withSeats })
  }),
)

router.get(
  '/tenants/:id',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)
    res.json({ success: true, tenant: await tenantWithStats(tenant) })
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
      adminLimit: z.number().int().min(1).max(50).optional(),
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

    const adminLimit = data.adminLimit ?? 3
    const tenant = await Tenant.create({
      name: data.name,
      slug,
      seatLimit: data.seatLimit ?? 30,
      adminLimit,
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
      adminLimit: z.number().int().min(1).max(50).optional(),
      status: z.enum(['trial', 'active', 'suspended', 'cancelled']).optional(),
      subscriptionPlan: z.enum(['starter', 'pro', 'enterprise']).optional(),
      features: z.record(z.boolean()).optional(),
      notes: z.string().optional(),
    })
    const data = schema.parse(req.body)
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    if (data.name !== undefined) tenant.name = data.name
    if (data.seatLimit !== undefined) tenant.seatLimit = data.seatLimit
    if (data.adminLimit !== undefined) {
      const currentAdmins = await countCompanyAdmins(tenant._id)
      if (data.adminLimit < currentAdmins) {
        throw new AppError(
          `Cannot set admin limit to ${data.adminLimit}: company already has ${currentAdmins} admin(s). Demote or deactivate an admin first.`,
          400,
        )
      }
      tenant.adminLimit = data.adminLimit
    }
    if (data.notes !== undefined) tenant.notes = data.notes
    if (data.subscriptionPlan !== undefined) {
      tenant.subscriptionPlan = data.subscriptionPlan
    }
    if (data.features !== undefined) {
      tenant.features = {
        ...normalizeTenantFeatures(tenant.features),
        ...sanitizeTenantFeatures(data.features),
      }
      tenant.markModified('features')
    }
    if (data.status !== undefined) {
      tenant.status = data.status
      if (data.status === 'cancelled') {
        tenant.cancelledAt = tenant.cancelledAt || new Date()
      } else if (data.status === 'active' || data.status === 'trial') {
        tenant.cancelledAt = null
      }
    }

    await tenant.save()
    res.json({ success: true, tenant: tenantPublicJSON(tenant) })
  }),
)

router.post(
  '/tenants/:id/logo',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Image file is required', 400)
    if (!String(req.file.mimetype || '').startsWith('image/')) {
      throw new AppError('Only image files are allowed', 400)
    }

    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    const saved = await storeFileBuffer(req.file, {
      tenantId: tenant._id,
      uploadedBy: req.user._id,
      kind: 'logo',
    })

    const prevId = mediaIdFromUrl(tenant.logoUrl)
    tenant.logoUrl = saved.url
    await tenant.save()
    if (prevId) await deleteMediaFile(prevId)

    res.json({
      success: true,
      logoUrl: tenant.logoUrl,
      tenant: await tenantWithStats(tenant),
    })
  }),
)

router.delete(
  '/tenants/:id/logo',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    const prevId = mediaIdFromUrl(tenant.logoUrl)
    tenant.logoUrl = ''
    await tenant.save()
    if (prevId) await deleteMediaFile(prevId)

    res.json({
      success: true,
      logoUrl: '',
      tenant: await tenantWithStats(tenant),
    })
  }),
)

router.post(
  '/tenants/:id/cancel-subscription',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)
    tenant.status = 'cancelled'
    tenant.cancelledAt = new Date()
    await tenant.save()
    res.json({
      success: true,
      tenant: tenantPublicJSON(tenant),
      message: 'Subscription cancelled — company users can no longer sign in.',
    })
  }),
)

router.post(
  '/tenants/:id/reactivate-subscription',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)
    tenant.status = 'active'
    tenant.cancelledAt = null
    await tenant.save()
    res.json({
      success: true,
      tenant: tenantPublicJSON(tenant),
      message: 'Subscription reactivated.',
    })
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
      adminLimit: tenant.adminLimit ?? 3,
      adminsUsed: await countCompanyAdmins(tenant._id),
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
        'hr',
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
    if (isCompanyAdminRole(data.role)) {
      await assertAdminSlotAvailable(tenant._id)
    }

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

router.patch(
  '/tenants/:id/users/:userId',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      role: z.enum(ROLES).optional(),
      isActive: z.boolean().optional(),
    })
    const data = schema.parse(req.body)
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    const user = await User.findOne({
      _id: req.params.userId,
      tenantId: tenant._id,
      isPlatformAdmin: { $ne: true },
    })
    if (!user) throw new AppError('User not found in this workspace', 404)

    if (data.role !== undefined) {
      const promoting =
        isCompanyAdminRole(data.role) && !isCompanyAdminRole(user.role)
      if (promoting) {
        await assertAdminSlotAvailable(tenant._id, {
          excludeUserId: user._id,
        })
      }
      user.role = data.role
    }
    if (data.isActive !== undefined) {
      if (data.isActive === false) {
        user.refreshTokens = []
      }
      user.isActive = data.isActive
    }
    await user.save()

    res.json({ success: true, user: user.toSafeJSON() })
  }),
)

router.post(
  '/tenants/:id/users/:userId/reset-password',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      password: z.string().min(6).optional(),
    })
    const data = schema.parse(req.body ?? {})
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    const user = await User.findOne({
      _id: req.params.userId,
      tenantId: tenant._id,
      isPlatformAdmin: { $ne: true },
    }).select('+password +refreshTokens')
    if (!user) throw new AppError('User not found in this workspace', 404)

    const tempPassword = data.password || crypto.randomBytes(8).toString('hex')
    user.password = tempPassword
    user.mustChangePassword = !data.password
    user.refreshTokens = []
    await user.save()

    res.json({
      success: true,
      user: user.toSafeJSON(),
      tempPassword,
    })
  }),
)

router.delete(
  '/tenants/:id/users/:userId',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) throw new AppError('Tenant not found', 404)

    const user = await User.findOne({
      _id: req.params.userId,
      tenantId: tenant._id,
      isPlatformAdmin: { $ne: true },
    })
    if (!user) throw new AppError('User not found in this workspace', 404)

    const removed = {
      id: String(user._id),
      name: user.name,
      email: user.email,
    }
    await User.deleteOne({ _id: user._id })

    res.json({
      success: true,
      message: `${removed.name} deleted from ${tenant.name}`,
      removed,
    })
  }),
)

export default router
