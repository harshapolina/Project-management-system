import {
  ImpactRule,
  ImpactLedger,
  ImpactScore,
} from '../models/Impact.js'

export const DEFAULT_IMPACT_RULES = [
  {
    key: 'task_early',
    label: 'Complete a task before deadline',
    description: 'Task marked done with due date still in the future',
    points: 20,
    category: 'productivity',
    auto: true,
    weight: 1,
  },
  {
    key: 'task_on_time',
    label: 'Complete a task on time',
    description: 'Task marked done on the due date (same calendar day)',
    points: 15,
    category: 'productivity',
    auto: true,
    weight: 1,
  },
  {
    key: 'task_late',
    label: 'Miss a deadline',
    description: 'Task marked done after the due date',
    points: -15,
    category: 'penalty',
    auto: true,
    weight: 1,
  },
  {
    key: 'client_feedback',
    label: 'Receive positive client feedback',
    description: 'Manual award for strong client praise',
    points: 30,
    category: 'client',
    auto: false,
    weight: 1,
  },
  {
    key: 'help_teammate',
    label: 'Help another team member',
    description: 'Manual award for collaboration',
    points: 10,
    category: 'collaboration',
    auto: false,
    weight: 1,
  },
  {
    key: 'quality_no_revisions',
    label: 'Submit high-quality work without revisions',
    description: 'Manual award for clean delivery',
    points: 25,
    category: 'quality',
    auto: false,
    weight: 1,
  },
  {
    key: 'approved_improvement',
    label: 'Suggest an approved improvement',
    description: 'Manual award for process / product ideas',
    points: 20,
    category: 'improvement',
    auto: false,
    weight: 1,
  },
  {
    key: 'meeting_on_time',
    label: 'Attend meetings on time',
    description: 'Manual award for punctual meeting attendance',
    points: 5,
    category: 'attendance',
    auto: false,
    weight: 1,
  },
  {
    key: 'poor_quality',
    label: 'Poor quality work requiring major revisions',
    description: 'Manual deduction for rework',
    points: -20,
    category: 'penalty',
    auto: false,
    weight: 1,
  },
  {
    key: 'unapproved_absence',
    label: 'Unapproved absence',
    description: 'Manual deduction for no-show / unapproved leave',
    points: -25,
    category: 'penalty',
    auto: false,
    weight: 1,
  },
]

export const ACHIEVEMENT_LEVELS = [
  {
    key: 'rising_star',
    label: 'Rising Star',
    minPoints: 100,
    description: 'First 100 impact points earned',
  },
  {
    key: 'consistent',
    label: 'Consistent Performer',
    minPoints: 500,
    description: '500 all-time impact points',
  },
  {
    key: 'high_impact',
    label: 'High Impact',
    minPoints: 1000,
    description: '1,000 all-time impact points',
  },
  {
    key: 'champion',
    label: 'Company Champion',
    minPoints: 2500,
    description: '2,500 all-time impact points',
  },
]

function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

function startOfMonth(date = new Date()) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function badgesForTotal(total) {
  return ACHIEVEMENT_LEVELS.filter((level) => total >= level.minPoints).map(
    (level) => level.key,
  )
}

export async function ensureDefaultImpactRules(tenantId) {
  const existing = await ImpactRule.countDocuments({ tenantId })
  if (existing > 0) return ImpactRule.find({ tenantId }).sort({ points: -1 })

  await ImpactRule.insertMany(
    DEFAULT_IMPACT_RULES.map((rule) => ({ ...rule, tenantId })),
  )
  return ImpactRule.find({ tenantId }).sort({ points: -1 })
}

export async function recomputeImpactScore(tenantId, userId) {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  const [totalAgg, weekAgg, monthAgg] = await Promise.all([
    ImpactLedger.aggregate([
      { $match: { tenantId, userId } },
      { $group: { _id: null, sum: { $sum: '$weightedPoints' } } },
    ]),
    ImpactLedger.aggregate([
      { $match: { tenantId, userId, createdAt: { $gte: weekStart } } },
      { $group: { _id: null, sum: { $sum: '$weightedPoints' } } },
    ]),
    ImpactLedger.aggregate([
      { $match: { tenantId, userId, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, sum: { $sum: '$weightedPoints' } } },
    ]),
  ])

  const totalPoints = totalAgg[0]?.sum || 0
  const weeklyPoints = weekAgg[0]?.sum || 0
  const monthlyPoints = monthAgg[0]?.sum || 0
  const badges = badgesForTotal(totalPoints)

  const score = await ImpactScore.findOneAndUpdate(
    { tenantId, userId },
    {
      $set: {
        totalPoints,
        weeklyPoints,
        monthlyPoints,
        badges,
      },
    },
    { upsert: true, new: true },
  )

  return score
}

/**
 * Award (or deduct) impact points. Idempotent when idempotencyKey is set.
 */
export async function awardImpactPoints({
  tenantId,
  userId,
  ruleKey = 'manual',
  points,
  label,
  category = 'manual',
  weight = 1,
  note = '',
  source = 'auto',
  awardedBy = null,
  projectId = null,
  taskId = null,
  meta = {},
  idempotencyKey = '',
}) {
  if (!tenantId || !userId) return null
  if (!Number.isFinite(Number(points)) || Number(points) === 0) return null

  if (idempotencyKey) {
    const existing = await ImpactLedger.findOne({ tenantId, idempotencyKey })
    if (existing) return existing
  }

  const weightedPoints = Math.round(Number(points) * Number(weight || 1))
  try {
    const entry = await ImpactLedger.create({
      tenantId,
      userId,
      ruleKey,
      label: label || ruleKey,
      category,
      points: Number(points),
      weightedPoints,
      note,
      source,
      awardedBy,
      projectId: projectId || undefined,
      taskId: taskId || undefined,
      meta,
      idempotencyKey: idempotencyKey || '',
    })

    await ImpactScore.findOneAndUpdate(
      { tenantId, userId },
      {
        $inc: {
          totalPoints: weightedPoints,
          weeklyPoints: weightedPoints,
          monthlyPoints: weightedPoints,
        },
        $set: { lastAwardedAt: new Date() },
        $setOnInsert: { badges: [] },
      },
      { upsert: true },
    )

    // Refresh badges / period totals accurately
    await recomputeImpactScore(tenantId, userId)
    return entry
  } catch (err) {
    // Unique idempotency race
    if (err?.code === 11000 && idempotencyKey) {
      return ImpactLedger.findOne({ tenantId, idempotencyKey })
    }
    throw err
  }
}

export async function awardFromRule({
  tenantId,
  userId,
  ruleKey,
  note = '',
  source = 'auto',
  awardedBy = null,
  projectId = null,
  taskId = null,
  meta = {},
  idempotencyKey = '',
}) {
  await ensureDefaultImpactRules(tenantId)
  const rule = await ImpactRule.findOne({ tenantId, key: ruleKey, enabled: true })
  if (!rule) return null

  return awardImpactPoints({
    tenantId,
    userId,
    ruleKey: rule.key,
    points: rule.points,
    label: rule.label,
    category: rule.category,
    weight: rule.weight,
    note,
    source,
    awardedBy,
    projectId,
    taskId,
    meta,
    idempotencyKey,
  })
}

function sameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Auto-score a task when it becomes done (or leaves done → reverse not applied;
 * we only score the first transition to done via idempotency).
 */
export async function scoreTaskCompletion({ tenantId, task, previousStatus }) {
  if (!task || previousStatus === 'done' || task.status !== 'done') return null
  const userId = task.assignee?._id || task.assignee
  if (!userId) return null

  await ensureDefaultImpactRules(tenantId)

  let ruleKey = 'task_on_time'
  if (task.dueDate) {
    const due = new Date(task.dueDate)
    const now = new Date()
    if (now < due && !sameCalendarDay(now, due)) ruleKey = 'task_early'
    else if (now > due && !sameCalendarDay(now, due)) ruleKey = 'task_late'
    else ruleKey = 'task_on_time'
  }

  return awardFromRule({
    tenantId,
    userId,
    ruleKey,
    source: 'auto',
    projectId: task.projectId?._id || task.projectId || null,
    taskId: task._id,
    note: `Task completed: ${task.title}`,
    meta: { title: task.title, dueDate: task.dueDate || null },
    idempotencyKey: `task-done:${String(task._id)}`,
  })
}

export async function categoryBreakdown(tenantId, userId, { from, to } = {}) {
  const match = { tenantId }
  if (userId) match.userId = userId
  if (from || to) {
    match.createdAt = {}
    if (from) match.createdAt.$gte = from
    if (to) match.createdAt.$lte = to
  }
  return ImpactLedger.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        points: { $sum: '$weightedPoints' },
        count: { $sum: 1 },
      },
    },
    { $sort: { points: -1 } },
  ])
}

export async function trendSeries(tenantId, userId, days = 30) {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - (days - 1))

  const match = { tenantId, createdAt: { $gte: from } }
  if (userId) match.userId = userId

  const rows = await ImpactLedger.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        points: { $sum: '$weightedPoints' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  const map = Object.fromEntries(rows.map((r) => [r._id, r.points]))
  const series = []
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    series.push({ date: key, points: map[key] || 0 })
  }
  return series
}
