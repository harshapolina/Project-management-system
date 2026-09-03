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
    /**
     * Brand colour sat behind the company's logo mark.
     *
     * Logos arrive as transparent PNGs as often as not, so the mark needs a
     * deliberate backdrop rather than whatever the surface happens to be. Empty
     * means "use a neutral surface" — the app should not invent a brand colour
     * for a company that hasn't chosen one.
     */
    brandColor: { type: String, default: '', trim: true },
    /**
     * A message the platform owner shows inside this company's app — a renewal
     * reminder, a payment chase, scheduled downtime.
     *
     * Lives on the tenant rather than in Notification because it is addressed to
     * the company rather than to a person: everyone sees the same thing, it has
     * no read state, and it stops the moment `active` goes false. `dismissible`
     * exists so a soft reminder can be waved away while a hard one (an overdue
     * account) stays put.
     */
    notice: {
      active: { type: Boolean, default: false },
      title: { type: String, default: '', trim: true },
      message: { type: String, default: '', trim: true },
      variant: {
        type: String,
        enum: ['info', 'warning', 'urgent'],
        default: 'info',
      },
      dismissible: { type: Boolean, default: true },
      /**
       * Freezes the company's app behind the notice until it's lifted.
       *
       * Distinct from `dismissible: false`, which only pins a banner in place.
       * Blocking is the payment wall: they can still sign in and read the
       * message, but nothing underneath is usable. Deliberately not
       * `status: 'suspended'`, which locks them out entirely and leaves nowhere
       * to explain why or to settle up.
       */
      blocking: { type: Boolean, default: false },
      updatedAt: { type: Date, default: null },
    },
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
