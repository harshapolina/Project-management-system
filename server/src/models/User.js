import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export const ROLES = [
  'admin',
  'owner',
  'project_manager',
  'designer',
  'site_supervisor',
  'vendor',
  'client',
]

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'project_manager' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    title: { type: String, default: '' },
    company: { type: String, default: 'Cubic Studio' },
    isActive: { type: Boolean, default: true },
    onboardingCompleted: { type: Boolean, default: false },
    inviteToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    refreshTokens: [{ type: String, select: false }],
    googleCalendar: {
      connected: { type: Boolean, default: false },
      email: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      expiryDate: { type: Number, default: null },
      connectedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    phone: this.phone,
    title: this.title,
    company: this.company,
    onboardingCompleted: this.onboardingCompleted,
    googleCalendarConnected: !!this.googleCalendar?.connected,
    googleCalendarEmail: this.googleCalendar?.email || '',
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
