import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  Plus,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { formatInr, stageLabel } from '../lib/format'
import { cn } from '../lib/utils'
import {
  Avatar,
  Button,
  Drawer,
  EmptyState,
  Input,
  Modal,
  StatusChip,
  toast,
} from '../components/ui'

const PIPELINE = [
  'new_enquiry',
  'site_visit',
  'quotation_sent',
  'negotiation',
  'won',
  'lost',
]

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'mine', label: 'Assigned to me' },
]

function ownerIdOf(lead) {
  if (!lead?.owner) return ''
  return String(lead.owner._id || lead.owner)
}

export function LeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api('/leads'),
  })
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
  })
  const user = useAuthStore((s) => s.user)

  const [selected, setSelected] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const users = usersData?.users || []
  const meId = String(user?.id || user?._id || '')

  const patch = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      if (res?.lead) {
        setSelected((prev) =>
          prev && String(prev._id) === String(res.lead._id) ? res.lead : prev,
        )
      }
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const create = useMutation({
    mutationFn: (body) =>
      api('/leads', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setCreateOpen(false)
      toast('Enquiry added — follow-up task created', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const convert = useMutation({
    mutationFn: (id) => api(`/leads/${id}/convert`, { method: 'POST' }),
    onSuccess: (res) => {
      toast('Converted to project', { type: 'success' })
      navigate(`/projects/${res.project._id}`)
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const leads = data?.leads || []

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return leads.filter((lead) => {
      const oid = ownerIdOf(lead)
      if (filter === 'unassigned' && oid) return false
      if (filter === 'mine' && oid !== meId) return false
      if (!needle) return true
      const hay = [
        lead.clientName,
        lead.contactName,
        lead.source,
        lead.notes,
        lead.owner?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [leads, filter, search, meId])

  const unassignedCount = leads.filter((l) => !ownerIdOf(l)).length

  function assignLead(lead, owner) {
    const next = owner || null
    const prev = ownerIdOf(lead) || null
    if (String(next || '') === String(prev || '')) return
    patch.mutate(
      { id: lead._id, body: { owner: next } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['tasks'] })
          toast(next ? 'Assigned — task added for them' : 'Assignee cleared', {
            type: 'success',
          })
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            CRM pipeline
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-primary">
            New enquiries
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-secondary">
            Capture incoming work and assign an employee right from the card —
            no extra clicks.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New enquiry
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total enquiries" value={leads.length} />
        <Stat
          label="Need assignment"
          value={unassignedCount}
          tone={unassignedCount ? 'amber' : 'default'}
        />
        <Stat
          label="In new enquiry"
          value={leads.filter((l) => l.stage === 'new_enquiry').length}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-surface-raised p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                filter === f.key
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-secondary hover:text-primary',
              )}
            >
              {f.label}
              {f.key === 'unassigned' && unassignedCount > 0 ? (
                <span className="ml-1.5 rounded-md bg-[var(--nav-active-bg)] px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  {unassignedCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, contact, assignee…"
            className="h-9 w-64 rounded-xl border border-border bg-surface pl-8 pr-3 text-[12px] outline-none focus:border-accent/40"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={leads.length === 0 ? 'No enquiries yet' : 'Nothing matches'}
          description={
            leads.length === 0
              ? 'Add a new enquiry and assign someone to follow up.'
              : 'Try another filter or search.'
          }
          actionLabel={leads.length === 0 ? 'New enquiry' : undefined}
          onAction={leads.length === 0 ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE.map((stage) => {
            const column = filtered.filter((l) => l.stage === stage)
            return (
              <div
                key={stage}
                className="w-[280px] shrink-0 overflow-hidden rounded-2xl border border-transparent bg-surface"
              >
                <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
                  <p className="text-[12px] font-semibold text-primary">
                    {stageLabel(stage)}
                  </p>
                  <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-secondary">
                    {column.length}
                  </span>
                </div>
                <div className="min-h-[340px] space-y-2 p-2.5">
                  {column.map((lead) => (
                    <EnquiryCard
                      key={lead._id}
                      lead={lead}
                      users={users}
                      usersLoading={usersLoading}
                      assigning={patch.isPending}
                      onOpen={() => setSelected(lead)}
                      onAssign={(owner) => assignLead(lead, owner)}
                      onStage={(nextStage) =>
                        patch.mutate({
                          id: lead._id,
                          body: { stage: nextStage },
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.clientName || 'Enquiry'}
      >
        {selected && (
          <div className="space-y-5">
            <AssignPanel
              lead={selected}
              users={users}
              usersLoading={usersLoading}
              onAssign={(owner) => assignLead(selected, owner)}
            />

            <p className="text-sm text-secondary">
              {selected.notes || 'No notes yet.'}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Contact" value={selected.contactName || '—'} />
              <Meta label="Source" value={selected.source || '—'} />
              <Meta
                label="Value"
                value={formatInr(selected.estimatedValue)}
                accent
              />
              <div>
                <p className="text-xs text-secondary">Stage</p>
                <div className="mt-1">
                  <StatusChip
                    status={selected.stage}
                    label={stageLabel(selected.stage)}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Move to stage
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE.filter((s) => s !== selected.stage).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      s === 'won'
                        ? 'rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100'
                        : s === 'lost'
                          ? 'rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100'
                          : 'rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:border-accent/40'
                    }
                    onClick={() =>
                      patch.mutate(
                        { id: selected._id, body: { stage: s } },
                        {
                          onSuccess: (res) =>
                            setSelected(res?.lead || { ...selected, stage: s }),
                        },
                      )
                    }
                  >
                    {stageLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {selected.stage !== 'lost' && (
              <Button
                className="w-full"
                loading={convert.isPending}
                onClick={() => convert.mutate(selected._id)}
              >
                {selected.stage === 'won'
                  ? 'Convert won lead to project'
                  : 'Convert to project'}
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New enquiry"
      >
        <LeadForm
          users={users}
          usersLoading={usersLoading}
          defaultOwner={meId}
          onSubmit={(v) => create.mutate(v)}
          loading={create.isPending}
        />
      </Modal>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }) {
  return (
    <div className="rounded-2xl border border-transparent bg-surface px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-[26px] font-semibold tracking-[-0.03em] tabular-nums',
          tone === 'amber' ? 'text-amber-600' : 'text-primary',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Meta({ label, value, accent }) {
  return (
    <div>
      <p className="text-xs text-secondary">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-medium',
          accent ? 'tabular-nums text-blue-600' : 'text-primary',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function EnquiryCard({
  lead,
  users,
  usersLoading,
  assigning,
  onOpen,
  onAssign,
  onStage,
}) {
  const stage = lead.stage
  const idx = PIPELINE.indexOf(stage)
  const next =
    idx >= 0 && idx < PIPELINE.length - 2 ? PIPELINE[idx + 1] : null
  const needsOwner = !ownerIdOf(lead)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'w-full rounded-xl border bg-surface-raised p-3 text-left transition hover:border-accent/30',
        needsOwner
          ? 'border-amber-200/70 ring-1 ring-amber-500/15'
          : 'border-transparent',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-primary">
            {lead.clientName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-secondary">
            {lead.contactName || lead.source || '—'}
          </p>
        </div>
        <p className="shrink-0 text-[12px] font-semibold tabular-nums text-accent">
          {formatInr(lead.estimatedValue)}
        </p>
      </div>

      <div
        className="mt-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <AssigneePicker
          value={ownerIdOf(lead)}
          users={users}
          loading={usersLoading || assigning}
          onChange={onAssign}
          compact
          highlightEmpty={needsOwner}
        />
      </div>

      <div
        className="mt-2.5 flex flex-wrap gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {next && next !== 'lost' && (
          <button
            type="button"
            className="rounded-md bg-[#ecfdf5] px-1.5 py-0.5 text-[10px] font-semibold text-[#3ecf8e] hover:bg-[#d1fae5]"
            onClick={() => onStage(next)}
          >
            → {stageLabel(next).split(' ')[0]}
          </button>
        )}
        {stage !== 'won' && stage !== 'lost' && (
          <>
            <button
              type="button"
              className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
              onClick={() => onStage('won')}
            >
              Won
            </button>
            <button
              type="button"
              className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100"
              onClick={() => onStage('lost')}
            >
              Lost
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AssignPanel({ lead, users, usersLoading, onAssign }) {
  return (
    <div className="rounded-2xl border border-transparent bg-[var(--nav-active-bg)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface shadow-sm ring-1 ring-[#d1fae5]">
          <UserPlus className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-primary">
            Assign employee
          </p>
          <p className="text-[11px] text-secondary">
            They get notified and own the follow-up.
          </p>
        </div>
      </div>
      <AssigneePicker
        value={ownerIdOf(lead)}
        users={users}
        loading={usersLoading}
        onChange={onAssign}
      />
    </div>
  )
}

function AssigneePicker({
  value,
  users,
  loading,
  onChange,
  compact = false,
  highlightEmpty = false,
}) {
  const [open, setOpen] = useState(false)
  const selected = users.find(
    (u) => String(u._id || u.id) === String(value || ''),
  )

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!e.target.closest?.('[data-assignee-picker]')) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" data-assignee-picker>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border px-2.5 text-left transition',
          compact ? 'h-9' : 'h-11',
          highlightEmpty && !selected
            ? 'border-amber-300 bg-amber-50/80 hover:border-amber-400'
            : 'border-border bg-surface hover:border-accent/40',
        )}
      >
        {selected ? (
          <>
            <Avatar src={selected.avatar} name={selected.name} size="xs" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-primary">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                highlightEmpty ? 'bg-[var(--nav-active-bg)]' : 'bg-surface-raised',
              )}
            >
              <Users
                className={cn(
                  'h-3.5 w-3.5',
                  highlightEmpty ? 'text-amber-700' : 'text-secondary',
                )}
              />
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-[12px] font-semibold',
                highlightEmpty ? 'text-amber-800' : 'text-secondary',
              )}
            >
              Assign employee…
            </span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-secondary" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-secondary hover:bg-surface-raised"
          >
            Unassigned
          </button>
          {loading && (
            <p className="px-3 py-2 text-[11px] text-secondary">Loading…</p>
          )}
          {!loading && users.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-secondary">
              No employees found
            </p>
          )}
          {users.map((u) => {
            const id = String(u._id || u.id)
            const active = id === String(value || '')
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-raised',
                  active && 'bg-[#ecfdf5]',
                )}
              >
                <Avatar src={u.avatar} name={u.name} size="xs" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-primary">
                  {u.name}
                </span>
                {u.role ? (
                  <span className="shrink-0 text-[10px] uppercase text-secondary">
                    {String(u.role).replace(/_/g, ' ')}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LeadForm({ users, usersLoading, defaultOwner, onSubmit, loading }) {
  const [form, setForm] = useState({
    clientName: '',
    contactName: '',
    email: '',
    phone: '',
    source: 'Website',
    estimatedValue: '',
    notes: '',
    owner: defaultOwner || '',
  })

  useEffect(() => {
    if (defaultOwner && !form.owner) {
      setForm((prev) => ({ ...prev, owner: defaultOwner }))
    }
  }, [defaultOwner, form.owner])

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...form,
          estimatedValue: Number(form.estimatedValue) || 0,
          stage: 'new_enquiry',
          owner: form.owner || undefined,
        })
      }}
    >
      <Input
        label="Client / company"
        value={form.clientName}
        onChange={(e) => setForm({ ...form, clientName: e.target.value })}
        required
      />
      <Input
        label="Contact"
        value={form.contactName}
        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
      />
      <Input
        label="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <Input
        label="Est. value"
        type="number"
        value={form.estimatedValue}
        onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
      />
      <Input
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-secondary">
          Assign to employee
        </p>
        <AssigneePicker
          value={form.owner}
          users={users}
          loading={usersLoading}
          onChange={(owner) => setForm({ ...form, owner: owner || '' })}
        />
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Create enquiry
      </Button>
    </form>
  )
}
