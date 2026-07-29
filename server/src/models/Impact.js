import mongoose from 'mongoose'

/** Company-configurable scoring rules for Impact Points. */
const impactRuleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
      required: true,
    },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    points: { type: Number, required: true },
    category: {
      type: String,
      enum: [
        'productivity',
        'quality',
        'collaboration',
        'client',
        'attendance',
        'improvement',
        'manual',
        'penalty',
      ],
      default: 'productivity',
    },
    /** When true, engine may auto-award this rule from system events. */
    auto: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    weight: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true },
)

impactRuleSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const ImpactRule = mongoose.model('ImpactRule', impactRuleSchema)

/** Immutable ledger of every point gain / deduction. */
const impactLedgerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    ruleKey: { type: String, default: 'manual' },
    label: { type: String, required: true },
    category: { type: String, default: 'manual' },
    points: { type: Number, required: true },
    /** Effective points after weight (points * weight). */
    weightedPoints: { type: Number, required: true },
    note: { type: String, default: '' },
    source: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Dedup key so the same auto event is not scored twice. */
    idempotencyKey: { type: String, default: '' },
  },
  { timestamps: true },
)

impactLedgerSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })
impactLedgerSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } } },
)

export const ImpactLedger = mongoose.model('ImpactLedger', impactLedgerSchema)

/** Cached totals per user for fast leaderboards. */
const impactScoreSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    totalPoints: { type: Number, default: 0 },
    weeklyPoints: { type: Number, default: 0 },
    monthlyPoints: { type: Number, default: 0 },
    badges: [{ type: String }],
    lastAwardedAt: { type: Date },
  },
  { timestamps: true },
)

impactScoreSchema.index({ tenantId: 1, userId: 1 }, { unique: true })
impactScoreSchema.index({ tenantId: 1, totalPoints: -1 })

export const ImpactScore = mongoose.model('ImpactScore', impactScoreSchema)
