import mongoose from 'mongoose'

const lineSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    hsnSac: { type: String, default: '' },
    gstRate: { type: Number, default: 18 },
    qty: { type: Number, default: 1 },
    unit: { type: String, default: 'LS' },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: true },
)

const partySchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    gstin: { type: String, default: '' },
    stateName: { type: String, default: '' },
    stateCode: { type: String, default: '' },
  },
  { _id: false },
)

const bankSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    branch: { type: String, default: '' },
    ifsc: { type: String, default: '' },
  },
  { _id: false },
)

const clientInvoiceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    invoiceNumber: { type: String, required: true, trim: true },
    invoiceDate: { type: Date, default: Date.now },
    invoiceType: {
      type: String,
      enum: ['tax', 'proforma'],
      default: 'tax',
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'cancelled'],
      default: 'draft',
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },

    /** Seller (your company) */
    companyName: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    companyGstin: { type: String, default: '' },
    companyStateName: { type: String, default: '' },
    companyStateCode: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    companyEmail: { type: String, default: '' },
    companyWebsite: { type: String, default: '' },
    companyLogo: { type: String, default: '' },

    /** Invoice metadata grid */
    buyersOrderNo: { type: String, default: '' },
    buyersOrderDate: { type: String, default: '' },
    deliveryNote: { type: String, default: '' },
    modeOfPayment: { type: String, default: '' },
    referenceNo: { type: String, default: '' },
    dispatchDocNo: { type: String, default: '' },
    dispatchedThrough: { type: String, default: '' },
    destination: { type: String, default: '' },

    consignee: { type: partySchema, default: () => ({}) },
    buyer: { type: partySchema, default: () => ({}) },

    items: [lineSchema],

    /** GST split — CGST+SGST for intra-state, IGST for inter-state */
    gstMode: {
      type: String,
      enum: ['cgst_sgst', 'igst'],
      default: 'cgst_sgst',
    },
    cgstPercent: { type: Number, default: 9 },
    sgstPercent: { type: Number, default: 9 },
    igstPercent: { type: Number, default: 18 },

    bank: { type: bankSchema, default: () => ({}) },
    signatoryName: { type: String, default: '' },
    signatoryTitle: { type: String, default: 'Authorised Signatory' },
    declaration: {
      type: String,
      default:
        'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    },
    jurisdiction: { type: String, default: 'SUBJECT TO HYDERABAD JURISDICTION' },
    notes: { type: String, default: '' },

    taxableAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

clientInvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true })

export const ClientInvoice = mongoose.model('ClientInvoice', clientInvoiceSchema)
