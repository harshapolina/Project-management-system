/**
 * Types for the procurement supply-chain flow (GRN → QC → debit note →
 * material request → issue → vendor payment). Mirrors
 * server/src/models/ProcurementFlow.js so mobile and web read the same shapes.
 */

/** Populated refs come back as objects; unpopulated ones as id strings. */
export type Ref<T> = T | string | undefined

export interface NamedRef {
  _id: string
  name: string
}

export interface PoRef {
  _id: string
  poNumber: string
  value?: number
  status?: string
}

export interface VendorRef {
  _id: string
  name: string
  phone?: string
  email?: string
  paymentTerms?: string
}

/* ── GRN ─────────────────────────────────────────────────────── */

export type GrnStatus = 'draft' | 'received' | 'qc_pending' | 'qc_done' | 'closed'

export interface GrnLine {
  _id?: string
  description: string
  unit: string
  orderedQty: number
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  shortageQty: number
  damagedQty: number
  rate: number
  amount: number
  batchNo?: string
  remarks?: string
  poItemId?: string
  boqItemId?: string
}

export interface Grn {
  _id: string
  projectId?: Ref<NamedRef>
  purchaseOrder?: Ref<PoRef>
  vendor?: Ref<VendorRef>
  grnNumber: string
  invoiceNo?: string
  challanNo?: string
  receivedAt?: string
  warehouse?: string
  items: GrnLine[]
  photos?: { url: string; name?: string }[]
  notes?: string
  status: GrnStatus
  createdBy?: Ref<NamedRef>
  createdAt: string
  updatedAt: string
}

/* ── QC ──────────────────────────────────────────────────────── */

export type QcStatus = 'accepted' | 'rejected' | 'damage' | 'shortage' | 'partial'

export interface QcLine {
  _id?: string
  description: string
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  shortageQty: number
  damagedQty: number
  brandOk: boolean
  sizeOk: boolean
  damage: boolean
  remarks?: string
  photos?: { url: string; name?: string }[]
  grnItemId?: string
}

export interface QcInspection {
  _id: string
  projectId?: Ref<NamedRef>
  grn?: Ref<{ _id: string; grnNumber: string; status?: GrnStatus }>
  purchaseOrder?: Ref<PoRef>
  vendor?: Ref<VendorRef>
  checkedAt?: string
  checkedBy?: Ref<NamedRef>
  items: QcLine[]
  overallStatus: QcStatus
  siteRemarks?: string
  photos?: { url: string; name?: string }[]
  createdAt: string
}

/* ── Debit notes ─────────────────────────────────────────────── */

export type DebitNoteStatus = 'draft' | 'sent' | 'accepted' | 'disputed' | 'closed'

export interface DebitNoteLine {
  _id?: string
  description: string
  shortQty: number
  rate: number
  amount: number
  reason: string
}

export interface DebitNote {
  _id: string
  projectId?: Ref<NamedRef>
  vendor?: Ref<VendorRef>
  purchaseOrder?: Ref<PoRef>
  grn?: Ref<{ _id: string; grnNumber: string }>
  qc?: Ref<{ _id: string }>
  debitNumber: string
  items: DebitNoteLine[]
  debitAmount: number
  photos?: { url: string; name?: string }[]
  notes?: string
  status: DebitNoteStatus
  sentAt?: string
  vendorAckAt?: string
  createdAt: string
}

/* ── Material requests (MRN) ─────────────────────────────────── */

export type MaterialRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'issued'
  | 'closed'

export interface MaterialRequestLine {
  _id?: string
  description: string
  unit: string
  qty: number
  inventoryItemId?: string
  remarks?: string
}

export interface MaterialRequest {
  _id: string
  projectId?: Ref<NamedRef>
  requestNumber: string
  requiredBy?: string
  items: MaterialRequestLine[]
  status: MaterialRequestStatus
  requestedBy?: Ref<NamedRef>
  approvedBy?: Ref<NamedRef>
  approvedAt?: string
  notes?: string
  createdAt: string
}

/* ── Material issues (MIN) ───────────────────────────────────── */

export interface MaterialIssueLine {
  _id?: string
  description: string
  unit: string
  qty: number
  inventoryItemId?: string
  batchNo?: string
}

export interface MaterialIssue {
  _id: string
  projectId?: Ref<NamedRef>
  materialRequest?: Ref<{ _id: string; requestNumber: string }>
  issueNumber: string
  issuedAt?: string
  items: MaterialIssueLine[]
  issuedBy?: Ref<NamedRef>
  receivedByName?: string
  notes?: string
  status: 'draft' | 'issued' | 'cancelled'
  createdAt: string
}

/* ── Vendor payments ─────────────────────────────────────────── */

export type MatchStatus = 'pending' | 'matched' | 'mismatch' | 'waived'

export type AgingBucket = 'not_due' | 'near_due' | 'due_today' | 'overdue'

export type VendorPaymentStatus =
  | 'draft'
  | 'match_hold'
  | 'pending_accounts'
  | 'pending_management'
  | 'approved'
  | 'paid'
  | 'cancelled'

export interface PaymentFollowUp {
  _id?: string
  at: string
  channel: string
  contact?: string
  note?: string
  by?: Ref<NamedRef>
}

export interface VendorPayment {
  _id: string
  projectId?: Ref<NamedRef>
  vendor?: Ref<VendorRef>
  purchaseOrder?: Ref<PoRef>
  vendorInvoice?: Ref<{
    _id: string
    invoiceNumber: string
    amount?: number
    status?: string
    dueDate?: string
  }>
  grn?: Ref<{ _id: string; grnNumber: string }>
  paymentNumber: string
  invoiceAmount: number
  debitAmount: number
  tdsAmount: number
  otherDeductions: number
  netPayable: number
  matchStatus: MatchStatus
  matchNotes?: string
  dueDate?: string
  creditDays?: number
  agingBucket: AgingBucket
  followUps?: PaymentFollowUp[]
  status: VendorPaymentStatus
  paidAt?: string
  paidAmount?: number
  mode?: string
  bankAccount?: string
  utr?: string
  proofUrl?: string
  proofName?: string
  notes?: string
  createdAt: string
}

/* ── Dashboard + BOQ control ─────────────────────────────────── */

export interface ProcurementDashboard {
  pending: {
    rfqs: number
    draftPos: number
    inTransitPos: number
    grnQc: number
    debitNotes: number
    materialRequests: number
    payments: number
    overduePayments: number
    unpaidInvoices: number
  }
}

export interface BoqControlLine {
  quotationId: string
  quotationTitle?: string
  versionLabel?: string
  boqItemId?: string
  description?: string
  unit?: string
  room?: string
  boqQty: number
  orderedQty: number
  purchasedQty: number
  availableQty: number
  rate?: number
  amount?: number
}

export interface BoqControl {
  quotations: {
    _id: string
    title: string
    versionLabel?: string
    grandTotal?: number
    updatedAt?: string
  }[]
  lines: BoqControlLine[]
  summary: { lineCount: number; shortLines: number; openLines: number }
}
