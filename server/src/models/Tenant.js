import mongoose from 'mongoose'

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid slug'],
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended'],
      default: 'active',
    },
    seatLimit: { type: Number, default: 30, min: 1 },
    trialEndsAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

tenantSchema.index({ status: 1 })

export const Tenant = mongoose.model('Tenant', tenantSchema)
