import { useOutletContext, Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  FileSpreadsheet,
  Truck,
  CheckSquare,
  Wallet,
  Camera,
  ArrowRight,
  AlertTriangle,
  Check,
  FileImage,
  Users,
  CalendarDays,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { formatInr, stageLabel } from '../../lib/format'
import { Avatar, toast } from '../../components/ui'
import { cn } from '../../lib/utils'
import { MeetingNotes } from './MeetingNotes'

const STAGE_HELP = {
  design: {
    title: 'Design',
    plain: 'Concepts, drawings, client approval',
    next: 'Assign design tasks, then move to the quote when the client approves.',
    focus: ['Complete concepts', 'Approve drawings', 'Prepare quote'],
    cta: { to: 'tasks', label: 'Open tasks' },
    secondary: { to: 'files', label: 'Drawings' },
  },
  planning: {
    title: 'Quote & planning',
    plain: 'BOQ, quotation, work order',
    next: 'Finish the quote lines and send to the client.',
    focus: ['Complete BOQ', 'Send quotation', 'Record approval'],
    cta: { to: 'boq', label: 'Open quote' },
    secondary: { to: 'tasks', label: 'Tasks' },
  },
  procurement: {
    title: 'Buying materials',
    plain: 'POs, vendors, deliveries',
    next: 'Raise purchase orders and track vendor supply.',
    focus: ['Select quote items', 'Raise purchase orders', 'Track deliveries'],
    cta: { to: 'procurement', label: 'Open materials' },
    secondary: { to: 'tasks', label: 'Tasks' },
  },
  execution: {
    title: 'Site work',
    plain: 'Daily progress, quality, snags',
    next: 'Post today’s site update and clear open site tasks.',
    focus: ['Post daily updates', 'Track site progress', 'Resolve snags'],
    cta: { to: 'site?compose=1', label: 'Post site update' },
    secondary: { to: 'tasks', label: 'Site tasks' },
  },
  handover: {
    title: 'Handover',
    plain: 'Snags, final check, warranty',
    next: 'Close remaining snags and hand over to the client.',
    focus: ['Close all snags', 'Complete final inspection', 'Hand over documents'],
    cta: { to: 'site', label: 'Snag list' },
    secondary: { to: 'tasks', label: 'Tasks' },
  },
}

const QUICK = [
  {
    to: 'tasks',
    title: 'Tasks',
    desc: 'Assign work',
    icon: CheckSquare,
    tint: 'from-blue-500/15 to-blue-500/5 text-blue-700',
    iconBg: 'bg-blue-600',
  },
  {
    to: 'boq',
    title: 'BOQ',
    desc: 'Quote & rates',
    icon: FileSpreadsheet,
    tint: 'from-violet-500/15 to-violet-500/5 text-violet-700',
    iconBg: 'bg-violet-600',
  },
  {
    to: 'procurement',
    title: 'Materials',
    desc: 'POs & vendors',
    icon: Truck,
    tint: 'from-amber-500/15 to-amber-500/5 text-amber-800',
    iconBg: 'bg-amber-600',
  },
  {
    to: 'site?compose=1',
    title: 'Site',
    desc: 'Daily update',
    icon: Camera,
    tint: 'from-emerald-500/15 to-emerald-500/5 text-emerald-800',
    iconBg: 'bg-emerald-600',
  },
  {
    to: 'files',
    title: 'Drawings',
    desc: 'Plans & PDFs',
    icon: FileImage,
    tint: 'from-slate-500/15 to-slate-500/5 text-slate-700',
    iconBg: 'bg-slate-700',
  },
  {
    to: 'team',
    title: 'Team',
    desc: 'Who is on this',
    icon: Users,
    tint: 'from-sky-500/15 to-sky-500/5 text-sky-800',
    iconBg: 'bg-sky-600',
  },
]

const STAGE_ORDER = ['design', 'planning', 'procurement', 'execution', 'handover']

function stageState(s, current) {
  if (s.status === 'completed' || s.progress >= 100) return 'done'
  if (s.key === current || s.status === 'in_progress') return 'now'
  return 'todo'
}

export function ProjectOverview() {
  const { id } = useParams()
  const { project, stats } = useOutletContext()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const current = project.currentStage || 'design'
  const help = STAGE_HELP[current] || STAGE_HELP.design
  const budget = Number(stats?.budgetVsSpent?.budget ?? project.budget ?? 0)
  const spent = Number(stats?.budgetVsSpent?.spent ?? project.spent ?? 0)
  const utilizationPct = budget > 0 ? (spent / budget) * 100 : null
  const spendBarPct =
    utilizationPct == null ? 0 : Math.min(100, Math.max(0, utilizationPct))
  const variance = budget - spent
  const isOverBudget = budget > 0 && variance < 0
  const exactPct =
    utilizationPct == null
      ? null
      : new Intl.NumberFormat('en-IN', {
          maximumFractionDigits: 1,
        }).format(utilizationPct)
  const delayed = project.isDelayed || project.status === 'delayed'
  const stages = project.stages || []
  const canManage = ['admin', 'owner', 'project_manager', 'hr'].includes(
    user?.role,
  ) || user?.isPlatformAdmin

  /** Tabs are siblings of this route, so links must be absolute. */
  const tab = (path) =>
    path === 'boq' ? `/boq/${id}` : `/projects/${id}/${path}`

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api(`/tasks?projectId=${id}`),
  })
  const { data: siteData } = useQuery({
    queryKey: ['site', id],
    queryFn: () => api(`/site-updates?projectId=${id}`),
  })

  const openTasks = (tasksData?.tasks || [])
    .filter((t) => t.status !== 'done')
    .slice(0, 5)
  const recentUpdates = (siteData?.updates || []).slice(0, 3)

  const setStage = useMutation({
    mutationFn: (stage) =>
      api(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ currentStage: stage }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast('Stage updated', { type: 'success' })
    },
    onError: (e) => toast(e.message || 'Could not update stage', { type: 'error' }),
  })

  const nextStageKey = (() => {
    const i = STAGE_ORDER.indexOf(current)
    return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null
  })()
  const currentStageIndex = Math.max(0, STAGE_ORDER.indexOf(current))
  const stageProgress = ((currentStageIndex + 1) / STAGE_ORDER.length) * 100

  return (
    <div className="space-y-4 p-4 md:p-5">
      {delayed && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">This project is behind schedule</span>
          <Link to={tab('tasks')} className="ml-auto font-semibold underline">
            Review tasks
          </Link>
        </div>
      )}

      {/* Hero + KPIs — fills width, less empty space */}
      <div className="grid gap-4 xl:grid-cols-12">
        <section className="flex flex-col rounded-2xl border border-[#d6e4f5] bg-surface p-4 shadow-sm sm:p-5 xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#d1fae5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#24b47e]">
                  Current phase
                </span>
                <span className="text-[11px] font-medium text-secondary">
                  {currentStageIndex + 1} of {STAGE_ORDER.length}
                </span>
              </div>
              <h2 className="text-[26px] font-semibold tracking-tight text-primary md:text-[30px]">
                {help.title}
              </h2>
              <p className="mt-0.5 text-[14px] text-secondary">{help.plain}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#3ecf8e]">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-secondary">Project journey</span>
              <span className="font-semibold text-[#3ecf8e]">
                {Math.round(stageProgress)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e8eef4]">
              <div
                className="h-full rounded-full bg-[#3ecf8e] transition-all"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#d1fae5] bg-[#f8fbff] px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3ecf8e]">
              Next priority
            </p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-primary">
              {help.next}
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {help.focus.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-[#3ecf8e] ring-1 ring-[#bfdbfe]">
                  {index + 1}
                </span>
                <span className="text-[11px] font-medium leading-tight text-secondary">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Link
              to={tab(help.cta.to)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3ecf8e] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[#24b47e]"
            >
              {help.cta.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to={tab(help.secondary.to)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d6e4f5] bg-surface px-4 text-[13px] font-semibold text-primary hover:bg-surface-raised"
            >
              {help.secondary.label}
            </Link>
            {canManage && nextStageKey && (
              <button
                type="button"
                disabled={setStage.isPending}
                onClick={() => setStage.mutate(nextStageKey)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[13px] font-semibold text-[#15803d] hover:bg-[#dcfce7]"
              >
                Mark done → {stageLabel(nextStageKey)}
              </button>
            )}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3 xl:col-span-5 xl:grid-cols-1">
          <div
            className={cn(
              'rounded-2xl border bg-surface p-4 shadow-sm',
              isOverBudget ? 'border-[#fecaca]' : 'border-[#d6e4f5]',
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-secondary">
                Budget & spend
              </p>
              <Wallet
                className={cn(
                  'h-4 w-4',
                  isOverBudget ? 'text-[#dc2626]' : 'text-[#3ecf8e]',
                )}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                  Spent
                </p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-primary">
                  {formatInr(spent)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                  Approved budget
                </p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-primary">
                  {formatInr(budget)}
                </p>
              </div>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#e8eef4]">
              <div
                className={cn(
                  'h-full rounded-full',
                  isOverBudget ? 'bg-[#dc2626]' : 'bg-[#3ecf8e]',
                )}
                style={{ width: `${spendBarPct}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px]">
              <span
                className={cn(
                  'font-semibold',
                  isOverBudget ? 'text-[#dc2626]' : 'text-[#3ecf8e]',
                )}
              >
                {exactPct == null ? 'Budget not set' : `${exactPct}% used`}
              </span>
              {budget > 0 && (
                <span
                  className={cn(
                    'tabular-nums',
                    isOverBudget ? 'font-semibold text-[#dc2626]' : 'text-secondary',
                  )}
                >
                  {isOverBudget
                    ? `${formatInr(Math.abs(variance))} over budget`
                    : `${formatInr(variance)} remaining`}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#d6e4f5] bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-secondary">Open work</p>
              <CheckSquare className="h-4 w-4 text-[#3ecf8e]" />
            </div>
            <p className="mt-1 text-[28px] font-semibold tabular-nums leading-none text-primary">
              {stats?.openTasks ?? openTasks.length}
            </p>
            <Link
              to={tab('tasks')}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#3ecf8e]"
            >
              Manage tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-[#d6e4f5] bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-secondary">Timeline</p>
              <CalendarDays className="h-4 w-4 text-[#3ecf8e]" />
            </div>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-primary">
              {project.startDate
                ? format(new Date(project.startDate), 'dd MMM yyyy')
                : 'Start TBD'}
              <span className="font-normal text-secondary"> → </span>
              {project.endDate
                ? format(new Date(project.endDate), 'dd MMM yyyy')
                : 'End TBD'}
            </p>
            {(stats?.pendingApprovals ?? 0) > 0 && (
              <p className="mt-2 text-[12px] font-medium text-amber-700">
                {stats.pendingApprovals} approvals waiting
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Steps — compact, clickable */}
      <section className="rounded-2xl border border-[#d6e4f5] bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-primary">
            Project journey
          </p>
          <p className="text-[11px] text-secondary">
            {canManage ? 'Click a step to jump there · use “Mark done” to advance' : 'Click a step to open that area'}
          </p>
        </div>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {stages.map((s, i) => {
            const state = stageState(s, current)
            const dest =
              s.key === 'planning'
                ? 'boq'
                : s.key === 'procurement'
                  ? 'procurement'
                  : s.key === 'execution' || s.key === 'handover'
                    ? 'site'
                    : 'tasks'
            return (
              <li key={s.key}>
                <Link
                  to={tab(dest)}
                  className={cn(
                    'flex h-full items-center gap-2.5 rounded-xl border px-3 py-2.5 transition hover:shadow-sm',
                    state === 'now'
                      ? 'border-[#3ecf8e] bg-[#ecfdf5]'
                      : 'border-border bg-surface-raised hover:border-[#bfdbfe]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                      state === 'done' && 'bg-emerald-500 text-white',
                      state === 'now' && 'bg-[#3ecf8e] text-white',
                      state === 'todo' &&
                        'bg-surface text-secondary ring-1 ring-[#c7c7c7]',
                    )}
                  >
                    {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-[12px] font-semibold',
                        state === 'now' ? 'text-[#24b47e]' : 'text-primary',
                      )}
                    >
                      {s.label || stageLabel(s.key)}
                    </p>
                    <p className="text-[10px] text-secondary">
                      {state === 'done'
                        ? 'Done'
                        : state === 'now'
                          ? 'Current'
                          : 'Next'}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Quick actions — one dense row */}
      <section>
        <p className="mb-2 text-[13px] font-semibold text-primary">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.to}
                to={tab(a.to)}
                className={cn(
                  'group flex flex-col gap-3 rounded-2xl border border-[#d6e4f5] bg-gradient-to-b p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                  a.tint,
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm',
                    a.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-primary">
                    {a.title}
                  </p>
                  <p className="text-[11px] text-secondary">{a.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Client meeting notes */}
      <MeetingNotes projectId={id} project={project} user={user} />

      {/* Live lists — fill the page */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#d6e4f5] bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold text-primary">
              Open tasks
            </p>
            <Link
              to={tab('tasks')}
              className="text-[12px] font-semibold text-[#3ecf8e]"
            >
              All tasks
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {openTasks.length === 0 && (
              <li className="px-4 py-8 text-center text-[13px] text-secondary">
                No open tasks.{' '}
                <Link to={tab('tasks')} className="font-semibold text-[#3ecf8e]">
                  Add one
                </Link>
              </li>
            )}
            {openTasks.map((t) => (
              <li key={t._id}>
                <Link
                  to={tab(`tasks?task=${t._id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#3ecf8e]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-primary">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-secondary">
                      {t.assignee?.name || 'Unassigned'}
                      {t.dueDate
                        ? ` · due ${format(new Date(t.dueDate), 'dd MMM')}`
                        : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#c7c7c7]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#d6e4f5] bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold text-primary">
              Recent site updates
            </p>
            <Link
              to={tab('site')}
              className="text-[12px] font-semibold text-[#3ecf8e]"
            >
              Site tab
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentUpdates.length === 0 && (
              <li className="px-4 py-8 text-center text-[13px] text-secondary">
                No updates yet.{' '}
                <Link
                  to={tab('site?compose=1')}
                  className="font-semibold text-[#3ecf8e]"
                >
                  Post one
                </Link>
              </li>
            )}
            {recentUpdates.map((u) => (
              <li key={u._id} className="flex gap-3 px-4 py-3">
                <Avatar
                  src={u.author?.avatar}
                  name={u.author?.name || 'Site'}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] text-primary">
                    {u.note || 'Update posted'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-secondary">
                    {u.author?.name || 'Team'}
                    {u.createdAt
                      ? ` · ${formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}