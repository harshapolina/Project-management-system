import mongoose from 'mongoose'

const vendorSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    categories: [{ type: String }],
    rating: { type: Number, default: 4, min: 1, max: 5 },
    paymentTerms: { type: String, default: 'Net 30' },
  },
  { timestamps: true },
)

export const Vendor = mongoose.model('Vendor', vendorSchema)

const purchaseOrderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    poNumber: { type: String, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    items: [
      {
        description: String,
        qty: Number,
        rate: Number,
        amount: Number,
        boqItemId: mongoose.Schema.Types.ObjectId,
      },
    ],
    value: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'approved', 'ordered', 'in_transit', 'delivered'],
      default: 'draft',
    },
    deliveryPhotos: [{ url: String, name: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema)

const expenseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    category: { type: String, default: 'Materials' },
    note: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const Expense = mongoose.model('Expense', expenseSchema)

const paymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['due', 'paid', 'pending'],
      default: 'pending',
    },
    dueDate: Date,
    paidAt: Date,
    note: String,
  },
  { timestamps: true },
)

export const Payment = mongoose.model('Payment', paymentSchema)

const siteUpdateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '' },
    photos: [{ url: String }],
    stage: String,
    progress: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const SiteUpdate = mongoose.model('SiteUpdate', siteUpdateSchema)

const snagSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    photo: { type: String, default: '' },
    afterPhoto: { type: String, default: '' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['open', 'fixed', 'verified'],
      default: 'open',
    },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  },
  { timestamps: true },
)

export const Snag = mongoose.model('Snag', snagSchema)
