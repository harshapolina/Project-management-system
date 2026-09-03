/** Ported subset of client/src/pages/DocsPage.jsx SECTIONS for mobile handbook. */

export const HANDBOOK_SECTIONS = [
  {
    id: 'start',
    title: 'Getting started',
    features: [
      {
        name: 'My work',
        cap: 'myWork',
        what: 'Every task assigned to you across all projects.',
        use: ['Open Home and switch Assigned / Today / Personal views.', 'Tap a task to update status or comment.'],
      },
      {
        name: 'Global search',
        cap: null,
        what: 'Jump to projects, tasks, people, leads and vendors.',
        use: ['Tap the search icon in the top bar.', 'Pick a result to navigate.'],
      },
      {
        name: 'Roles and permissions',
        cap: 'people',
        what: 'Each person has a role and optional permission overrides.',
        use: ['Open People from More or Profile.', 'Tap a person to adjust module access.'],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    features: [
      {
        name: 'Project workspace',
        cap: 'projects',
        what: 'Tasks, files, notes, site feed, team and procurement per project.',
        use: ['Open Projects tab.', 'Tap a project card.', 'Use shortcut chips on Overview.'],
      },
      {
        name: 'Stages',
        cap: 'manageProjects',
        what: 'Projects move through design → procurement → site → handover.',
        use: ['On project Overview, tap Mark done to advance stage.'],
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & BOQ',
    features: [
      {
        name: 'New enquiries',
        cap: 'leads',
        what: 'CRM pipeline from enquiry to won/lost.',
        use: ['More → New enquiries.', 'Advance stages and convert to project when won.'],
      },
      {
        name: 'BOQ / Quotes',
        cap: 'boq',
        what: 'Bill of quantities with material catalog and measurement sheets.',
        use: ['More → BOQ/Quotes.', 'Add lines from catalog or Excel import on web; mobile supports line edit and status workflow.'],
      },
    ],
  },
  {
    id: 'ops',
    title: 'Operations',
    features: [
      {
        name: 'Materials & RFQs',
        cap: 'procurement',
        what: 'Raise RFQs from approved BOQ lines, compare quotes, award POs.',
        use: ['More → Materials hub.', 'RFQs tab lists requests; project Materials tab raises new RFQs.'],
      },
      {
        name: 'Site updates & snags',
        cap: 'siteFeed',
        what: 'Photo/text feed from site plus issue tracking.',
        use: ['Post updates from Home quick actions or Site mode.', 'Log snags and mark fixed → verified.'],
        caveat: 'Photo upload requires camera permission on mobile.',
      },
      {
        name: 'Revenue & billing',
        cap: 'finance',
        what: 'Expenses, commitments and vendor invoices.',
        use: ['More → Revenue for expenses.', 'More → Billing for vendor invoices.'],
      },
    ],
  },
  {
    id: 'company',
    title: 'Company admin',
    features: [
      {
        name: 'Company dashboard',
        cap: 'companyAdmin',
        what: 'KPIs across projects, leads, budget and activity.',
        use: ['More → Company dashboard.'],
      },
      {
        name: 'Approvals routing',
        cap: 'companyAdmin',
        what: 'Configure who approves POs and expenses by amount band.',
        use: ['More → Approvals.'],
      },
      {
        name: 'Impact points',
        cap: 'impact',
        what: 'Gamified recognition for delivery milestones.',
        use: ['More → Impact.'],
      },
    ],
  },
]
