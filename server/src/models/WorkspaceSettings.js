import mongoose from 'mongoose'

const workspaceSettingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    key: { type: String, default: 'default' },
    // Public OAuth Client ID only (never store Client Secret in DB for browser GIS flow)
    googleClientId: { type: String, default: '' },
  },
  { timestamps: true },
)

workspaceSettingsSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const WorkspaceSettings = mongoose.model(
  'WorkspaceSettings',
  workspaceSettingsSchema,
)
