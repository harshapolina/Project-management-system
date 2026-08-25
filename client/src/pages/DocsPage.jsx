import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  Camera,
  CheckSquare,
  FileSpreadsheet,
  FolderKanban,
  Gauge,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { Input } from '../components/ui'
import { useAuthStore } from '../lib/api'
import { capabilitiesForUser } from '../lib/roles'
import { cn } from '../lib/utils'

/**
 * In-app handbook.
 *
 * Written against what the app actually does today rather than what's planned —
 * a doc that overstates the product is worse than none, because people stop
 * trusting it. Where a feature is thinner than its name suggests, `caveat` says
 * so plainly.
 *
 * Each entry carries the capability that gates it, so the page can dim what the
 * reader can't reach instead of sending them to a screen that will bounce them.
 */
const SECTIONS = [
  {
    id: 'start',
    title: 'Getting started',
    icon: Gauge,
    blurb: 'Where things live, and how access works.',
    features: [
      {
        name: 'Your home screen',
        to: '/portfolio',
        cap: 'portfolio',
        what: 'A portfolio-level view of every project: budget, progress, stage and health in one place.',
        use: [
          'Open Dashboard from the sidebar.',
          'Each card is a project — click one to open its workspace.',
          'Use the range pills to change the reporting window.',
        ],
      },
      {
        name: 'My work',
        to: '/?view=assigned',
        cap: 'myWork',
        what: 'Every task assigned to you across all projects, so you do not have to hunt project by project.',
        use: [
          'Open My work from the sidebar.',
          'Tasks are grouped by due state — overdue first.',
          'Click a task to open it and update status, progress or comments.',
        ],
      },
      {
        name: 'Global search',
        cap: null,
        what: 'Jumps to any project, task, person, lead or vendor from anywhere.',
        use: ['Click the search bar at the top of any page.', 'Type a few letters.', 'Press Enter on a result to jump straight to it.'],
      },
      {
        name: 'Roles and what they unlock',
        to: '/admin',
        cap: 'people',
        what:
          'Eight roles ship with the app: owner, admin, HR, project manager, designer, site supervisor, vendor and client. ' +
          'Each starts from a default permission set, which can then be overridden per person.',
        use: [
          'Open People from the sidebar.',
          'Click a teammate to see their role and effective permissions.',
          'Toggle an individual permission to override the role default for that person only.',
        ],
        caveat: 'Owner and admin are the only roles that reach Company, Approvals and Platform screens.',
      },
    ],
  },

  {
    id: 'projects',
    title: 'Projects',
    icon: FolderKanban,
    blurb: 'The container everything else hangs off.',
    features: [
      {
        name: 'Projects list',
        to: '/projects',
        cap: 'projects',
        what: 'Every project in the workspace with stage, status and client.',
        use: ['Open Projects from the sidebar.', 'Filter by status or search by name.', 'Click a project to open its workspace.'],
        add: [
          'Click + New project at the top of the sidebar.',
          'Give it a name and client, then set the start and end dates.',
          'Pick a project type — residential, commercial or general. This drives which BOQ template you get.',
          'Add team members now or from the Team tab later.',
        ],
      },
      {
        name: 'Project workspace',
        to: '/projects',
        cap: 'projects',
        what:
          'Each project opens into seven tabs: Home, Tasks, Materials, Site, Notes, Drawings and Team. ' +
          'Tabs you lack permission for are hidden rather than shown disabled.',
        use: [
          'Open any project.',
          'Home summarises health, stages and spend.',
          'Move between tabs without losing your place — the project stays loaded.',
        ],
      },
      {
        name: 'Stages and progress',
        cap: 'projects',
        what: 'Projects move through design → planning/BOQ → procurement → execution, each with its own percentage.',
        use: ['Open a project → Home.', 'Update a stage percentage as work completes.', 'Overall project progress is derived from the stages.'],
      },
    ],
  },

  {
    id: 'tasks',
    title: 'Tasks',
    icon: CheckSquare,
    blurb: 'Work assignment, tracking and sign-off.',
    features: [
      {
        name: 'Project tasks',
        to: '/projects',
        cap: 'tasks',
        what: 'Tasks belong to a project, carry an assignee, due date, priority, checklist and time tracking.',
        use: [
          'Open a project → Tasks.',
          'Click a task to open the detail panel.',
          'Update status, tick checklist items, log time, or comment.',
        ],
        add: [
          'Open a project → Tasks → New task.',
          'Set a title, assignee and due date.',
          'Optionally add a checklist, estimate and priority.',
          'Tick "requires approval" if it needs sign-off before it can be closed.',
        ],
      },
      {
        name: 'Comments and mentions',
        to: '/assigned-comments',
        cap: 'tasks',
        what: 'Comment on any task and tag a teammate with @. Tagged people get a notification.',
        use: [
          'Open a task and use the comment box at the bottom.',
          'Type @ then a name to tag someone.',
          'Anything tagged to you collects under Assigned comments.',
        ],
      },
      {
        name: 'Assigned comments',
        to: '/assigned-comments',
        cap: 'tasks',
        what: 'A queue of comments waiting on you — mentions, assignments, and comments on your tasks.',
        use: [
          'Switch between "To me" and "By me" to see what you owe versus what you delegated.',
          'Search to narrow the list.',
          'Mark resolved once handled; tick "include resolved" to see history.',
        ],
      },
      {
        name: 'Custom fields on tasks',
        to: '/settings',
        cap: 'manageTasks',
        what: 'Extra fields on every task — a room, a floor, a budget code. Types: text, number, select, person.',
        add: [
          'Open Settings → Custom fields.',
          'Name the field and choose its type.',
          'For a select, enter the options comma separated.',
          'Deactivate one later to hide it from forms without losing existing values.',
        ],
      },
    ],
  },

  {
    id: 'sales',
    title: 'Enquiries & BOQ',
    icon: FileSpreadsheet,
    blurb: 'From first enquiry to a priced bill of quantities.',
    features: [
      {
        name: 'New enquiries (leads)',
        to: '/leads',
        cap: 'leads',
        what: 'Incoming enquiries with client details, stage and follow-up owner.',
        use: ['Open New enquiries.', 'Move a lead through its stages as it progresses.', 'Convert a won lead into a real project in one click.'],
        add: ['Open New enquiries → New enquiry.', 'Enter the client name and contact.', 'Assign an owner so follow-up has a name against it.'],
      },
      {
        name: 'BOQ / Quotations',
        to: '/boq',
        cap: 'boq',
        what:
          'A priced bill of quantities per project: line items with quantity, rate, GST and discount, totalling to a grand total.',
        use: [
          'Open BOQ / Quotes.',
          'Pick a project to see its quotations.',
          'Open one to edit line items — totals recalculate as you type.',
        ],
        add: [
          'Open BOQ / Quotes → New quotation.',
          'Pick the project, then add items manually or start from a material template.',
          'Set GST percent and any discount; the grand total updates live.',
        ],
        caveat: 'This is the client-facing quotation you send out — not a quote received from a vendor.',
      },
      {
        name: 'Import a BOQ from Excel',
        to: '/boq',
        cap: 'boq',
        what: 'Bring an existing BOQ in from a spreadsheet rather than retyping it.',
        use: [
          'Open a quotation.',
          'Choose Import and pick your .xlsx file.',
          'Map the columns to description, unit, quantity and rate.',
          'Review the parsed rows before saving.',
        ],
        caveat: 'Excel only. PDF import is not supported.',
      },
      {
        name: 'Material catalog',
        to: '/boq',
        cap: 'boq',
        what:
          'A searchable master of materials with brand, grade, thickness and dimensions, plus starter templates for residential and commercial fit-outs.',
        use: [
          'Inside a quotation, open the material picker.',
          'Filter by brand or thickness, or search by name.',
          'Add an item to pull its specification into the BOQ line.',
        ],
      },
    ],
  },

  {
    id: 'procurement',
    title: 'Materials & vendors',
    icon: Truck,
    blurb: 'Vendors, purchase orders and delivery.',
    features: [
      {
        name: 'Vendor directory',
        to: '/procurement',
        cap: 'procurement',
        what: 'Your suppliers, with contact details, GST number, categories, payment terms and a rating.',
        use: ['Open Materials → Vendors.', 'Search by name or filter by category.', 'Open a vendor to see their orders.'],
        add: [
          'Open Materials → Vendors → New vendor.',
          'Enter the name; contact, phone, email and GSTIN are optional but worth filling.',
          'Add a phone number if you want to send purchase orders over WhatsApp.',
        ],
        caveat: 'Vendors carry a single overall rating, and no bank account details.',
      },
      {
        name: 'Purchase orders',
        to: '/procurement',
        cap: 'procurement',
        what: 'Orders raised against a project and vendor, with line items, quantities, rates and a total value.',
        use: [
          'Open Materials → Purchase orders.',
          'Open an order to see its lines and current status.',
          'Move it through draft → approved → ordered → in transit → delivered as it progresses.',
        ],
        add: [
          'Open Materials → Purchase orders → New purchase order.',
          'Pick the project and vendor.',
          'Add line items — the order value totals automatically.',
          'If approval routing is set up, the order is routed to an approver on save.',
        ],
      },
      {
        name: 'Send a PO to a vendor',
        cap: 'procurement',
        what: 'Sends the order to the vendor over WhatsApp.',
        use: [
          'Open a purchase order.',
          'Click Send — it opens WhatsApp with the order details pre-filled.',
          'The vendor needs a phone number on file for this to work.',
        ],
        caveat:
          'This opens a WhatsApp link. The app does not record that the order was sent, and there is no unsend or recall.',
      },
      {
        name: 'Delivery photos',
        cap: 'procurement',
        what: 'Photos attached to a purchase order as proof of what arrived.',
        use: ['Open a purchase order.', 'Attach photos on delivery.', 'Images are compressed automatically before upload.'],
      },
    ],
  },

  {
    id: 'money',
    title: 'Money',
    icon: Wallet,
    blurb: 'Budgets, expenses, vendor invoices and payment status.',
    features: [
      {
        name: 'Revenue & budgets',
        to: '/finance',
        cap: 'finance',
        what: 'Budget versus committed and actual spend per project, with a simple profit line.',
        use: ['Open Revenue.', 'Each row is a project: quoted, costs and profit.', 'Committed spend counts approved purchase orders.'],
      },
      {
        name: 'Expenses',
        to: '/finance',
        cap: 'finance',
        what: 'Site and project spends with a category, note and optional receipt.',
        use: ['Open Revenue → Expenses.', 'Approve or reject pending expenses.', 'Approved expenses count towards project costs.'],
        add: [
          'Open Revenue → New expense.',
          'Pick the project and enter the amount.',
          'Choose a category and attach the receipt photo.',
          'It is created pending, and routed to an approver if a rule exists.',
        ],
      },
      {
        name: 'Vendor invoices (Billing)',
        to: '/billing',
        cap: 'finance',
        what: 'Invoices received from vendors, optionally linked to the purchase order they bill against.',
        use: [
          'Open Billing.',
          'Invoices show as unpaid, paid or overdue — overdue is derived from the due date.',
          'Mark an invoice paid once settled.',
        ],
        add: [
          'Open Billing → Add invoice.',
          'Enter the invoice number, vendor and amount.',
          'Link the purchase order it bills against.',
          'Set the due date and attach the invoice PDF or photo.',
        ],
        caveat:
          'Invoice amounts are not checked against the purchase order or what was actually received. There is no payment proof, UTR field, or payment history view.',
      },
    ],
  },

  {
    id: 'inventory',
    title: 'Inventory',
    icon: Package,
    blurb: 'Stock on hand and where it moved.',
    features: [
      {
        name: 'Stock items',
        to: '/inventory',
        cap: 'inventory',
        what: 'Materials held in stock with quantity, unit, location, unit cost and a reorder level.',
        use: ['Open Inventory.', 'Items below their reorder level are flagged.', 'Open an item to see its movement history.'],
        add: [
          'Open Inventory → New item.',
          'Enter the name, unit and starting quantity.',
          'Set a reorder level so low stock is flagged automatically.',
          'Optionally record a location and unit cost.',
        ],
      },
      {
        name: 'Stock movements',
        to: '/inventory/movements',
        cap: 'inventory',
        what: 'Every in, out and adjustment, with the balance after each and who made it.',
        use: [
          'Open Inventory → Stock log.',
          'Record stock in when material arrives.',
          'Record stock out against a project when material is issued to site.',
          'Use an adjustment to correct a count after a physical check.',
        ],
      },
    ],
  },

  {
    id: 'site',
    title: 'Site',
    icon: Camera,
    blurb: 'What is happening on the ground.',
    features: [
      {
        name: 'Site updates',
        to: '/site-feed',
        cap: 'siteFeed',
        what: 'A photo feed from site, per project, with a note and author.',
        use: ['Open Site updates.', 'Filter by project.', 'Tap a photo to see it full size.'],
        add: [
          'Open Site updates → Post update.',
          'Pick the project and write a short note.',
          'Attach photos — they are compressed on your device before upload, so this works on a weak site connection.',
        ],
      },
      {
        name: 'Snags',
        to: '/site-feed',
        cap: 'siteFeed',
        what: 'Quality issues found on site, tracked open → fixed → verified.',
        use: ['Open Snags.', 'Assign a snag to whoever will fix it.', 'Move it to fixed, then verified once checked.'],
        add: ['Open Snags → Log snag.', 'Describe the issue and pick the project.', 'Assign an owner and attach a photo.'],
      },
      {
        name: 'Drawings and files',
        cap: 'files',
        what: 'Project drawings and documents, with version history and an approval status per file.',
        use: [
          'Open a project → Drawings.',
          'Upload a new version of an existing file rather than a duplicate — history is kept.',
          'Set a file to approved once signed off.',
        ],
      },
    ],
  },

  {
    id: 'approvals',
    title: 'Approvals',
    icon: ShieldCheck,
    blurb: 'Who signs off on what, and above which amount.',
    features: [
      {
        name: 'Approval routing',
        to: '/approvals',
        cap: 'companyAdmin',
        what:
          'Rules that decide who approves a record. Four types ship built in — purchase order, BOQ, expense and task — and you can add your own.',
        use: [
          'Open Approvals.',
          'Each card shows a type and the amount bands beneath it.',
          'A band reads as "₹0 – ₹49,999 → Rohan Kapoor", meaning anything in that range goes to that person.',
          'The most specific band wins, so you can layer an escalation on top of a catch-all.',
        ],
        add: [
          'Open Approvals and pick a type.',
          'Click Add routing.',
          'Set the amount band — leave "from" blank to start at zero, leave "up to" blank for no ceiling.',
          'Choose an approver role, or pin a specific person to override it.',
        ],
        caveat:
          'Until a type has at least one rule, nothing of that type needs approval. A band shown as "Never applies" is being shadowed by another rule.',
      },
      {
        name: 'Custom approval types',
        to: '/approvals',
        cap: 'companyAdmin',
        what: 'Your own approval categories for processes the app does not model — a site indent, a leave request, a change order.',
        add: [
          'Open Approvals → New type.',
          'Give it a name and a short description.',
          'Add routing to it like any built-in type.',
        ],
        caveat: 'Custom types carry no amount, so their routing applies to every one of them.',
      },
    ],
  },

  {
    id: 'people',
    title: 'People & access',
    icon: Users,
    blurb: 'Your team and what each person can reach.',
    features: [
      {
        name: 'People directory',
        to: '/admin',
        cap: 'people',
        what: 'Everyone in the workspace with their role and current access.',
        use: ['Open People.', 'Click someone to review their permissions.', 'Deactivate a leaver rather than deleting them, so their history survives.'],
      },
      {
        name: 'Invite a teammate',
        to: '/settings',
        cap: 'managePeople',
        what: 'Creates an account and issues a temporary password.',
        add: [
          'Open Settings → Invite teammate, or use the invite icon in the top bar.',
          'Enter their name, email and role.',
          'Send the workspace slug, email and temporary password that come back.',
          'They will be asked to set their own password on first sign-in.',
        ],
      },
      {
        name: 'Company dashboard',
        to: '/company-admin',
        cap: 'companyAdmin',
        what: 'A company-wide view: team activity, project health, spend and workload.',
        use: ['Open Company from the sidebar.', 'Change the range to compare periods.'],
      },
    ],
  },

  {
    id: 'reports',
    title: 'Reports & recognition',
    icon: BarChart3,
    blurb: 'Where the work went.',
    features: [
      {
        name: 'Reports',
        to: '/reports',
        cap: 'reports',
        what: 'Project-wise reporting across progress, spend and workload.',
        use: ['Open Reports.', 'Pick the range you care about.', 'Read project by project.'],
      },
      {
        name: 'Impact points',
        to: '/impact',
        cap: 'impact',
        what: 'Points and badges earned for completing work on time.',
        use: ['Open Impact Points.', 'Your score and badges are shown against the team.'],
      },
    ],
  },

  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    blurb: 'Your profile and workspace preferences.',
    features: [
      {
        name: 'Profile photo',
        to: '/settings',
        cap: null,
        what: 'The picture shown against your name across projects, comments and the top bar.',
        add: [
          'Open Settings → Profile.',
          'Click your avatar, or "Add a photo".',
          'Pick an image — it saves straight away, and is compressed automatically.',
          'Use Remove to go back to your initials.',
        ],
      },
      {
        name: 'Name, title and password',
        to: '/settings',
        cap: null,
        what: 'How you appear to the rest of the team, and your sign-in password.',
        use: ['Open Settings.', 'Edit your name and title, then Save changes.', 'Change your password in the Password section.'],
      },
      {
        name: 'Appearance',
        to: '/settings',
        cap: null,
        what: 'Light or dark, remembered on this device.',
        use: ['Open Settings → Appearance.', 'Pick light or dark. It applies immediately.'],
      },
    ],
  },

  {
    id: 'mobile',
    title: 'Mobile app',
    icon: Smartphone,
    blurb: 'What the phone app covers.',
    features: [
      {
        name: 'What is on mobile',
        cap: null,
        what:
          'Nearly everything: home, projects and all seven project tabs, tasks, inbox, notifications, site feed, snags, ' +
          'enquiries, BOQ, vendors, purchase orders, revenue, billing, inventory, reports, approvals, people and your profile.',
        use: [
          'Sign in with the same workspace, email and password you use here.',
          'Bottom tabs are Home, Projects, Inbox and More.',
          'More holds everything else, grouped by area.',
        ],
        caveat: 'Platform superadmin screens and self-serve signup are web only.',
      },
      {
        name: 'Working offline-ish on site',
        cap: null,
        what: 'Photos are compressed on the device before upload, so posting from site does not depend on a strong signal.',
        use: ['Post a site update or snag as normal.', 'A large camera photo is reduced before it is sent.'],
      },
    ],
  },

  {
    id: 'platform',
    title: 'Platform admin',
    icon: Building2,
    blurb: 'Superadmin, across all workspaces.',
    features: [
      {
        name: 'Workspaces and subscriptions',
        to: '/platform',
        cap: 'platform',
        what: 'Manage every company on the platform: companies, subscriptions, users, features and settings.',
        use: ['Sign in at the platform login.', 'Open Platform from the sidebar.'],
        caveat: 'Platform admin only. Web only — this is not on mobile.',
      },
    ],
  },
]

export function DocsPage() {
  const user = useAuthStore((s) => s.user)
  const caps = useMemo(() => capabilitiesForUser(user), [user])
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const sections = useMemo(() => {
    if (!q) return SECTIONS
    return SECTIONS.map((section) => ({
      ...section,
      features: section.features.filter((f) =>
        [f.name, f.what, f.caveat, ...(f.use || []), ...(f.add || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      ),
    })).filter((section) => section.features.length > 0)
  }, [q])

  const total = SECTIONS.reduce((n, s) => n + s.features.length, 0)
  const shown = sections.reduce((n, s) => n + s.features.length, 0)

  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <header className="pb-5">
        <h1 className="text-[24px] font-semibold tracking-tight text-primary">
          Handbook
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-secondary">
          Every feature in Cubic — what it does, how to use it, and how to add
          things. Written against what the app does today; where something is
          thinner than its name suggests, it says so.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the handbook"
              className="pl-9"
            />
          </div>
          <p className="text-[12px] text-secondary">
            {q ? `${shown} of ${total} matching` : `${total} features`}
          </p>
        </div>
      </header>

      {!q && (
        <nav className="mb-6 flex flex-wrap gap-1.5 border-y border-border py-3">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full bg-surface-raised px-3 py-1.5 text-[12px] font-medium text-secondary transition hover:text-primary"
            >
              {s.title}
            </a>
          ))}
        </nav>
      )}

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-surface-raised">
                <section.icon className="h-4 w-4 text-secondary" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-primary">
                  {section.title}
                </h2>
                <p className="text-[12px] text-secondary">{section.blurb}</p>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {section.features.map((feature) => (
                <FeatureCard key={feature.name} feature={feature} caps={caps} />
              ))}
            </div>
          </section>
        ))}

        {sections.length === 0 && (
          <p className="py-10 text-center text-[13px] text-secondary">
            Nothing matches &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  )
}

function FeatureCard({ feature, caps }) {
  // `cap: null` means everyone gets it; otherwise dim what this reader can't open.
  const locked = feature.cap ? !caps[feature.cap] : false

  return (
    <article className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-primary">{feature.name}</h3>
        {feature.to && !locked && (
          <Link
            to={feature.to}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
          >
            Open
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
        {locked && (
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            No access
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
        {feature.what}
      </p>

      {feature.use?.length > 0 && <Steps title="How to use it" steps={feature.use} />}
      {feature.add?.length > 0 && <Steps title="How to add one" steps={feature.add} />}

      {feature.caveat && (
        <p className="mt-3 rounded-[8px] bg-surface-raised px-3 py-2 text-[12px] leading-relaxed text-secondary">
          <span className="font-semibold text-primary">Worth knowing — </span>
          {feature.caveat}
        </p>
      )}
    </article>
  )
}

function Steps({ title, steps }) {
  return (
    <div className={cn('mt-3')}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <ol className="mt-1.5 space-y-1">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2.5 text-[13px] leading-relaxed text-secondary">
            <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-surface-raised text-[10px] font-semibold text-secondary">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
