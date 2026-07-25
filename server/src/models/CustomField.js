import mongoose from 'mongoose'

const customFieldSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'user', 'select', 'number'],
      default: 'text',
    },
    options: [{ type: String }],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

customFieldSchema.index({ tenantId: 1, slug: 1 }, { unique: true })

export const CustomFieldDefinition = mongoose.model(
  'CustomFieldDefinition',
  customFieldSchema,
)
