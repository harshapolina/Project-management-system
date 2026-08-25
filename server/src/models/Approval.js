import mongoose from 'mongoose'

/**
 * Approval routing.
 *
 * An *approval type* is a category of thing that can need sign-off. Four ship
 * built in and map onto existing records; workspaces can define their own on
 * top (e.g. "Site material indent") for processes the app doesn't model yet.
 *
 * An *approval rule* says who signs off on a type, optionally scoped to an
 * amount band — "purchase orders from ₹50,000 up go to the owner". When a
 * record is created, the most specific matching rule picks its approver.
 */

/**
 * `amountPath` is the field on the underlying document that a rule's
 * thresholds compare against. Types without one (tasks, most custom types)
 * always match their rules regardless of band.
 */
export const BUILTIN_APPROVAL_TYPES = [
  {
    key: 'purchase_order',
    label: 'Purchase order',
    description: 'Orders raised to vendors',
    amountPath: 'value',
  },
  {
    key: 'boq',
    label: 'BOQ / Quotation',
    description: 'Client estimates before they go out',
    amountPath: 'grandTotal',
  },
  {
    key: 'expense',
    label: 'Expense',
    description: 'Site and project spends',
    amountPath: 'amount',
  },
  {
    key: 'task',
    label: 'Task',
    description: 'Work marked as needing sign-off',
    amountPath: null,
  },
]

export const BUILTIN_APPROVAL_TYPE_KEYS = BUILTIN_APPROVAL_TYPES.map((t) => t.key)

const approvalTypeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    /** Stable slug referenced by rules and by routed records. */
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    /**
     * Custom types are free-form processes, so they carry no amount to compare
     * against. Kept as a field so a future release can point one at a value.
     */
    amountPath: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

approvalTypeSchema.index({ tenantId: 1, key: 1 }, { unique: true })

const approvalRuleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    /** Matches an approval type `key` (built-in or custom). */
    entityType: { type: String, required: true, trim: true, index: true },

    /** Inclusive lower bound. 0 means "from the first rupee". */
    minAmount: { type: Number, default: 0 },
    /** Exclusive upper bound; null means "and above". */
    maxAmount: { type: Number, default: null },

    /** Who signs off. The role keeps working as people come and go… */
    approverRole: { type: String, required: true, trim: true },
    /** …unless a specific person is pinned, which wins over the role. */
    approverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

approvalRuleSchema.index({ tenantId: 1, entityType: 1, minAmount: 1 })

export const ApprovalType = mongoose.model('ApprovalType', approvalTypeSchema)
export const ApprovalRule = mongoose.model('ApprovalRule', approvalRuleSchema)
