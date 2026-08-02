import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, assertTenantDoc } from '../middleware/tenant.js'
import {
  hasPermission,
  canManageEmployeeAccess,
  requirePermission,
} from '../lib/permissions.js'
import {
  ensureDefaultImpactRules,
  awardImpactPoints,
  awardFromRule,
  recomputeImpactScore,
  categoryBreakdown,
  trendSeries,
  ACHIEVEMENT_LEVELS,
  badgesForTotal,
} from '../lib/impactEngine.js'
import { ImpactRule, ImpactLedger, ImpactScore } from '../models/Impact.js'
import { User } from '../models/User.js'

const router = express.Router()

function canManageImpact(user) {
  return canManageEmployeeAccess(user)
}

function parseDate(value, endOfDay = false) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  else d.setHours(0, 0, 0, 0)
  return d
}

router.get(
  '/impact/me',
  requireAuth,
  requirePermission('impact'),
  asyncHandler(async (req, res) => {
    await ensureDefaultImpactRules(req.tenantId)
    const score =
      (await ImpactScore.findOne(
        tenantFilter(req, { userId: req.user._id }),
      )) || (await recomputeImpactScore(req.tenantId, req.user._id))

    const [breakdown, trend, recent] = await Promise.all([
      categoryBreakdown(req.tenantId, req.user._id),
      trendSeries(req.tenantId, req.user._id, 30),
      ImpactLedger.find(tenantFilter(req, { userId: req.user._id }))
        .sort({ createdAt: -1 })
        .limit(25)
        .populate('awardedBy', 'name avatar')
        .populate('projectId', 'name')
        .lean(),
    ])

    res.json({
      success: true,
      score,
      badges: ACHIEVEMENT_LEVELS.map((level) => ({
        ...level,
        earned: (score.badges || []).includes(level.key),
      })),
      breakdown: breakdown.map((row) => ({
        category: row._id,
        points: row.points,
        count: row.count,
      })),
      trend,
      timeline: recent,
      canManage: canManageImpact(req.user),
    })
  }),
)

router.get(
  '/impact/users/:userId',
  requireAuth,
  requirePermission('impact'),
  asyncHandler(async (req, res) => {
    const targetId = req.params.userId
    const isSelf = String(targetId) === String(req.user._id)
    if (!isSelf && !canManageImpact(req.user) && !hasPermission(req.user, 'people')) {
      throw new AppError('Not allowed to view this impact profile', 403)
    }

    const user = await User.findOne(
      tenantFilter(req, { _id: targetId, isPlatformAdmin: { $ne: true } }),
    ).select('name avatar role title isActive')
    if (!user) throw new AppError('User not found', 404)

    const from = parseDate(req.query.from)
    const to = parseDate(req.query.to, true)

    const score =
      (await ImpactScore.findOne(tenantFilter(req, { userId: user._id }))) ||
      (await recomputeImpactScore(req.tenantId, user._id))

    const ledgerFilter = tenantFilter(req, { userId: user._id })
    if (from || to) {
      ledgerFilter.createdAt = {}
      if (from) ledgerFilter.createdAt.$gte = from
      if (to) ledgerFilter.createdAt.$lte = to
    }

    const [breakdown, trend, timeline] = await Promise.all([
      categoryBreakdown(req.tenantId, user._id, { from, to }),
      trendSeries(req.tenantId, user._id, 30),
      ImpactLedger.find(ledgerFilter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('awardedBy', 'name avatar')
        .populate('projectId', 'name')
        .lean(),
    ])

    res.json({
      success: true,
      user,
      score,
      badges: ACHIEVEMENT_LEVELS.map((level) => ({
        ...level,
        earned: badgesForTotal(score.totalPoints || 0).includes(level.key),
      })),
      breakdown: breakdown.map((row) => ({
        category: row._id,
        points: row.points,
        count: row.count,
      })),
      trend,
      timeline,
    })
  }),
)

router.get(
  '/impact/leaderboard',
  requireAuth,
  requirePermission('impact'),
  asyncHandler(async (req, res) => {
    await ensureDefaultImpactRules(req.tenantId)
    const period = ['weekly', 'monthly', 'all'].includes(req.query.period)
      ? req.query.period
      : 'all'
    const role = req.query.role || ''
    const q = String(req.query.q || '').trim()

    const users = await User.find(
      tenantFilter(req, {
        isPlatformAdmin: { $ne: true },
        isActive: { $ne: false },
        role: { $nin: ['client', 'vendor'] },
        ...(role ? { role } : {}),
        ...(q
          ? {
              $or: [
                { name: new RegExp(q, 'i') },
                { email: new RegExp(q, 'i') },
                { title: new RegExp(q, 'i') },
              ],
            }
          : {}),
      }),
    )
      .select('name avatar role title')
      .lean()

    const userIds = users.map((u) => u._id)
    const scores = await ImpactScore.find(
      tenantFilter(req, { userId: { $in: userIds } }),
    ).lean()
    const scoreMap = Object.fromEntries(
      scores.map((s) => [String(s.userId), s]),
    )

    const sortKey =
      period === 'weekly'
        ? 'weeklyPoints'
        : period === 'monthly'
          ? 'monthlyPoints'
          : 'totalPoints'

    const rows = users
      .map((user) => {
        const score = scoreMap[String(user._id)] || {
          totalPoints: 0,
          weeklyPoints: 0,
          monthlyPoints: 0,
          badges: [],
        }
        return {
          user,
          totalPoints: score.totalPoints || 0,
          weeklyPoints: score.weeklyPoints || 0,
          monthlyPoints: score.monthlyPoints || 0,
          badges: score.badges || badgesForTotal(score.totalPoints || 0),
          points: score[sortKey] || 0,
        }
      })
      .sort((a, b) => b.points - a.points || a.user.name.localeCompare(b.user.name))
      .map((row, index) => ({ ...row, rank: index + 1 }))

    res.json({ success: true, period, leaderboard: rows })
  }),
)

router.get(
  '/impact/timeline',
  requireAuth,
  requirePermission('impact'),
  asyncHandler(async (req, res) => {
    const from = parseDate(req.query.from)
    const to = parseDate(req.query.to, true)
    const userId = req.query.userId
    const category = req.query.category

    const filter = tenantFilter(req, {})
    if (userId) {
      const isSelf = String(userId) === String(req.user._id)
      if (
        !isSelf &&
        !canManageImpact(req.user) &&
        !hasPermission(req.user, 'people')
      ) {
        throw new AppError('Not allowed', 403)
      }
      filter.userId = userId
    } else if (!canManageImpact(req.user) && !hasPermission(req.user, 'people')) {
      filter.userId = req.user._id
    }
    if (category) filter.category = category
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = from
      if (to) filter.createdAt.$lte = to
    }

    const entries = await ImpactLedger.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name avatar role title')
      .populate('awardedBy', 'name avatar')
      .populate('projectId', 'name')
      .lean()

    res.json({ success: true, entries })
  }),
)

router.get(
  '/impact/rules',
  requireAuth,
  requirePermission('impact'),
  asyncHandler(async (req, res) => {
    const rules = await ensureDefaultImpactRules(req.tenantId)
    res.json({
      success: true,
      rules,
      canManage: canManageImpact(req.user),
      achievements: ACHIEVEMENT_LEVELS,
    })
  }),
)

router.patch(
  '/impact/rules/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageImpact(req.user)) {
      throw new AppError('Only Admin / Owner can edit impact rules', 403)
    }
    const rule = await ImpactRule.findById(req.params.id)
    assertTenantDoc(rule, req, 'Impact rule')

    for (const key of ['label', 'description', 'category']) {
      if (req.body[key] !== undefined) rule[key] = req.body[key]
    }
    if (req.body.points !== undefined) rule.points = Number(req.body.points)
    if (req.body.weight !== undefined) {
      rule.weight = Math.max(0, Number(req.body.weight) || 0)
    }
    if (typeof req.body.enabled === 'boolean') rule.enabled = req.body.enabled
    if (typeof req.body.auto === 'boolean') rule.auto = req.body.auto
    await rule.save()
    res.json({ success: true, rule })
  }),
)

router.post(
  '/impact/adjust',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageImpact(req.user)) {
      throw new AppError('Only Admin / Owner can adjust impact points', 403)
    }

    const userId = req.body.userId
    if (!userId) throw new AppError('userId is required', 400)

    const target = await User.findOne(
      tenantFilter(req, { _id: userId, isPlatformAdmin: { $ne: true } }),
    )
    if (!target) throw new AppError('Employee not found', 404)

    const note = String(req.body.note || '').trim()
    const ruleKey = req.body.ruleKey

    let entry
    if (ruleKey) {
      entry = await awardFromRule({
        tenantId: req.tenantId,
        userId: target._id,
        ruleKey,
        note,
        source: 'manual',
        awardedBy: req.user._id,
        projectId: req.body.projectId || null,
        taskId: req.body.taskId || null,
        meta: { reason: note },
      })
      if (!entry) throw new AppError('Rule not found or disabled', 404)
    } else {
      const points = Number(req.body.points)
      if (!Number.isFinite(points) || points === 0) {
        throw new AppError('points must be a non-zero number', 400)
      }
      entry = await awardImpactPoints({
        tenantId: req.tenantId,
        userId: target._id,
        ruleKey: 'manual',
        points,
        label: req.body.label || (points > 0 ? 'Manual bonus' : 'Manual deduction'),
        category: points > 0 ? 'manual' : 'penalty',
        note,
        source: 'manual',
        awardedBy: req.user._id,
        projectId: req.body.projectId || null,
        taskId: req.body.taskId || null,
        meta: { reason: note },
      })
    }

    const score = await ImpactScore.findOne(
      tenantFilter(req, { userId: target._id }),
    )
    res.status(201).json({ success: true, entry, score })
  }),
)

router.get(
  '/impact/overview',
  requireAuth,
  requirePermission('impact'),
  asyncHandler(async (req, res) => {
    await ensureDefaultImpactRules(req.tenantId)

    const manage = canManageImpact(req.user)
    const companyScope = manage || hasPermission(req.user, 'people')
    const scopeUserId = companyScope ? null : req.user._id

    const [me, leaderboardRes, rules, companyBreakdown, companyTrend, companyTimeline] =
      await Promise.all([
        ImpactScore.findOne(tenantFilter(req, { userId: req.user._id })),
        ImpactScore.find(tenantFilter(req, {}))
          .sort({ totalPoints: -1 })
          .limit(10)
          .populate('userId', 'name avatar role title isActive')
          .lean(),
        ImpactRule.find(tenantFilter(req, { enabled: true })).sort({ points: -1 }),
        categoryBreakdown(req.tenantId, scopeUserId),
        trendSeries(req.tenantId, scopeUserId, 30),
        ImpactLedger.find(
          tenantFilter(req, scopeUserId ? { userId: scopeUserId } : {}),
        )
          .sort({ createdAt: -1 })
          .limit(40)
          .populate('userId', 'name avatar role title')
          .populate('awardedBy', 'name avatar')
          .populate('projectId', 'name')
          .lean(),
      ])

    const score =
      me || (await recomputeImpactScore(req.tenantId, req.user._id))

    const people = await User.find(
      tenantFilter(req, {
        isPlatformAdmin: { $ne: true },
        role: { $nin: ['client', 'vendor'] },
      }),
    )
      .select('name avatar role title isActive')
      .sort({ name: 1 })
      .lean()

    res.json({
      success: true,
      me: score,
      badges: ACHIEVEMENT_LEVELS.map((level) => ({
        ...level,
        earned: badgesForTotal(score.totalPoints || 0).includes(level.key),
      })),
      top: leaderboardRes
        .filter((row) => row.userId)
        .map((row, index) => ({
          rank: index + 1,
          user: row.userId,
          totalPoints: row.totalPoints || 0,
          weeklyPoints: row.weeklyPoints || 0,
          monthlyPoints: row.monthlyPoints || 0,
          badges: row.badges || [],
        })),
      company: {
        scope: companyScope ? 'company' : 'self',
        breakdown: companyBreakdown.map((row) => ({
          category: row._id,
          points: row.points,
          count: row.count,
        })),
        trend: companyTrend,
        timeline: companyTimeline,
      },
      rules,
      people,
      achievements: ACHIEVEMENT_LEVELS,
      canManage: manage,
    })
  }),
)

export default router
