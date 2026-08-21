import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    name: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
)

channelSchema.index({ tenantId: 1, name: 1 }, { unique: true })

const channelMessageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: { type: String, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
)

channelMessageSchema.index({ channelId: 1, createdAt: -1 })

export const Channel = mongoose.model('Channel', channelSchema)
export const ChannelMessage = mongoose.model(
  'ChannelMessage',
  channelMessageSchema,
)
