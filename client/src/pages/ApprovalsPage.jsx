import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileSpreadsheet,
  ListChecks,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatInr } from '../lib/format'
import { Avatar, Button, Input, Select, SkeletonCard, toast } from '../components/ui'
import { cn } from '../lib/utils'

const TYPE_ICONS = {
  purchase_order: Truck,
  boq: FileSpreadsheet,
  expense: Wallet,
  task: ListChecks,
}

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  hr: 'HR',
  project_manager: 'Project manager',
  designer: 'Designer',
  site_supervisor: 'Site supervisor',
  vendor: 'Vendor',
  client: 'Client',
}

const roleLabel = (role) => ROLE_LABELS[role] || role

/**
 * The server hands back the effective bands (see lib/approvals.js
 * `computeBands`) rather than the raw overlapping rules, so there is no
 * routing logic to duplicate here — only how to word a band.
 */
function bandLabel(band, hasAmount) {
  if (band.shadowed) return 'Never applies'
  if (!hasAmount) return 'Every one'
  if (band.max == null) {
    return band.min === 0 ? 'Any amount' : `${formatInr(band.min)} and above`
  }
  return `${formatInr(band.min)} – ${formatInr(band.max - 1)}`
}

export function ApprovalsPage() {
  const qc = useQueryClient()
  const [openType, setOpenType] = useState(null)
  const [newType, setNewType] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', 'flow'],
    queryFn: () => api('/approvals/flow'),
  })

  const flow = data?.flow || []
  const members = data?.members || []
  const roles = data?.roles || []

  const invalidate = () => qc.invalidateQueries({ queryKey: ['approvals'] })
  const onError = (e) => toast(e.message, { type: 'error' })

  const addRule = useMutation({
    mutationFn: (body) =>
      api('/approvals/rules', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate()
      setOpenType(null)
      toast('Routing added', { type: 'success' })
    },
    onError,
  })

  const removeRule = useMutation({
    mutationFn: (id) => api(`/approvals/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      toast('Routing removed', { type: 'success' })
    },
    onError,
  })

  const addType = useMutation({
    mutationFn: (body) =>
      api('/approvals/types', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate()
      setNewType(null)
      toast('Approval type added', { type: 'success' })
    },
    onError,
  })

  const removeType = useMutation({
    mutationFn: (id) => api(`/approvals/types/${id}`, { method: 'DELETE' }),
    onSuccess: (res) => {
      invalidate()
      toast(
        res?.removedRules
          ? `Type removed with ${res.removedRules} routing rule${res.removedRules === 1 ? '' : 's'}`
          : 'Type removed',
        { type: 'success' },
      )
    },
    onError,
  })

  // Keyed off `data` rather than `flow`, which is a fresh array every render.
  const routedCount = useMemo(
    () => (data?.flow || []).reduce((n, t) => n + (t.rules?.length || 0), 0),
    [data],
  )

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-primary">
            Approvals
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-secondary">
            Who signs off on what, and above which amount. When someone raises one
            of these it routes automatically to the approver whose band the amount
            falls into — the most specific matching band wins, so you can layer an
            escalation on top of a catch-all.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setNewType({ label: '', description: '' })}
        >
          <Plus className="h-3.5 w-3.5" />
          New type
        </Button>
      </header>

      {!isLoading && routedCount === 0 && (
        <div className="flex items-start gap-3 rounded-[10px] border border-border bg-surface-raised px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <p className="text-[13px] leading-relaxed text-secondary">
            No routing set up yet — nothing currently needs approval. Add a rule
            to a type below and new records will start routing to that approver.
          </p>
        </div>
      )}

      {newType && (
        <NewTypeForm
          draft={newType}
          setDraft={setNewType}
          onCancel={() => setNewType(null)}
          onSubmit={() => addType.mutate(newType)}
          pending={addType.isPending}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        flow.map((type) => (
          <TypeCard
            key={type.key}
            type={type}
            roles={roles}
            members={members}
            isOpen={openType === type.key}
            onToggle={() => setOpenType(openType === type.key ? null : type.key)}
            onAddRule={(body) => addRule.mutate({ ...body, entityType: type.key })}
            addPending={addRule.isPending}
            onRemoveRule={(id) => removeRule.mutate(id)}
            onRemoveType={() => {
              if (
                window.confirm(
                  `Remove “${type.label}” and any routing on it? Records already routed keep their approver.`,
                )
              ) {
                removeType.mutate(type._id)
              }
            }}
          />
        ))
      )}
    </div>
  )
}

function NewTypeForm({ draft, setDraft, onCancel, onSubmit, pending }) {
  return (
    <div className="rounded-[12px] border border-accent/30 bg-surface p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold text-primary">New approval type</h2>
      <p className="mt-0.5 text-[12px] text-secondary">
        For a process the app doesn&rsquo;t model yet — a site indent, a leave
        request, a change order.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          label="Name"
          value={draft.label}
          placeholder="e.g. Site material indent"
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
        <Input
          label="Description"
          value={draft.description}
          placeholder="What it covers"
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={onSubmit} loading={pending} disabled={!draft.label.trim()}>
          Add type
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function TypeCard({
  type,
  roles,
  members,
  isOpen,
  onToggle,
  onAddRule,
  addPending,
  onRemoveRule,
  onRemoveType,
}) {
  const Icon = TYPE_ICONS[type.key] || Building2
  const hasAmount = !!type.amountPath
  const bands = type.bands || []

  return (
    <section className="rounded-[12px] border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-surface-raised">
            <Icon className="h-4 w-4 text-secondary" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-primary">{type.label}</h2>
              {!type.isBuiltin && (
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                  Custom
                </span>
              )}
            </div>
            {type.description && (
              <p className="mt-0.5 text-[12px] text-secondary">{type.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={onToggle}>
            <Plus className="h-3.5 w-3.5" />
            Add routing
          </Button>
          {!type.isBuiltin && (
            <button
              type="button"
              onClick={onRemoveType}
              aria-label={`Remove ${type.label}`}
              className="grid h-8 w-8 place-items-center rounded-[6px] text-muted transition hover:bg-status-delayed/10 hover:text-status-delayed"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-3.5 sm:px-5">
        {bands.length === 0 ? (
          <p className="py-2 text-[13px] text-secondary">
            No routing — these don&rsquo;t need approval.
          </p>
        ) : (
          <ol className="space-y-2">
            {bands.map((band, i) => (
              <RuleRow
                key={`${band.ruleId}-${i}`}
                band={band}
                hasAmount={hasAmount}
                onRemove={() => onRemoveRule(band.ruleId)}
              />
            ))}
          </ol>
        )}

        {isOpen && (
          <RuleForm
            hasAmount={hasAmount}
            roles={roles}
            members={members}
            pending={addPending}
            onCancel={onToggle}
            onSubmit={onAddRule}
          />
        )}
      </div>
    </section>
  )
}

function RuleRow({ band, hasAmount, onRemove }) {
  const { rule, shadowed } = band
  const approver = rule?.resolvedApprover
  const pinned = !!rule?.approverUser

  return (
    <li
      className={cn(
        'group flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] px-3 py-2.5',
        shadowed ? 'bg-status-delayed/5 ring-1 ring-inset ring-status-delayed/20' : 'bg-surface-raised',
      )}
    >
      <span
        className={cn(
          'min-w-[9rem] text-[12px] font-semibold tabular-nums',
          shadowed ? 'text-status-delayed' : 'text-primary',
        )}
        title={shadowed ? 'A later band starts at or below this one, so nothing reaches it' : undefined}
      >
        {bandLabel(band, hasAmount)}
      </span>

      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />

      {approver ? (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={approver.name} src={approver.avatar} size="xs" />
          <span className="truncate text-[13px] font-medium text-primary">
            {approver.name}
          </span>
        </span>
      ) : (
        /* A role with nobody in it silently swallows approvals, so call it out. */
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-status-delayed">
          <UserRound className="h-3.5 w-3.5" />
          Nobody in this role
        </span>
      )}

      <span className="flex items-center gap-1.5 text-[11px] text-secondary">
        {pinned ? (
          <>
            <BadgeCheck className="h-3 w-3" />
            Pinned
          </>
        ) : (
          roleLabel(rule?.approverRole)
        )}
      </span>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove this routing"
        className={cn(
          'ml-auto grid h-7 w-7 place-items-center rounded-[6px] text-muted transition',
          'hover:bg-status-delayed/10 hover:text-status-delayed',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

function RuleForm({ hasAmount, roles, members, pending, onCancel, onSubmit }) {
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [approverRole, setApproverRole] = useState('owner')
  const [approverUser, setApproverUser] = useState('')

  // Pinning a person is an override, so the role select follows them — the
  // rule still records a role for when the pin is later cleared.
  const pinnedMember = members.find((m) => m._id === approverUser)
  const effectiveRole = pinnedMember?.role || approverRole

  const submit = () => {
    onSubmit({
      minAmount: hasAmount && minAmount !== '' ? Number(minAmount) : 0,
      maxAmount: hasAmount && maxAmount !== '' ? Number(maxAmount) : null,
      approverRole: effectiveRole,
      approverUser: approverUser || null,
    })
  }

  return (
    <div className="mt-3 rounded-[10px] border border-border bg-surface p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        {hasAmount && (
          <>
            <Input
              label="From amount"
              type="number"
              min="0"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              hint="Leave blank to start at zero"
            />
            <Input
              label="Up to (optional)"
              type="number"
              min="0"
              placeholder="No upper limit"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              hint="Blank means this band has no ceiling"
            />
          </>
        )}
        <Select
          label="Approver role"
          value={effectiveRole}
          disabled={!!pinnedMember}
          onChange={(e) => setApproverRole(e.target.value)}
          options={roles.map((r) => ({ value: r, label: roleLabel(r) }))}
        />
        <Select
          label="Pin to a person (optional)"
          value={approverUser}
          onChange={(e) => setApproverUser(e.target.value)}
          options={[
            { value: '', label: `Anyone with the ${roleLabel(effectiveRole)} role` },
            ...members.map((m) => ({ value: m._id, label: `${m.name} · ${roleLabel(m.role)}` })),
          ]}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={submit} loading={pending}>
          Add routing
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
