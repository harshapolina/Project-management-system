import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import {
  requireAuth,
  signAccessToken,
  signRefreshToken,
} from '../middleware/auth.js'
import {
  assertSeatAvailable,
  withTenant,
} from '../middleware/tenant.js'

const router = express.Router()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum([
      'admin',
      'owner',
      'project_manager',
      'designer',
      'site_supervisor',
      'vendor',
      'client',
    ])
    .optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    // Open self-serve register only when explicitly enabled
    if (process.env.ALLOW_PUBLIC_REGISTER !== 'true') {
      throw new AppError(
        'Public registration is disabled. Ask your workspace admin for an invite.',
        403,
      )
    }

    const data = registerSchema.parse(req.body)
    await assertSeatAvailable(req.tenantId)

    const exists = await User.findOne({
      tenantId: req.tenantId,
      email: data.email.toLowerCase(),
    })
    if (exists) throw new AppError('Email already registered in this workspace', 409)

    const user = await User.create(
      withTenant(req, {
        ...data,
        email: data.email.toLowerCase(),
        role: data.role || 'project_manager',
      }),
    )

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [refreshToken]
    await user.save()

    res.status(201).json({
      success: true,
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
      tenant: {
        id: req.tenant._id,
        name: req.tenant.name,
        slug: req.tenant.slug,
      },
    })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body)
    const email = data.email.toLowerCase()

    // Platform admins can log in from any workspace slug
    let user = await User.findOne({
      tenantId: req.tenantId,
      email,
    }).select('+password +refreshTokens')

    if (!user) {
      user = await User.findOne({
        email,
        isPlatformAdmin: true,
      }).select('+password +refreshTokens')
    }

    if (!user) throw new AppError('Invalid email or password', 401)

    const ok = await user.comparePassword(data.password)
    if (!ok) throw new AppError('Invalid email or password', 401)

    if (!user.isActive) throw new AppError('Account is deactivated', 403)

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken]
    await user.save()

    res.json({
      success: true,
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
      tenant: {
        id: req.tenant._id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        seatLimit: req.tenant.seatLimit,
      },
    })
  }),
)

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body
    if (!refreshToken) throw new AppError('Refresh token required', 400)

    let payload
    try {
      const jwt = await import('jsonwebtoken')
      payload = jwt.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch {
      throw new AppError('Invalid refresh token', 401)
    }

    const user = await User.findById(payload.sub).select('+refreshTokens')
    if (!user || !user.refreshTokens?.includes(refreshToken)) {
      throw new AppError('Invalid refresh token', 401)
    }

    const accessToken = signAccessToken(user)
    const newRefresh = signRefreshToken(user)
    user.refreshTokens = user.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(newRefresh)
    await user.save()

    res.json({ success: true, accessToken, refreshToken: newRefresh })
  }),
)

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body
    const user = await User.findById(req.user._id).select('+refreshTokens')
    if (user && refreshToken) {
      user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken)
      await user.save()
    }
    res.json({ success: true })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    let tenant = null
    if (req.user.tenantId) {
      tenant = await Tenant.findById(req.user.tenantId).select(
        'name slug status seatLimit',
      )
    }
    res.json({
      success: true,
      user: req.user.toSafeJSON(),
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            seatLimit: tenant.seatLimit,
          }
        : req.tenant
          ? {
              id: req.tenant._id,
              name: req.tenant.name,
              slug: req.tenant.slug,
              status: req.tenant.status,
              seatLimit: req.tenant.seatLimit,
            }
          : null,
    })
  }),
)

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = [
      'name',
      'phone',
      'title',
      'avatar',
      'company',
      'onboardingCompleted',
      'role',
    ]
    for (const key of allowed) {
      if (req.body[key] !== undefined) req.user[key] = req.body[key]
    }
    await req.user.save()
    res.json({ success: true, user: req.user.toSafeJSON() })
  }),
)

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1).optional(),
      password: z.string().min(6),
    })
    const { currentPassword, password } = schema.parse(req.body)
    const user = await User.findById(req.user._id).select('+password')
    if (!user) throw new AppError('User not found', 404)

    if (!user.mustChangePassword) {
      if (!currentPassword) throw new AppError('Current password required', 400)
      const ok = await user.comparePassword(currentPassword)
      if (!ok) throw new AppError('Current password is incorrect', 401)
    }

    user.password = password
    user.mustChangePassword = false
    await user.save()
    res.json({ success: true, message: 'Password updated' })
  }),
)

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const email = z.string().email().parse(req.body.email).toLowerCase()
    const user = await User.findOne({ tenantId: req.tenantId, email })
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a reset link was sent.',
      })
    }

    const token = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = token
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60)
    await user.save()

    res.json({
      success: true,
      message: 'If that email exists, a reset link was sent.',
      ...(process.env.NODE_ENV !== 'production' && { resetToken: token }),
    })
  }),
)

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      token: z.string().min(10),
      password: z.string().min(6),
    })
    const { token, password } = schema.parse(req.body)
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires +password')

    if (!user) throw new AppError('Invalid or expired reset token', 400)
    user.password = password
    user.mustChangePassword = false
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.json({ success: true, message: 'Password updated' })
  }),
)

router.post(
  '/invite',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (
      !['admin', 'owner', 'project_manager'].includes(req.user.role) &&
      !req.user.isPlatformAdmin
    ) {
      throw new AppError('Only workspace admins or PMs can invite users', 403)
    }

    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
      role: z.enum([
        'admin',
        'owner',
        'project_manager',
        'designer',
        'site_supervisor',
        'vendor',
        'client',
      ]),
    })
    const data = schema.parse(req.body)
    const email = data.email.toLowerCase()
    const tenantId = req.user.tenantId || req.tenantId

    await assertSeatAvailable(tenantId)

    const exists = await User.findOne({ tenantId, email })
    if (exists) throw new AppError('User already exists in this workspace', 409)

    const inviteToken = crypto.randomBytes(24).toString('hex')
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const user = await User.create({
      ...data,
      email,
      tenantId,
      password: tempPassword,
      inviteToken,
      mustChangePassword: true,
      onboardingCompleted: false,
    })

    res.status(201).json({
      success: true,
      user: user.toSafeJSON(),
      inviteToken,
      tempPassword,
    })
  }),
)

export default router
