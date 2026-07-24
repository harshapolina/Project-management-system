import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { User } from '../models/User.js'
import { Project } from '../models/Project.js'
import { Task } from '../models/Task.js'
import { Lead, Quotation } from '../models/LeadQuotationFile.js'
import { Vendor, PurchaseOrder, Expense, SiteUpdate, Snag } from '../models/ProcurementFinance.js'
import { ActivityLog, Notification, Comment } from '../models/Activity.js'
import { Message } from '../models/Message.js'

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

async function seed() {
  await connectDB()
  console.log('Clearing collections…')
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Lead.deleteMany({}),
    Quotation.deleteMany({}),
    Vendor.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Expense.deleteMany({}),
    SiteUpdate.deleteMany({}),
    Snag.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
    Message.deleteMany({}),
    Comment.deleteMany({}),
  ])

  console.log('Creating users…')
  const [admin, pm, designer, supervisor, client, vendorUser] = await User.create([
    {
      name: 'Aanya Mehta',
      email: 'aanya@cubic.studio',
      password: 'demo1234',
      role: 'admin',
      title: 'Studio Principal',
      onboardingCompleted: true,
      avatar: 'https://i.pravatar.cc/150?u=aanya',
    },
    {
      name: 'Rohan Kapoor',
      email: 'rohan@cubic.studio',
      password: 'demo1234',
      role: 'project_manager',
      title: 'Project Manager',
      onboardingCompleted: true,
      avatar: 'https://i.pravatar.cc/150?u=rohan',
    },
    {
      name: 'Maya Sen',
      email: 'maya@cubic.studio',
      password: 'demo1234',
      role: 'designer',
      title: 'Lead Designer',
      onboardingCompleted: true,
      avatar: 'https://i.pravatar.cc/150?u=maya',
    },
    {
      name: 'Vikram Rao',
      email: 'vikram@cubic.studio',
      password: 'demo1234',
      role: 'site_supervisor',
      title: 'Site Supervisor',
      onboardingCompleted: true,
      avatar: 'https://i.pravatar.cc/150?u=vikram',
    },
    {
      name: 'Priya Sharma',
      email: 'priya@client.com',
      password: 'demo1234',
      role: 'client',
      title: 'Client',
      company: 'Sharma Residence',
      onboardingCompleted: true,
      avatar: 'https://i.pravatar.cc/150?u=priya',
    },
    {
      name: 'BlueRock Materials',
      email: 'orders@bluerock.com',
      password: 'demo1234',
      role: 'vendor',
      title: 'Vendor',
      onboardingCompleted: true,
      avatar: 'https://i.pravatar.cc/150?u=bluerock',
    },
  ])

  const now = new Date()
  const days = (n) => new Date(now.getTime() + n * 86400000)

  console.log('Creating projects…')
  const projects = await Project.create([
    {
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
      isDelayed: false,
    },
    {
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
      isDelayed: false,
    },
    {
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
      isDelayed: false,
    },
  ])

  const [sharma, orchid, lakeview] = projects

  console.log('Creating tasks…')
  const tasks = await Task.create([
    {
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
    {
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
      projectId: orchid._id,
      title: 'Vendor site visit — façade samples',
      stage: 'procurement',
      status: 'todo',
      priority: 'high',
      assignee: supervisor._id,
      createdBy: pm._id,
      dueDate: days(1),
      progress: 0,
    },
    {
      projectId: lakeview._id,
      title: 'Concept board — living & dining',
      stage: 'design',
      status: 'in_progress',
      priority: 'high',
      assignee: designer._id,
      createdBy: pm._id,
      dueDate: days(3),
      progress: 60,
      requiresApproval: true,
      approvalStatus: 'pending',
    },
    {
      projectId: lakeview._id,
      title: 'Moodboard revision after client call',
      stage: 'design',
      status: 'todo',
      priority: 'medium',
      assignee: designer._id,
      createdBy: designer._id,
      dueDate: days(5),
      progress: 0,
    },
    {
      projectId: sharma._id,
      title: 'Upload snag photos — guest bath',
      stage: 'execution',
      status: 'todo',
      priority: 'medium',
      assignee: supervisor._id,
      createdBy: supervisor._id,
      dueDate: days(-1),
      progress: 0,
    },
    {
      projectId: sharma._id,
      title: 'Weekly client progress walkthrough',
      stage: 'execution',
      status: 'todo',
      priority: 'medium',
      assignee: pm._id,
      createdBy: admin._id,
      dueDate: days(4),
      progress: 0,
    },
  ])

  console.log('Creating leads & quotation…')
  const leads = await Lead.create([
    {
      clientName: 'Nexus Towers',
      contactName: 'Karan Malhotra',
      email: 'karan@nexus.com',
      phone: '+91 98765 11111',
      source: 'Referral',
      estimatedValue: 12500000,
      stage: 'quotation_sent',
      nextFollowUp: days(2),
      owner: pm._id,
      notes: 'Lobby + 3 sample floors. Prefers premium finishes.',
    },
    {
      clientName: 'The Grove Homestay',
      contactName: 'Neha Iyer',
      email: 'neha@grove.in',
      phone: '+91 98200 22222',
      source: 'Instagram',
      estimatedValue: 3800000,
      stage: 'site_visit',
      nextFollowUp: days(1),
      owner: pm._id,
    },
    {
      clientName: 'Atlas Fintech HQ',
      contactName: 'Dev Patel',
      email: 'dev@atlas.tech',
      phone: '+91 99000 33333',
      source: 'Website',
      estimatedValue: 18000000,
      stage: 'new_enquiry',
      nextFollowUp: days(0),
      owner: admin._id,
    },
  ])

  await Quotation.create({
    leadId: leads[0]._id,
    title: 'Nexus Towers — Lobby Fit-out',
    versionLabel: 'Premium',
    status: 'sent',
    sentAt: days(-4),
    items: [
      { description: 'Italian marble flooring', unit: 'sqft', qty: 4200, rate: 450, amount: 1890000, room: 'Lobby' },
      { description: 'Custom reception desk', unit: 'nos', qty: 1, rate: 380000, amount: 380000, room: 'Lobby' },
      { description: 'Acoustic wall panels', unit: 'sqft', qty: 1800, rate: 220, amount: 396000, room: 'Lounge' },
    ],
    subtotal: 2666000,
    gstPercent: 18,
    discount: 50000,
    grandTotal: 3095880,
    createdBy: pm._id,
  })

  console.log('Creating vendors & POs…')
  const [bluerock, liteCo] = await Vendor.create([
    {
      name: 'BlueRock Materials',
      contact: 'Suresh Nair',
      email: 'orders@bluerock.com',
      phone: '+91 98111 44444',
      categories: ['Stone', 'Tiles'],
      rating: 4.6,
      paymentTerms: 'Net 30',
    },
    {
      name: 'Lumen Lighting Co.',
      contact: 'Ankit Shah',
      email: 'sales@lumen.co',
      categories: ['Lighting'],
      rating: 4.2,
      paymentTerms: 'Net 15',
    },
  ])

  await PurchaseOrder.create([
    {
      projectId: sharma._id,
      poNumber: 'PO-1042',
      vendor: bluerock._id,
      items: [{ description: 'Calacatta slabs', qty: 40, rate: 18000, amount: 720000 }],
      value: 720000,
      status: 'in_transit',
      createdBy: pm._id,
    },
    {
      projectId: orchid._id,
      poNumber: 'PO-1038',
      vendor: bluerock._id,
      items: [{ description: 'Façade cladding', qty: 120, rate: 9500, amount: 1140000 }],
      value: 1140000,
      status: 'ordered',
      createdBy: pm._id,
    },
  ])

  await Expense.create([
    {
      projectId: sharma._id,
      amount: 18500,
      category: 'Materials',
      note: 'Touch-up paints & consumables',
      status: 'pending',
      submittedBy: supervisor._id,
    },
    {
      projectId: sharma._id,
      amount: 4200,
      category: 'Transport',
      note: 'Fixture delivery to site',
      status: 'approved',
      submittedBy: supervisor._id,
      approvedBy: pm._id,
    },
  ])

  await SiteUpdate.create([
    {
      projectId: sharma._id,
      author: supervisor._id,
      note: 'Master suite flooring 80% complete. Waiting on skirting profiles.',
      photos: [{ url: covers[0] }],
      stage: 'execution',
      progress: 62,
    },
    {
      projectId: orchid._id,
      author: supervisor._id,
      note: 'Stone cladding delayed — vendor confirmed revised ETA Friday.',
      photos: [{ url: covers[1] }],
      stage: 'procurement',
      progress: 40,
    },
  ])

  await Snag.create([
    {
      projectId: sharma._id,
      title: 'Hairline crack on guest bath tile joint',
      assignee: supervisor._id,
      status: 'open',
      photo: covers[0],
    },
    {
      projectId: sharma._id,
      title: 'Misaligned wardrobe handle — bedroom 2',
      assignee: designer._id,
      status: 'fixed',
    },
  ])

  console.log('Creating activity & notifications…')
  await ActivityLog.create([
    {
      projectId: sharma._id,
      actor: designer._id,
      type: 'approval_requested',
      message: 'Maya requested approval on living room joinery drawings',
      mentions: [pm._id],
    },
    {
      projectId: orchid._id,
      actor: supervisor._id,
      type: 'site_update',
      message: 'Vikram posted a site update — cladding delay',
      mentions: [pm._id, admin._id],
    },
    {
      projectId: lakeview._id,
      actor: designer._id,
      type: 'file_uploaded',
      message: 'Maya uploaded Concept board v2 for Lakeview Villa',
      mentions: [pm._id],
    },
    {
      projectId: sharma._id,
      actor: pm._id,
      type: 'stage',
      message: 'Rohan moved Sharma Penthouse into Execution',
    },
  ])

  await Notification.create([
    {
      userId: pm._id,
      type: 'approval',
      title: 'Approval needed',
      body: 'Living room joinery shop drawings await your review',
      link: `/projects/${sharma._id}/files`,
      projectId: sharma._id,
    },
    {
      userId: pm._id,
      type: 'delay',
      title: 'Project delayed',
      body: 'Orchid Offices is behind schedule on procurement',
      link: `/projects/${orchid._id}`,
      projectId: orchid._id,
    },
    {
      userId: supervisor._id,
      type: 'task',
      title: 'Task due today',
      body: 'Site QC — master suite flooring',
      link: `/projects/${sharma._id}/tasks`,
      projectId: sharma._id,
    },
    {
      userId: designer._id,
      type: 'mention',
      title: 'You were mentioned',
      body: 'Rohan mentioned you in Lakeview Villa activity',
      link: `/projects/${lakeview._id}/activity`,
      projectId: lakeview._id,
    },
  ])

  console.log('Creating assigned comments…')
  await Comment.create([
    {
      projectId: lakeview._id,
      taskId: tasks[5]._id,
      author: designer._id,
      body: '@Rohan Kapoor moodboard v2 is ready — can you review the living & dining palette before Thursday?',
      mentions: [pm._id],
      assignedTo: pm._id,
    },
    {
      projectId: sharma._id,
      taskId: tasks[0]._id,
      author: designer._id,
      body: '@Rohan Kapoor client asked for walnut stain samples on the joinery. Flagging for your approval.',
      mentions: [pm._id],
      assignedTo: pm._id,
    },
    {
      projectId: orchid._id,
      taskId: tasks[3]._id,
      author: supervisor._id,
      body: 'Vendor confirmed cladding delay of 5 days. @Rohan Kapoor — please update the Orchid timeline.',
      mentions: [pm._id],
      assignedTo: pm._id,
    },
    {
      projectId: sharma._id,
      taskId: tasks[1]._id,
      author: pm._id,
      body: '@Vikram Rao please share photos of master suite flooring after today’s QC pass.',
      mentions: [supervisor._id],
      assignedTo: supervisor._id,
    },
    {
      projectId: lakeview._id,
      taskId: tasks[5]._id,
      author: pm._id,
      body: '@Maya Sen looks strong — please export a client-safe PDF and drop it in Files.',
      mentions: [designer._id],
      assignedTo: designer._id,
    },
    {
      projectId: orchid._id,
      taskId: tasks[4]._id,
      author: admin._id,
      body: '@Rohan Kapoor can you join the façade sample visit tomorrow morning?',
      mentions: [pm._id],
      assignedTo: pm._id,
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: pm._id,
    },
    {
      projectId: sharma._id,
      taskId: tasks[2]._id,
      author: designer._id,
      body: 'Lighting schedule updated in BOQ. Checking delivery window with procurement.',
    },
  ])

  console.log('Creating personal list tasks…')
  await Task.create([
    {
      isPersonal: true,
      title: 'Book dentist appointment',
      status: 'todo',
      priority: 'medium',
      assignee: pm._id,
      createdBy: pm._id,
      dueDate: days(4),
    },
    {
      isPersonal: true,
      title: 'Prep weekly studio standup notes',
      status: 'todo',
      priority: 'high',
      assignee: pm._id,
      createdBy: pm._id,
      dueDate: days(1),
    },
    {
      isPersonal: true,
      title: 'Renew Autodesk license',
      status: 'todo',
      priority: 'low',
      assignee: pm._id,
      createdBy: pm._id,
    },
  ])

  console.log('Creating company mail…')
  await Message.create([
    {
      from: admin._id,
      to: pm._id,
      subject: 'Kickoff this week',
      body: 'Rohan — can we lock Sharma Penthouse client walkthrough for Thursday morning?',
    },
    {
      from: pm._id,
      to: admin._id,
      body: 'Yes — 10:30 works. I’ll confirm with Priya.',
    },
    {
      from: designer._id,
      to: pm._id,
      subject: 'Lakeview concepts',
      body: 'Moodboard v2 is ready for your review before we send to the client.',
    },
    {
      from: supervisor._id,
      to: pm._id,
      body: 'Site update: master suite flooring will finish tomorrow if skirting arrives.',
    },
    {
      from: pm._id,
      to: designer._id,
      body: 'Looks good Maya — please share the client-visible version in Files.',
    },
  ])

  console.log('\nSeed complete.\n')
  console.log('Demo logins (password: demo1234):')
  console.log('  Admin / PM:   aanya@cubic.studio  |  rohan@cubic.studio')
  console.log('  Designer:     maya@cubic.studio')
  console.log('  Supervisor:   vikram@cubic.studio')
  console.log('  Client:       priya@client.com')
  console.log(`  Tasks created: ${tasks.length}`)

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
