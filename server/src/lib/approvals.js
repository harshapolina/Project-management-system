import { ApprovalRule, ApprovalType, BUILTIN_APPROVAL_TYPES } from '../models/Approval.js'
import { User } from '../models/User.js'

/** Does this rule's band contain `value`? Upper bound is exclusive. */
export function ruleMatches(rule, value) {
  if (rule.isActive === false) return false
  const min = Number(rule.minAmount) || 0
  if (value < min) return false
  if (rule.maxAmount != null && value >= Number(rule.maxAmount)) return false
  return true
}

/**
 * Resolving an approver is "most specific wins": of every active rule whose
 * band contains the amount, the one with the highest `minAmount` takes it.
 * That lets a workspace layer "…and anything from ₹50,000 goes to the owner"
 * on top of a catch-all without having to reorder anything.
 *
 * Two rules can start at the same figure — "₹2L and up → owner" alongside
 * "₹2L–₹5L → admin". The narrower band is the more specific instruction, so it
 * wins the overlap and the open-ended rule keeps everything above it. Without
 * an explicit tie-break here the winner would fall out of document order,
 * which is invisible to whoever wrote the policy.
 */
export function pickRule(rules, amount) {
  const value = Number(amount) || 0
  const matches = rules.filter((r) => ruleMatches(r, value))
  if (!matches.length) return null

  return matches.reduce((best, r) => {
    const min = Number(r.minAmount) || 0
    const bestMin = Number(best.minAmount) || 0
    if (min !== bestMin) return min > bestMin ? r : best

    const max = r.maxAmount == null ? Infinity : Number(r.maxAmount)
    const bestMax = best.maxAmount == null ? Infinity : Number(best.maxAmount)
    return max < bestMax ? r : best
  })
}

/**
 * Collapse overlapping rules into the bands that will actually be used.
 *
 * Rules are stored as overlapping "from X upwards" spans, which is easy to
 * write but hard to read: a catch-all sitting under a ₹50,000 escalation only
 * really covers ₹0–₹49,999, and two rules starting at the same figure means
 * one of them may never fire.
 *
 * So rather than hand clients the raw rules and have each reimplement this,
 * walk every amount at which the answer could change, ask `pickRule` who wins
 * in each stretch, and merge neighbours that agree. Clients just render the
 * result, which means the panel can never disagree with the engine.
 *
 * Rules that never win anywhere come back with `shadowed: true` so a dead
 * policy is visible rather than silently doing nothing.
 */
export function computeBands(rules, hasAmount) {
  if (!rules.length) return []

  if (!hasAmount) {
    // No amount to compare, so exactly one rule can ever win.
    const winner = pickRule(rules, 0)
    return rules.map((rule) => ({
      ruleId: String(rule._id),
      min: 0,
      max: null,
      shadowed: !winner || String(rule._id) !== String(winner._id),
    }))
  }

  const edges = new Set([0])
  for (const r of rules) {
    edges.add(Number(r.minAmount) || 0)
    if (r.maxAmount != null) edges.add(Number(r.maxAmount))
  }
  const points = [...edges].sort((a, b) => a - b)

  const spans = []
  for (let i = 0; i < points.length; i++) {
    const from = points[i]
    const to = i + 1 < points.length ? points[i + 1] : null
    const winner = pickRule(rules, from)
    if (!winner) continue

    const prev = spans[spans.length - 1]
    if (prev && prev.ruleId === String(winner._id) && prev.max === from) {
      prev.max = to
    } else {
      spans.push({ ruleId: String(winner._id), min: from, max: to, shadowed: false })
    }
  }

  const covering = new Set(spans.map((b) => b.ruleId))
  const dead = rules
    .filter((r) => !covering.has(String(r._id)))
    .map((rule) => ({ ruleId: String(rule._id), min: 0, max: 0, shadowed: true }))

  return [...spans, ...dead]
}

/**
 * Turn a rule into an actual person.
 *
 * A pinned user wins. Otherwise the role is resolved against the workspace —
 * oldest active member of that role, so the answer is stable rather than
 * changing with document order.
 */
export async function resolveApproverUser(tenantId, rule) {
  if (!rule) return null
  if (rule.approverUser) return rule.approverUser._id || rule.approverUser

  const user = await User.findOne({
    tenantId,
    role: rule.approverRole,
    isActive: { $ne: false },
  })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean()

  return user?._id || null
}

/**
 * Full resolution for one record: which rule applies, and who it lands on.
 *
 * Returns `{ rule: null, approver: null }` when the workspace has no rule for
 * this type — callers treat that as "no approval needed" rather than an error,
 * so adding rules is what switches routing on.
 */
export async function resolveApproval(tenantId, entityType, amount) {
  const rules = await ApprovalRule.find({
    tenantId,
    entityType,
    isActive: { $ne: false },
  }).lean()

  const rule = pickRule(rules, amount)
  if (!rule) return { rule: null, approver: null }

  const approver = await resolveApproverUser(tenantId, rule)
  return { rule, approver }
}

/**
 * Built-in types plus this workspace's custom ones, in one list.
 * Built-ins are synthesised rather than seeded so every workspace picks up
 * changes to the built-in set without a migration.
 */
export async function listApprovalTypes(tenantId) {
  const custom = await ApprovalType.find({ tenantId }).sort({ createdAt: 1 }).lean()

  const builtin = BUILTIN_APPROVAL_TYPES.map((t) => ({
    ...t,
    _id: null,
    isBuiltin: true,
    isActive: true,
  }))

  return [
    ...builtin,
    ...custom.map((t) => ({ ...t, isBuiltin: false })),
  ]
}
