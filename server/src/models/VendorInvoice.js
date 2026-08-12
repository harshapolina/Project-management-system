import mongoose from 'mongoose'

const vendorInvoiceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    invoiceNumber: { type: String, required: true, trim: true },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue', 'cancelled'],
      default: 'unpaid',
      index: true,
    },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    notes: { type: String, default: '', trim: true },
    paidAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

vendorInvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 })

export const VendorInvoice = mongoose.model('VendorInvoice', vendorInvoiceSchema)
