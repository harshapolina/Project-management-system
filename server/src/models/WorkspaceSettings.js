import mongoose from 'mongoose'

const workspaceSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    // Public OAuth Client ID only (never store Client Secret in DB for browser GIS flow)
    googleClientId: { type: String, default: '' },
  },
  { timestamps: true },
)

export const WorkspaceSettings = mongoose.model(
  'WorkspaceSettings',
  workspaceSettingsSchema,
)
