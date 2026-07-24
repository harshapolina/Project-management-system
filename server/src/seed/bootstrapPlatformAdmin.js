/**
 * One-shot: create/update Editco platform admin workspace + user.
 * Usage (from server/): node src/seed/bootstrapPlatformAdmin.js
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import mongoose from 'mongoose'

dotenv.config()

const SLUG = (process.env.PLATFORM_TENANT_SLUG || 'editco-media').toLowerCase()
const NAME = process.env.PLATFORM_TENANT_NAME || 'Editco Media'
const EMAIL = (
  process.env.PLATFORM_ADMIN_EMAIL || 'harshapolina1@gmail.com'
).toLowerCase()
const PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD
if (!PASSWORD) {
  console.error('Set PLATFORM_ADMIN_PASSWORD before running this script.')
  process.exit(1)
}
const ADMIN_NAME = process.env.PLATFORM_ADMIN_NAME || 'Editco Admin'

async function main() {
  await connectDB()

  let tenant = await Tenant.findOne({ slug: SLUG })
  if (!tenant) {
    tenant = await Tenant.create({
      name: NAME,
      slug: SLUG,
      status: 'active',
      seatLimit: 100,
      notes: 'Editco platform owner workspace',
    })
    console.log('Created tenant:', SLUG)
  } else {
    tenant.name = NAME
    tenant.status = 'active'
    await tenant.save()
    console.log('Updated tenant:', SLUG)
  }

  let user = await User.findOne({ email: EMAIL, tenantId: tenant._id })
  if (!user) {
    // Also find by email alone (migrate into this tenant)
    user = await User.findOne({ email: EMAIL })
  }

  if (!user) {
    user = await User.create({
      tenantId: tenant._id,
      name: ADMIN_NAME,
      email: EMAIL,
      password: PASSWORD,
      role: 'admin',
      isPlatformAdmin: true,
      onboardingCompleted: true,
      mustChangePassword: false,
    })
    console.log('Created platform admin:', EMAIL)
  } else {
    user.tenantId = tenant._id
    user.name = user.name || ADMIN_NAME
    user.role = 'admin'
    user.isPlatformAdmin = true
    user.onboardingCompleted = true
    user.mustChangePassword = false
    user.isActive = true
    user.password = PASSWORD
    await user.save()
    console.log('Updated platform admin:', EMAIL)
  }

  // Demote other platform admins optional — keep aanya as platform admin too if present
  console.log('\nLogin with:')
  console.log('  Workspace:', SLUG)
  console.log('  Email:    ', EMAIL)
  console.log('  Password: (the one you set)')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
