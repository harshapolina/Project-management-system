import mongoose from 'mongoose'
import { defaultTenantFeatures } from '../lib/tenantFeatures.js'

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
      enum: ['trial', 'active', 'suspended', 'cancelled'],
      default: 'active',
    },
    seatLimit: { type: Number, default: 30, min: 1 },
    /** Max company admins (role admin + owner). Set by platform admin only. */
    adminLimit: { type: Number, default: 3, min: 1, max: 50 },
    trialEndsAt: { type: Date, default: null },
    /** Subscription plan label (Editco billing tier). */
    subscriptionPlan: {
      type: String,
      enum: ['starter', 'pro', 'enterprise'],
      default: 'pro',
    },
    /** When set, workspace access is blocked (subscription ended). */
    cancelledAt: { type: Date, default: null },
    /** Module gates — platform admin can disable features per company. */
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: defaultTenantFeatures,
    },
    notes: { type: String, default: '' },
    /** Company brand mark shown in the workspace sidebar. */
    logoUrl: { type: String, default: '' },
    /** Tenant-defined roles for invites (key is stored on User.role). */
    customRoles: [
      {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        basedOn: {
          type: String,
          default: 'designer',
          trim: true,
        },
        permissions: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

tenantSchema.index({ status: 1 })

export const Tenant = mongoose.model('Tenant', tenantSchema)
