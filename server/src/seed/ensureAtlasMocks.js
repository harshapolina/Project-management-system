/**
 * Non-destructive Atlas / local mock ensure:
 * - Upserts demo login accounts (same credentials as the login page)
 * - If the workspace has no projects, seeds sample projects / tasks / leads / vendors
 * Does NOT wipe existing data. Does NOT remove platform admins.
 *
 * Usage: npm run seed:mocks  (from server/)
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { ensureDefaultTenant } from '../middleware/tenant.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { Project } from '../models/Project.js'
import { Task } from '../models/Task.js'
import { Lead } from '../models/LeadQuotationFile.js'
import {
  Vendor,
  PurchaseOrder,
  Expense,
  SiteUpdate,
  Payment,
} from '../models/ProcurementFinance.js'
import { VendorInvoice } from '../models/VendorInvoice.js'
import { InventoryItem } from '../models/Inventory.js'

dotenv.config()

const STAGE_DEFS = [
  { key: 'design', label: 'Design' },
  { key: 'planning', label: 'Planning / BOQ' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'execution', label: 'Execution' },
  { key: 'handover', label: 'QC / Handover' },
]

const covers = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
]

/** Full module access for demo employee / PM accounts */
const DEMO_EMPLOYEE_PERMS = {
  'projects.create': true,
  'projects.manage': true,
  'tasks.create': true,
  'tasks.manage': true,
  finance: true,
  procurement: true,
  leads: true,
  portfolio: true,
  site: true,
  impact: true,
  boq: true,
  'files.manage': true,
  people: false,
}

const MOCK_USERS = [
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
    name: 'Aanya Mehta',
    email: 'admin@cubic.demo',
    password: 'Company@Admin123',
    role: 'admin',
    title: 'Studio Principal',
    avatar: 'https://i.pravatar.cc/150?u=aanya',
  },
  {
    name: 'Demo Company HR',
    email: 'hr@cubic.demo',
    password: 'Company@HR123',
    role: 'hr',
    title: 'Human Resources',
  },
  {
    name: 'Rohan Kapoor',
    email: 'employee@cubic.demo',
    password: 'Employee@Demo123',
    role: 'project_manager',
    title: 'Project Manager',
    avatar: 'https://i.pravatar.cc/150?u=rohan',
    permissions: DEMO_EMPLOYEE_PERMS,
  },
  {
    name: 'Maya Sen',
    email: 'maya@cubic.studio',
    password: 'demo1234',
    role: 'designer',
    title: 'Lead Designer',
    avatar: 'https://i.pravatar.cc/150?u=maya',
    permissions: {
      impact: true,
      'tasks.create': true,
      'files.manage': true,
      boq: true,
    },
  },
  {
    name: 'Vikram Rao',
    email: 'vikram@cubic.studio',
    password: 'demo1234',
    role: 'site_supervisor',
    title: 'Site Supervisor',
    avatar: 'https://i.pravatar.cc/150?u=vikram',
    permissions: {
      impact: true,
      site: true,
      'tasks.create': true,
    },
  },
  {
    name: 'Priya Sharma',
    email: 'priya@client.com',
    password: 'demo1234',
    role: 'client',
    title: 'Client',
    company: 'Sharma Residence',
    avatar: 'https://i.pravatar.cc/150?u=priya',
  },
  {
    name: 'BlueRock Materials',
    email: 'orders@bluerock.com',
    password: 'demo1234',
    role: 'vendor',
    title: 'Vendor',
    avatar: 'https://i.pravatar.cc/150?u=bluerock',
  },
]

async function upsertUser(tenant, details) {
  const email = details.email.toLowerCase()
  let user = await User.findOne(
    details.isPlatformAdmin
      ? { email, isPlatformAdmin: true }
      : { tenantId: tenant._id, email },
  )
  const created = !user
  if (!user) {
    user = new User({
      tenantId: tenant._id,
      email,
    })
  }

  user.name = details.name
  user.password = details.password
  user.role = details.role
  user.title = details.title || ''
  user.company = details.company || ''
  user.avatar = details.avatar || user.avatar || ''
  user.permissions = details.permissions || user.permissions || {}
  user.isPlatformAdmin = !!details.isPlatformAdmin
  user.isActive = true
  user.onboardingCompleted = true
  user.mustChangePassword = false
  await user.save()
  return { email, created, user }
}

async function seedSampleWorkspace(tenant, byEmail) {
  const tid = tenant._id
  const pm = byEmail['employee@cubic.demo']
  const designer = byEmail['maya@cubic.studio']
  const supervisor = byEmail['vikram@cubic.studio']
  const client = byEmail['priya@client.com']
  if (!pm || !designer || !supervisor || !client) {
    console.log('  Skipping sample data — core users missing')
    return
  }

  const now = new Date()
  const days = (n) => new Date(now.getTime() + n * 86400000)

  console.log('  Creating sample projects…')
  const projects = await Project.create([
    {
      tenantId: tid,
      name: 'Sharma Penthouse',
      code: 'CUB-241',
      clientName: 'Priya Sharma',
      clientId: client._id,
      type: 'residential',
      status: 'in_progress',
      currentStage: 'execution',
      stages: STAGE_DEFS.map((s, i) => ({
        ...s,
        progress: i < 3 ? 100 : i === 3 ? 62 : 10,
        status: i < 3 ? 'completed' : i === 3 ? 'in_progress' : 'not_started',
      })),
      coverImage: covers[0],
      location: 'Bandra West, Mumbai',
      startDate: days(-90),
      endDate: days(45),
      budget: 4800000,
      spent: 3120000,
      progress: 68,
      projectManager: pm._id,
      members: [
        { user: pm._id, role: 'project_manager' },
        { user: designer._id, role: 'designer' },
        { user: supervisor._id, role: 'site_supervisor' },
        { user: client._id, role: 'client' },
      ],
    },
    {
      tenantId: tid,
      name: 'Orchid Offices',
      code: 'CUB-238',
      clientName: 'Orchid Realty',
      type: 'commercial',
      status: 'delayed',
      currentStage: 'procurement',
      stages: STAGE_DEFS.map((s, i) => ({
        ...s,
        progress: i < 2 ? 100 : i === 2 ? 40 : 0,
        status: i < 2 ? 'completed' : i === 2 ? 'delayed' : 'not_started',
      })),
      coverImage: covers[1],
      location: 'Whitefield, Bengaluru',
      startDate: days(-120),
      endDate: days(-5),
      budget: 9200000,
      spent: 4100000,
      progress: 42,
      projectManager: pm._id,
      members: [
        { user: pm._id, role: 'project_manager' },
        { user: designer._id, role: 'designer' },
        { user: supervisor._id, role: 'site_supervisor' },
      ],
      isDelayed: true,
    },
    {
      tenantId: tid,
      name: 'Lakeview Villa',
      code: 'CUB-245',
      clientName: 'Arjun Desai',
      type: 'residential',
      status: 'in_progress',
      currentStage: 'design',
      stages: STAGE_DEFS.map((s, i) => ({
        ...s,
        progress: i === 0 ? 55 : 0,
        status: i === 0 ? 'in_progress' : 'not_started',
      })),
      coverImage: covers[2],
      location: 'Lonavala',
      startDate: days(-20),
      endDate: days(150),
      budget: 6500000,
      spent: 420000,
      progress: 12,
      projectManager: pm._id,
      members: [
        { user: pm._id, role: 'project_manager' },
        { user: designer._id, role: 'designer' },
      ],
    },
    {
      tenantId: tid,
      name: 'Harbor Café Fit-out',
      code: 'CUB-230',
      clientName: 'Harbor Group',
      type: 'commercial',
      status: 'completed',
      currentStage: 'handover',
      stages: STAGE_DEFS.map((s) => ({
        ...s,
        progress: 100,
        status: 'completed',
      })),
      coverImage: covers[3],
      location: 'Colaba, Mumbai',
      startDate: days(-200),
      endDate: days(-30),
      budget: 2100000,
      spent: 1980000,
      progress: 100,
      projectManager: pm._id,
      members: [
        { user: pm._id, role: 'project_manager' },
        { user: designer._id, role: 'designer' },
        { user: supervisor._id, role: 'site_supervisor' },
      ],
    },
  ])

  const [sharma, orchid, lakeview] = projects

  console.log('  Creating sample tasks…')
  await Task.create([
    {
      tenantId: tid,
      projectId: sharma._id,
      title: 'Approve living room joinery shop drawings',
      stage: 'execution',
      status: 'review',
      priority: 'high',
      assignee: pm._id,
      createdBy: designer._id,
      dueDate: days(0),
      progress: 90,
      requiresApproval: true,
      approvalStatus: 'pending',
    },
    {
      tenantId: tid,
      projectId: sharma._id,
      title: 'Site QC — master suite flooring',
      stage: 'execution',
      status: 'todo',
      priority: 'urgent',
      assignee: supervisor._id,
      createdBy: pm._id,
      dueDate: days(0),
      progress: 0,
    },
    {
      tenantId: tid,
      projectId: orchid._id,
      title: 'Chase delayed stone cladding PO',
      stage: 'procurement',
      status: 'in_progress',
      priority: 'urgent',
      assignee: pm._id,
      createdBy: pm._id,
      dueDate: days(-3),
      progress: 55,
    },
    {
      tenantId: tid,
      projectId: lakeview._id,
      title: 'Concept board — living & dining',
      stage: 'design',
      status: 'in_progress',
      priority: 'high',
      assignee: designer._id,
      createdBy: pm._id,
      dueDate: days(3),
      progress: 60,
    },
    {
      tenantId: tid,
      projectId: sharma._id,
      title: 'Coordinate lighting fixtures delivery',
      stage: 'procurement',
      status: 'in_progress',
      priority: 'medium',
      assignee: pm._id,
      createdBy: pm._id,
      dueDate: days(2),
      progress: 40,
    },
  ])

  console.log('  Creating sample leads…')
  await Lead.create([
    {
      tenantId: tid,
      clientName: 'The Grove Homestay',
      contactName: 'Neha Patel',
      phone: '+91 98765 11111',
      email: 'neha@example.com',
      source: 'Instagram',
      stage: 'site_visit',
      estimatedValue: 3500000,
      owner: pm._id,
      notes: 'Interested in 3BHK renovation',
    },
    {
      tenantId: tid,
      clientName: 'Nexus Towers',
      contactName: 'Suresh Iyer',
      phone: '+91 98765 22222',
      email: 'suresh@example.com',
      source: 'Referral',
      stage: 'quotation_sent',
      estimatedValue: 5200000,
      owner: pm._id,
    },
    {
      tenantId: tid,
      clientName: 'Kavya Nair Residence',
      contactName: 'Kavya Nair',
      phone: '+91 98765 33333',
      stage: 'new_enquiry',
      estimatedValue: 1800000,
      owner: byEmail['admin@cubic.demo']?._id || pm._id,
    },
  ])

  console.log('  Creating vendors / POs / expenses…')
  const [vendorA] = await Vendor.create([
    {
      tenantId: tid,
      name: 'BlueRock Materials',
      categories: ['Stone', 'Tiles'],
      contact: 'Ravi',
      phone: '+91 98000 10001',
      email: 'orders@bluerock.com',
      rating: 4,
    },
    {
      tenantId: tid,
      name: 'Lumen Electricals',
      categories: ['Electrical', 'Lighting'],
      contact: 'Ankit',
      phone: '+91 98000 10002',
      email: 'sales@lumen.example',
      rating: 5,
    },
  ])

  const po = await PurchaseOrder.create({
    tenantId: tid,
    poNumber: 'PO-2401',
    vendor: vendorA._id,
    projectId: orchid._id,
    items: [
      {
        description: 'Italian marble',
        qty: 120,
        rate: 280,
        amount: 33600,
      },
    ],
    value: 33600,
    status: 'in_transit',
    createdBy: pm._id,
  })

  await Expense.create([
    {
      tenantId: tid,
      projectId: sharma._id,
      category: 'Materials',
      amount: 45000,
      note: 'Consumables — week 12',
      status: 'approved',
      submittedBy: supervisor._id,
      approvedBy: pm._id,
    },
    {
      tenantId: tid,
      projectId: lakeview._id,
      category: 'Travel',
      amount: 3200,
      note: 'Site visit Lonavala',
      status: 'pending',
      submittedBy: designer._id,
    },
  ])

  await Payment.create({
    tenantId: tid,
    projectId: orchid._id,
    vendorId: vendorA._id,
    amount: 150000,
    status: 'due',
    dueDate: days(7),
    note: 'Advance against PO-2401',
  })

  await VendorInvoice.create({
    tenantId: tid,
    invoiceNumber: 'INV-BR-884',
    vendor: vendorA._id,
    purchaseOrder: po._id,
    projectId: orchid._id,
    amount: 168000,
    status: 'unpaid',
    invoiceDate: days(-2),
    dueDate: days(12),
    notes: '50% against marble delivery',
    createdBy: pm._id,
  })

  console.log('  Creating site updates + inventory…')
  await SiteUpdate.create([
    {
      tenantId: tid,
      projectId: sharma._id,
      author: supervisor._id,
      note: 'Living room false ceiling framing complete. Ready for wiring inspection.',
      progress: 68,
    },
    {
      tenantId: tid,
      projectId: orchid._id,
      author: supervisor._id,
      note: 'Stone cladding delayed — vendor expects trucks by Friday.',
      progress: 42,
    },
  ])

  await InventoryItem.create([
    {
      tenantId: tid,
      name: 'Cement bags (OPC 53)',
      sku: 'CEM-53',
      category: 'Civil',
      unit: 'bags',
      quantity: 42,
      reorderLevel: 20,
      location: 'Godown A',
      unitCost: 380,
    },
    {
      tenantId: tid,
      name: 'LED strip warm white',
      sku: 'LED-WW-5M',
      category: 'Electrical',
      unit: 'rolls',
      quantity: 8,
      reorderLevel: 10,
      location: 'Site store',
      unitCost: 650,
    },
    {
      tenantId: tid,
      name: 'Plywood 18mm',
      sku: 'PLY-18',
      category: 'Carpentry',
      unit: 'sheets',
      quantity: 0,
      reorderLevel: 5,
      location: 'Godown B',
      unitCost: 1850,
    },
  ])

  console.log(
    `  Sample data ready (${projects.length} projects, vendors, invoices, inventory).`,
  )
}

async function main() {
  const uri = process.env.MONGODB_URI || ''
  if (!uri.includes('mongodb')) {
    throw new Error('MONGODB_URI missing in server/.env')
  }

  console.log(
    'Connecting…',
    uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'),
  )
  await connectDB()
  console.log(`Connected → database "${mongoose.connection.name}"`)

  const tenant = await ensureDefaultTenant({ skipBackfill: false })
  console.log(`Tenant: ${tenant.name} (slug=${tenant.slug})`)

  // Keep aanya as company user if present (not platform).
  await User.updateOne(
    { tenantId: tenant._id, email: 'aanya@cubic.studio', isPlatformAdmin: true },
    { $set: { isPlatformAdmin: false } },
  )

  console.log('\nUpserting mock credentials…')
  const byEmail = {}
  for (const details of MOCK_USERS) {
    const { email, created, user } = await upsertUser(tenant, details)
    byEmail[email] = user
    console.log(`  ${created ? 'CREATED' : 'UPDATED'}  ${email}`)
  }

  const projectCount = await Project.countDocuments({ tenantId: tenant._id })
  if (projectCount === 0) {
    console.log('\nNo projects found — seeding sample workspace data…')
    await seedSampleWorkspace(tenant, byEmail)
  } else {
    console.log(
      `\nWorkspace already has ${projectCount} project(s) — leaving data intact.`,
    )
  }

  const [users, projects, tasks, leads, vendors, invoices, stock] =
    await Promise.all([
      User.countDocuments({ tenantId: tenant._id }),
      Project.countDocuments({ tenantId: tenant._id }),
      Task.countDocuments({ tenantId: tenant._id }),
      Lead.countDocuments({ tenantId: tenant._id }),
      Vendor.countDocuments({ tenantId: tenant._id }),
      VendorInvoice.countDocuments({ tenantId: tenant._id }),
      InventoryItem.countDocuments({ tenantId: tenant._id }),
    ])

  console.log('\n— workspace snapshot —')
  console.log(`  users              ${users}`)
  console.log(`  projects           ${projects}`)
  console.log(`  tasks              ${tasks}`)
  console.log(`  leads              ${leads}`)
  console.log(`  vendors            ${vendors}`)
  console.log(`  invoices           ${invoices}`)
  console.log(`  inventory items    ${stock}`)

  console.log('\n— mock logins (workspace: cubic) —')
  console.log('  admin@cubic.demo      Company@Admin123')
  console.log('  employee@cubic.demo   Employee@Demo123')
  console.log('  owner@cubic.demo      Company@Owner123')
  console.log('  hr@cubic.demo         Company@HR123')
  console.log('  maya@cubic.studio     demo1234')
  console.log('  vikram@cubic.studio   demo1234')
  console.log('  Platform: editcomedia@gmail.com / DTH@editco')

  await mongoose.disconnect()
  console.log('\nDone.')
}

main().catch(async (e) => {
  console.error('FAILED:', e.message)
  console.error(e.stack)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
