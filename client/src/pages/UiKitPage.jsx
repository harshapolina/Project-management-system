import { useState } from 'react'
import {
  Button,
  Input,
  Select,
  DatePicker,
  StatusChip,
  ProgressBar,
  ProgressRing,
  Avatar,
  AvatarStack,
  Card,
  KpiCard,
  DataTable,
  Tabs,
  Modal,
  Drawer,
  EmptyState,
  FileThumbnail,
  CommentThread,
  SearchBarWithFilters,
  Skeleton,
  SkeletonCard,
  toast,
} from '../components/ui'
import { Inbox } from 'lucide-react'

const people = [
  { name: 'Aanya Mehta', avatar: 'https://i.pravatar.cc/150?u=aanya' },
  { name: 'Rohan Kapoor', avatar: 'https://i.pravatar.cc/150?u=rohan' },
  { name: 'Maya Sen', avatar: 'https://i.pravatar.cc/150?u=maya' },
  { name: 'Vikram Rao', avatar: 'https://i.pravatar.cc/150?u=vikram' },
]

export function UiKitPage() {
  const [tab, setTab] = useState('invoices')
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-8 pb-16">
      <div>
        <p className="text-sm text-secondary mb-1">Design system</p>
        <h1 className="text-[32px] font-semibold tracking-tight">UI Kit</h1>
        <p className="mt-2 text-sm text-secondary max-w-xl">
          Shared components matching the Cubic visual language — dark canvas,
          neon accent, light invoice-style panels.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">KPI strip</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Overdue"
            value="$6,260.00"
            trend="12%"
            trendUp={false}
            chart={<MiniBars accent />}
            avatars={people}
          />
          <KpiCard
            label="Due within next month"
            value="$172,560.00"
            trend="8%"
            trendUp
            chart={<MiniBars />}
            avatars={people.slice(0, 3)}
          />
          <KpiCard
            label="Average paid time"
            value="4 days"
            chart={<ProgressBar value={72} className="mt-2" />}
          />
          <KpiCard
            label="Instant Payout"
            value="$5,653.00"
            accentValue
            action={
              <Button className="w-full" size="md">
                Pay out now
              </Button>
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Buttons & inputs</h2>
        <Card className="flex flex-wrap gap-3 items-center">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="light">Light</Button>
          <Button
            onClick={() => toast('Saved successfully', { type: 'success' })}
          >
            Toast
          </Button>
          <Button onClick={() => setModalOpen(true)}>Modal</Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Drawer
          </Button>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Project name" placeholder="Sharma Penthouse" />
          <Select
            label="Status"
            options={[
              { value: 'in_progress', label: 'In progress' },
              { value: 'delayed', label: 'Delayed' },
            ]}
            defaultValue="in_progress"
          />
          <DatePicker label="Due date" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Status & progress</h2>
        <Card className="flex flex-wrap gap-2 items-center">
          <StatusChip status="not_started" />
          <StatusChip status="in_progress" />
          <StatusChip status="on_hold" />
          <StatusChip status="completed" />
          <StatusChip status="delayed" />
          <StatusChip status="unpaid" label="Unpaid" />
          <StatusChip status="unsent" label="Unsent" />
          <ProgressRing value={68} className="ml-4" />
          <div className="w-48">
            <ProgressBar value={68} showLabel />
          </div>
          <AvatarStack users={people} />
          <Avatar name="Aanya Mehta" online />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Light data panel</h2>
        <Card variant="light" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'invoices', label: 'Invoices' },
                { value: 'estimates', label: 'Estimates' },
                { value: 'clients', label: 'Clients' },
              ]}
            />
            <Button variant="light" size="sm">
              Create an invoice
            </Button>
          </div>
          <SearchBarWithFilters
            light
            value={search}
            onChange={setSearch}
            placeholder="Search invoices…"
            filters={[
              {
                key: 'status',
                label: 'All statuses',
                options: [
                  { value: 'unpaid', label: 'Unpaid' },
                  { value: 'paid', label: 'Paid' },
                ],
              },
            ]}
            filterValues={{}}
            onFilterChange={() => {}}
          />
          <DataTable
            light
            columns={[
              {
                key: 'client',
                label: 'Client',
                render: (_, row) => (
                  <div className="flex items-center gap-2">
                    <Avatar name={row.client} size="sm" />
                    <span>{row.client}</span>
                  </div>
                ),
              },
              { key: 'id', label: 'ID' },
              {
                key: 'status',
                label: 'Status',
                render: (v) => <StatusChip status={v} />,
              },
              {
                key: 'amount',
                label: 'Amount',
                numeric: true,
                align: 'right',
              },
            ]}
            data={[
              {
                id: '#1042',
                client: 'BlueRock',
                status: 'unpaid',
                amount: '$12,400.00',
              },
              {
                id: '#1041',
                client: 'Orchid Realty',
                status: 'unsent',
                amount: '$8,200.00',
              },
              {
                id: '#1040',
                client: 'Harbor Group',
                status: 'viewed',
                amount: '$3,150.00',
              },
            ]}
          />
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FileThumbnail
          name="Living room concept.png"
          mime="image/png"
          url="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80"
          version="v2"
          status="sent"
        />
        <Card>
          <CommentThread
            currentUser={people[0]}
            comments={[
              {
                id: 1,
                author: people[1],
                body: 'Can we push the skirting profile to next week?',
                createdAt: new Date(Date.now() - 3600000),
              },
            ]}
            onSubmit={() => toast('Comment posted', { type: 'success' })}
          />
        </Card>
        <div className="space-y-3">
          <SkeletonCard />
          <Skeleton className="h-10 w-full" />
          <EmptyState icon={Inbox} title="No files yet" description="Drop drawings here to start the trail." />
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New project">
        <p className="text-sm text-secondary mb-4">
          Pick a template to auto-create the five project stages.
        </p>
        <Button className="w-full" onClick={() => setModalOpen(false)}>
          Continue
        </Button>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Task detail">
        <p className="text-sm text-secondary">
          Assignees, dates, checklist, attachments, and comments live here.
        </p>
      </Drawer>
    </div>
  )
}

function MiniBars({ accent }) {
  const heights = [40, 65, 35, 80, 55, 70, 45]
  return (
    <div className="flex h-10 items-end gap-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-sm"
          style={{
            height: `${h}%`,
            backgroundColor: accent
              ? 'var(--accent)'
              : i === heights.length - 1
                ? 'var(--accent)'
                : 'var(--border-subtle)',
          }}
        />
      ))}
    </div>
  )
}
