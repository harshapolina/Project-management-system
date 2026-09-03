import mongoose from 'mongoose'

const lineSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    unit: { type: String, default: 'nos' },
    orderedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    acceptedQty: { type: Number, default: 0 },
    rejectedQty: { type: Number, default: 0 },
    shortageQty: { type: Number, default: 0 },
    damagedQty: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    batchNo: { type: String, default: '' },
    remarks: { type: String, default: '' },
    poItemId: { type: mongoose.Schema.Types.ObjectId },
    boqItemId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: true },
)

/** 11 — Goods Receipt Note (supports partial receipts against a PO) */
const grnSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    grnNumber: { type: String, required: true },
    invoiceNo: { type: String, default: '' },
    challanNo: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now },
    warehouse: { type: String, default: '' },
    items: [lineSchema],
    photos: [{ url: String, name: String }],
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'received', 'qc_pending', 'qc_done', 'closed'],
      default: 'received',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const Grn = mongoose.model('Grn', grnSchema)

/** 12 — Quality Check against a GRN */
const qcSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    grn: { type: mongoose.Schema.Types.ObjectId, ref: 'Grn', required: true, index: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    checkedAt: { type: Date, default: Date.now },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [
      {
        description: String,
        receivedQty: Number,
        acceptedQty: Number,
        rejectedQty: Number,
        shortageQty: Number,
        damagedQty: Number,
        brandOk: { type: Boolean, default: true },
        sizeOk: { type: Boolean, default: true },
        damage: { type: Boolean, default: false },
        remarks: { type: String, default: '' },
        photos: [{ url: String, name: String }],
        grnItemId: mongoose.Schema.Types.ObjectId,
      },
    ],
    overallStatus: {
      type: String,
      enum: ['accepted', 'rejected', 'damage', 'shortage', 'partial'],
      default: 'accepted',
    },
    siteRemarks: { type: String, default: '' },
    photos: [{ url: String, name: String }],
  },
  { timestamps: true },
)

export const QcInspection = mongoose.model('QcInspection', qcSchema)

/** 13C — Debit note for shortage / damage */
const debitNoteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    grn: { type: mongoose.Schema.Types.ObjectId, ref: 'Grn' },
    qc: { type: mongoose.Schema.Types.ObjectId, ref: 'QcInspection' },
    debitNumber: { type: String, required: true },
    items: [
      {
        description: String,
        shortQty: Number,
        rate: Number,
        amount: Number,
        reason: { type: String, default: 'shortage' },
      },
    ],
    debitAmount: { type: Number, default: 0 },
    photos: [{ url: String, name: String }],
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'disputed', 'closed'],
      default: 'draft',
    },
    sentAt: Date,
    vendorAckAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const DebitNote = mongoose.model('DebitNote', debitNoteSchema)

/** 15 — Material request from site */
const materialRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    requestNumber: { type: String, required: true },
    requiredBy: Date,
    items: [
      {
        description: String,
        unit: { type: String, default: 'nos' },
        qty: { type: Number, default: 0 },
        inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        remarks: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'issued', 'closed'],
      default: 'draft',
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

export const MaterialRequest = mongoose.model('MaterialRequest', materialRequestSchema)

/** 16 — Material issue to site (reduces inventory) */
const materialIssueSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    materialRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialRequest' },
    issueNumber: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    items: [
      {
        description: String,
        unit: { type: String, default: 'nos' },
        qty: { type: Number, default: 0 },
        inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        batchNo: { type: String, default: '' },
      },
    ],
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedByName: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'issued', 'cancelled'],
      default: 'issued',
    },
  },
  { timestamps: true },
)

export const MaterialIssue = mongoose.model('MaterialIssue', materialIssueSchema)

/**
 * 19–25 — Vendor payment gate with 3-way match, approvals, proof, history.
 * Complements the lightweight Payment model used by billing Mark paid.
 */
const vendorPaymentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    vendorInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorInvoice' },
    grn: { type: mongoose.Schema.Types.ObjectId, ref: 'Grn' },
    paymentNumber: { type: String, required: true },
    invoiceAmount: { type: Number, default: 0 },
    debitAmount: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    matchStatus: {
      type: String,
      enum: ['pending', 'matched', 'mismatch', 'waived'],
      default: 'pending',
    },
    matchNotes: { type: String, default: '' },
    dueDate: Date,
    creditDays: { type: Number, default: 30 },
    agingBucket: {
      type: String,
      enum: ['not_due', 'near_due', 'due_today', 'overdue'],
      default: 'not_due',
    },
    followUps: [
      {
        at: { type: Date, default: Date.now },
        channel: { type: String, default: 'call' },
        contact: { type: String, default: '' },
        note: { type: String, default: '' },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    status: {
      type: String,
      enum: [
        'draft',
        'match_hold',
        'pending_accounts',
        'pending_management',
        'approved',
        'paid',
        'cancelled',
      ],
      default: 'draft',
    },
    paidAt: Date,
    paidAmount: { type: Number, default: 0 },
    mode: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    utr: { type: String, default: '' },
    proofUrl: { type: String, default: '' },
    proofName: { type: String, default: '' },
    approvedByAccounts: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedByManagement: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

export const VendorPayment = mongoose.model('VendorPayment', vendorPaymentSchema)
