import type { AppColors } from '../../constants/theme'
import type {
  AgingBucket,
  DebitNoteStatus,
  GrnStatus,
  MaterialRequestStatus,
  MatchStatus,
  QcStatus,
  VendorPaymentStatus,
} from '../../types/procurementFlow'

/** Shared labels/colours for the procurement flow, used across every tab. */

export const GRN_STATUS_LABELS: Record<GrnStatus, string> = {
  draft: 'Draft',
  received: 'Received',
  qc_pending: 'QC pending',
  qc_done: 'QC done',
  closed: 'Closed',
}

export const QC_STATUS_LABELS: Record<QcStatus, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  damage: 'Damage',
  shortage: 'Shortage',
  partial: 'Partial',
}

export const DEBIT_STATUS_LABELS: Record<DebitNoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  disputed: 'Disputed',
  closed: 'Closed',
}

export const REQUEST_STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  issued: 'Issued',
  closed: 'Closed',
}

export const PAYMENT_STATUS_LABELS: Record<VendorPaymentStatus, string> = {
  draft: 'Draft',
  match_hold: 'Match hold',
  pending_accounts: 'With accounts',
  pending_management: 'With management',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

export const MATCH_LABELS: Record<MatchStatus, string> = {
  pending: 'Match pending',
  matched: '3-way matched',
  mismatch: 'Mismatch',
  waived: 'Match waived',
}

export const AGING_LABELS: Record<AgingBucket, string> = {
  not_due: 'Not due',
  near_due: 'Due soon',
  due_today: 'Due today',
  overdue: 'Overdue',
}

export function grnStatusColor(c: AppColors, status: GrnStatus): string {
  return {
    draft: c.textMuted,
    received: c.accent,
    qc_pending: c.warning,
    qc_done: c.success,
    closed: c.textMuted,
  }[status]
}

export function qcStatusColor(c: AppColors, status: QcStatus): string {
  return {
    accepted: c.success,
    rejected: c.danger,
    damage: c.danger,
    shortage: c.warning,
    partial: c.warning,
  }[status]
}

export function debitStatusColor(c: AppColors, status: DebitNoteStatus): string {
  return {
    draft: c.textMuted,
    sent: c.accent,
    accepted: c.success,
    disputed: c.danger,
    closed: c.textMuted,
  }[status]
}

export function requestStatusColor(c: AppColors, status: MaterialRequestStatus): string {
  return {
    draft: c.textMuted,
    submitted: c.warning,
    approved: c.accent,
    rejected: c.danger,
    issued: c.success,
    closed: c.textMuted,
  }[status]
}

export function paymentStatusColor(c: AppColors, status: VendorPaymentStatus): string {
  return {
    draft: c.textMuted,
    match_hold: c.danger,
    pending_accounts: c.warning,
    pending_management: c.warning,
    approved: c.accent,
    paid: c.success,
    cancelled: c.textMuted,
  }[status]
}

export function agingColor(c: AppColors, bucket: AgingBucket): string {
  return {
    not_due: c.textMuted,
    near_due: c.warning,
    due_today: c.warning,
    overdue: c.danger,
  }[bucket]
}

/** Populated refs come back as objects; unpopulated as ids. */
export function refName(ref: unknown, key = 'name'): string {
  if (ref && typeof ref === 'object') {
    const value = (ref as Record<string, unknown>)[key]
    if (typeof value === 'string') return value
  }
  return ''
}

export function refId(ref: unknown): string {
  if (typeof ref === 'string') return ref
  if (ref && typeof ref === 'object') {
    const value = (ref as Record<string, unknown>)._id
    if (typeof value === 'string') return value
  }
  return ''
}

export function shortDate(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}
