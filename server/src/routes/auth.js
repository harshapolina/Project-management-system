import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { User } from '../models/User.js'
import {
  asyncHandler,
  AppError,
} from '../middleware/errorHandler.js'
import {
  requireAuth,
  signAccessToken,
  signRefreshToken,
} from '../middleware/auth.js'

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
    const data = registerSchema.parse(req.body)
    const exists = await User.findOne({ email: data.email })
    if (exists) throw new AppError('Email already registered', 409)

    const user = await User.create({
      ...data,
      role: data.role || 'project_manager',
    })

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [refreshToken]
    await user.save()

    res.status(201).json({
      success: true,
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body)
    const user = await User.findOne({ email: data.email }).select('+password +refreshTokens')
    if (!user) throw new AppError('Invalid email or password', 401)

    const ok = await user.comparePassword(data.password)
    if (!ok) throw new AppError('Invalid email or password', 401)

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken]
    await user.save()

    res.json({
      success: true,
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
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
    res.json({ success: true, user: req.user.toSafeJSON() })
  }),
)

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'title', 'avatar', 'company', 'onboardingCompleted', 'role']
    for (const key of allowed) {
      if (req.body[key] !== undefined) req.user[key] = req.body[key]
    }
    await req.user.save()
    res.json({ success: true, user: req.user.toSafeJSON() })
  }),
)

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const email = z.string().email().parse(req.body.email)
    const user = await User.findOne({ email })
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

    // In production: send email. For now return token in non-prod.
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
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
      role: z.enum([
        'project_manager',
        'designer',
        'site_supervisor',
        'vendor',
        'client',
      ]),
    })
    const data = schema.parse(req.body)
    const exists = await User.findOne({ email: data.email })
    if (exists) throw new AppError('User already exists', 409)

    const inviteToken = crypto.randomBytes(24).toString('hex')
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const user = await User.create({
      ...data,
      password: tempPassword,
      inviteToken,
      onboardingCompleted: false,
    })

    res.status(201).json({
      success: true,
      user: user.toSafeJSON(),
      inviteToken,
      tempPassword: process.env.NODE_ENV !== 'production' ? tempPassword : undefined,
    })
  }),
)

export default router
