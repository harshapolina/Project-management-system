import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    clientName: { type: String, required: true },
    contactName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    source: { type: String, default: 'Website' },
    estimatedValue: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: [
        'new_enquiry',
        'site_visit',
        'quotation_sent',
        'negotiation',
        'won',
        'lost',
      ],
      default: 'new_enquiry',
    },
    nextFollowUp: Date,
    notes: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    convertedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  },
  { timestamps: true },
)

export const Lead = mongoose.model('Lead', leadSchema)

const boqItemSchema = new mongoose.Schema(
  {
    description: String,
    unit: { type: String, default: 'nos' },
    qty: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    room: { type: String, default: 'General' },
    image: { type: String, default: '' },
    /** Material specification (plywood master template) */
    materialFamily: { type: String, default: '' },
    materialName: { type: String, default: '' },
    grade: { type: String, default: '' },
    thickness: { type: String, default: '' },
    brand: { type: String, default: '' },
    dimensions: { type: String, default: '' },
  },
  { _id: true },
)

const quotationAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, required: true },
    mime: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const quotationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    title: { type: String, required: true },
    versionLabel: { type: String, default: 'Standard' },
    /** residential = BWR IS 303 · commercial = BWP 710 */
    boqType: {
      type: String,
      enum: ['residential', 'commercial', 'general'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'approved', 'rejected'],
      default: 'draft',
    },
    items: [boqItemSchema],
    attachments: [quotationAttachmentSchema],
    subtotal: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: Date,
    viewedAt: Date,
    approvedAt: Date,
  },
  { timestamps: true },
)

export const Quotation = mongoose.model('Quotation', quotationSchema)

const fileVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const fileSchema = new mongoose.Schema(
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
    folder: {
      type: String,
      enum: ['concepts', 'drawings', 'renders', 'approvals', 'site_photos'],
      default: 'concepts',
    },
    name: { type: String, required: true },
    mime: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'approved', 'rejected'],
      default: 'draft',
    },
    clientVisible: { type: Boolean, default: false },
    versions: [fileVersionSchema],
    currentVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
)

export const ProjectFile = mongoose.model('ProjectFile', fileSchema)
