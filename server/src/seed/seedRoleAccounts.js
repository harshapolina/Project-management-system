import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'

dotenv.config()

const ACCOUNTS = [
  {
    name: 'Editco Platform Admin',
    email: 'editcomedia@gmail.com',
    password: 'DTH@editco',
    role: 'admin',
    title: 'Platform Administrator',
    isPlatformAdmin: true,
  },
  {
    name: 'Demo Company Owner',
    email: 'owner@cubic.demo',
    password: 'Company@Owner123',
    role: 'owner',
    title: 'Company Owner',
  },
  {
    name: 'Demo Company Admin',
    email: 'admin@cubic.demo',
    password: 'Company@Admin123',
    role: 'admin',
    title: 'Company Administrator',
  },
  {
    name: 'Demo Company HR',
    email: 'hr@cubic.demo',
    password: 'Company@HR123',
    role: 'hr',
    title: 'Human Resources',
  },
  {
    name: 'Demo Employee',
    email: 'employee@cubic.demo',
    password: 'Employee@Demo123',
    role: 'project_manager',
    title: 'Project Manager',
  },
]

async function upsertAccount(tenant, details) {
  const email = details.email.toLowerCase()
  let user = await User.findOne(
    details.isPlatformAdmin
      ? { email, isPlatformAdmin: true }
      : { tenantId: tenant._id, email },
  )
  if (!user) {
    user = new User({ tenantId: tenant._id, email })
  }

  user.name = details.name
  user.password = details.password
  user.role = details.role
  user.title = details.title
  user.isPlatformAdmin = !!details.isPlatformAdmin
  user.isActive = true
  user.onboardingCompleted = true
  user.mustChangePassword = false
  await user.save()
}

async function seedRoleAccounts() {
  await connectDB()
  const slug = process.env.DEMO_TENANT_SLUG || 'cubic'
  const tenant = await Tenant.findOne({ slug })
  if (!tenant) {
    throw new Error(`Workspace "${slug}" does not exist. Run the main seed first.`)
  }

  // Migrate the original demo seed away from its combined admin/platform account.
  await User.updateOne(
    { tenantId: tenant._id, email: 'aanya@cubic.studio', isPlatformAdmin: true },
    { $set: { isPlatformAdmin: false } },
  )

  for (const account of ACCOUNTS) {
    await upsertAccount(tenant, account)
  }

  console.log(`Role-tier demo accounts are ready in workspace "${slug}".`)
  await mongoose.disconnect()
}

seedRoleAccounts().catch(async (error) => {
  console.error('Role account seed failed:', error.message)
  await mongoose.disconnect()
  process.exit(1)
})
