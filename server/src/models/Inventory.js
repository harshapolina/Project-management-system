import mongoose from 'mongoose'

const inventoryItemSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    sku: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    unit: { type: String, default: 'pcs', trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    location: { type: String, default: '', trim: true },
    unitCost: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

inventoryItemSchema.index({ tenantId: 1, name: 1 })
inventoryItemSchema.index({ tenantId: 1, sku: 1 })

const inventoryMovementSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['in', 'out', 'adjust'],
      required: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: '' },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

inventoryMovementSchema.index({ tenantId: 1, createdAt: -1 })

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema)
export const InventoryMovement = mongoose.model(
  'InventoryMovement',
  inventoryMovementSchema,
)
