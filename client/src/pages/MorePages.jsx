import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Camera,
  CheckSquare,
  Receipt,
  AlertTriangle,
  BarChart3,
  Clock3,
  Download,
  FolderKanban,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { api, getTenantSlug, useAuthStore } from '../lib/api'
import { formatInr, stageLabel } from '../lib/format'
import { InviteDetailsModal } from '../components/layout/GlobalChrome'
import {
  Avatar,
  Button,
  Card,
  Input,
  Select,
  StatusChip,
  toast,
} from '../components/ui'

export function ReportsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api('/reports/overview'),
  })
  const [query, setQuery] = useState('')
  const [askedQuery, setAskedQuery] = useState('')
  const [peopleSearch, setPeopleSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const d = data?.data

  const answer = useMemo(() => {
    if (!askedQuery.trim() || !d) return null
    const q = askedQuery.toLowerCase()
    if (q.includes('risk') || q.includes('delay')) {
      return `${d.health.delayed} project(s) are delayed. On-time rate is ${d.health.onTimePct}%.`
    }
    if (q.includes('pipeline') || q.includes('crm')) {
      return `Open CRM pipeline value is ${formatInr(d.crmPipelineValue)}.`
    }
    if (q.includes('budget') || q.includes('variance')) {
      return `Portfolio budget variance (quoted − spent) is ${formatInr(d.budgetVariance)}.`
    }
    if (q.includes('team')) {
      const top = [...(d.teamPerf || [])].sort((a, b) => b.done - a.done)[0]
      return top
        ? `${top.user.name} leads completions with ${top.done} done, ${top.open} open, and a ${top.completionRate}% completion rate.`
        : 'No team data.'
    }
    if (q.includes('overdue')) {
      const people = [...(d.teamPerf || [])]
        .filter((person) => person.overdue > 0)
        .sort((a, b) => b.overdue - a.overdue)
      return people.length
        ? `${people[0].user.name} has the highest overdue workload (${people[0].overdue}). ${d.taskCompletion.overdue} tasks are overdue company-wide.`
        : 'There are no overdue assigned tasks.'
    }
    return 'Try: “which projects are at risk”, “pipeline value”, “budget variance”, or “team performance”.'
  }, [askedQuery, d])

  const stageChart = (d?.leadStages || []).map((s) => ({
    name: stageLabel(s.stage).split(' ')[0],
    count: s.count,
  }))

  const taskChart = (d?.taskStatus || []).map((item) => ({
    name:
      {
        todo: 'To do',
        in_progress: 'In progress',
        review: 'Review',
        done: 'Done',
      }[item.status] || item.status,
    count: item.count,
  }))

  const people = useMemo(() => {
    const term = peopleSearch.trim().toLowerCase()
    return [...(d?.teamPerf || [])]
      .filter(({ user }) => {
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        const matchesSearch =
          !term ||
          [user.name, user.title, user.role]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        return matchesRole && matchesSearch
      })
      .sort(
        (a, b) =>
          b.overdue - a.overdue ||
          b.open - a.open ||
          b.completionRate - a.completionRate,
      )
  }, [d?.teamPerf, peopleSearch, roleFilter])

  const roles = useMemo(
    () => [...new Set((d?.teamPerf || []).map(({ user }) => user.role))].sort(),
    [d?.teamPerf],
  )

  const completionPct = d?.taskCompletion?.total
    ? Math.round((d.taskCompletion.done / d.taskCompletion.total) * 100)
    : 0

  const exportPeople = () => {
    if (!people.length) return
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [
      [
        'Name',
        'Role',
        'Status',
        'Assigned',
        'Done',
        'Open',
        'In progress',
        'Review',
        'Overdue',
        'Completion %',
        'Tracked hours',
      ],
      ...people.map((person) => [
        person.user.name,
        person.user.role,
        person.user.isActive === false ? 'Inactive' : 'Active',
        person.total,
        person.done,
        person.open,
        person.inProgress,
        person.review,
        person.overdue,
        person.completionRate,
        person.trackedHours,
      ]),
    ]
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `team-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-20 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-7 w-7 text-red-500" />
          <h2 className="mt-3 text-lg font-semibold text-[#0f172a]">
            Reports could not be loaded
          </h2>
          <Button className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            <BarChart3 className="h-3.5 w-3.5 text-[#2563eb]" />
            Company intelligence
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-[#0f172a]">
            Reports &amp; Analytics
          </h1>
          <p className="mt-1 text-[13px] text-[#64748b]">
            Live portfolio, task, pipeline, and people performance in one view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dce4ee] bg-white px-3 text-[12px] font-semibold text-[#475569] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportPeople}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"
          >
            <Download className="h-3.5 w-3.5" />
            Export team
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpi
          icon={TrendingUp}
          label="On-time delivery"
          value={`${d?.health?.onTimePct ?? 0}%`}
          note={`${d?.health?.total ?? 0} active projects`}
          tone="blue"
          progress={d?.health?.onTimePct ?? 0}
        />
        <ReportKpi
          icon={CheckSquare}
          label="Task completion"
          value={`${completionPct}%`}
          note={`${d?.taskCompletion?.done ?? 0} of ${d?.taskCompletion?.total ?? 0} tasks done`}
          tone="emerald"
          progress={completionPct}
        />
        <ReportKpi
          icon={Users}
          label="Active workforce"
          value={(d?.teamPerf || []).filter((p) => p.user.isActive !== false).length}
          note={`${d?.taskCompletion?.overdue ?? 0} overdue tasks`}
          tone="violet"
        />
        <ReportKpi
          icon={FolderKanban}
          label="Budget variance"
          value={formatInr(d?.budgetVariance)}
          note={`Pipeline ${formatInr(d?.crmPipelineValue)}`}
          tone={d?.budgetVariance < 0 ? 'rose' : 'amber'}
        />
      </div>

      <section className="rounded-2xl border border-[#dce7f5] bg-gradient-to-r from-[#f7faff] to-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#2563eb]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[13px] font-semibold text-[#0f172a]">
              Insights assistant
            </h3>
            <p className="text-[11px] text-[#94a3b8]">
              Ask about risk, workload, pipeline, or budgets
            </p>
          </div>
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setAskedQuery(query.trim())
          }}
        >
          <Input
            placeholder='Ask e.g. "which projects are at risk this month"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={!query.trim()}>
            Ask
          </Button>
        </form>
        {answer && (
          <p className="mt-3 rounded-xl border border-[#dce7f5] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#475569]">
            {answer}
          </p>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportPanel
          title="Task distribution"
          subtitle={`${d?.taskCompletion?.unassigned ?? 0} tasks currently unassigned`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChart} margin={{ top: 8, right: 8, left: -18 }}>
                <CartesianGrid stroke="#e6ecf4" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #dce4ee',
                    borderRadius: 12,
                    color: '#0f172a',
                    boxShadow: '0 6px 24px rgba(11,27,43,0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>

        <ReportPanel
          title="CRM pipeline"
          subtitle={`${formatInr(d?.crmPipelineValue)} open opportunity value`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChart} margin={{ top: 8, right: 8, left: -18 }}>
                <CartesianGrid stroke="#e6ecf4" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #dce4ee',
                    borderRadius: 12,
                    color: '#0f172a',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>
      </div>

      <ReportPanel
        title="People performance"
        subtitle="Workload, delivery, tracked time, and task health for every company user"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                placeholder="Search people"
                className="h-8 w-44 rounded-lg border border-[#dce4ee] bg-[#f8fafc] pl-8 pr-2 text-[11.5px] outline-none focus:border-[#93b4ec] focus:bg-white"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-lg border border-[#dce4ee] bg-[#f8fafc] px-2 text-[11.5px] font-medium text-[#475569] outline-none focus:border-[#93b4ec]"
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-y border-[#e8eef5] bg-[#f8fafc] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                <th className="px-5 py-2.5">Team member</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-center">Assigned</th>
                <th className="px-3 py-2.5 text-center">Done</th>
                <th className="px-3 py-2.5 text-center">Open</th>
                <th className="px-3 py-2.5 text-center">Review</th>
                <th className="px-3 py-2.5 text-center">Overdue</th>
                <th className="w-52 px-3 py-2.5">Completion</th>
                <th className="px-5 py-2.5 text-right">Tracked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {people.map((person) => (
                <tr key={person.user._id} className="transition hover:bg-[#fbfdff]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={person.user.avatar}
                        name={person.user.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-[#0f172a]">
                          {person.user.name}
                        </p>
                        <p className="truncate text-[10.5px] text-[#94a3b8]">
                          {person.user.title || roleLabel(person.user.role)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-semibold ${
                        person.user.isActive === false
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          person.user.isActive === false
                            ? 'bg-slate-400'
                            : 'bg-emerald-500'
                        }`}
                      />
                      {person.user.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <MetricCell value={person.total} />
                  <MetricCell value={person.done} tone="success" />
                  <MetricCell value={person.open} />
                  <MetricCell value={person.review} tone="violet" />
                  <MetricCell
                    value={person.overdue}
                    tone={person.overdue ? 'danger' : 'muted'}
                  />
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8eef5]">
                        <div
                          className={`h-full rounded-full ${
                            person.completionRate >= 75
                              ? 'bg-emerald-500'
                              : person.completionRate >= 40
                                ? 'bg-[#2563eb]'
                                : 'bg-amber-500'
                          }`}
                          style={{ width: `${person.completionRate}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-[#475569]">
                        {person.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-[11.5px] font-semibold tabular-nums text-[#475569]">
                    {person.trackedHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!people.length && (
            <div className="px-5 py-12 text-center text-[12px] text-[#94a3b8]">
              No users match these filters.
            </div>
          )}
        </div>
      </ReportPanel>

      <ReportPanel
        title="Project health"
        subtitle="Projects requiring attention are shown first"
        noPadding
      >
        <div className="grid gap-px bg-[#edf1f6] sm:grid-cols-2 xl:grid-cols-3">
          {(d?.projectHealth || []).map((project) => (
            <div key={project._id} className="bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#0f172a]">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#94a3b8]">
                    {project.done}/{project.totalTasks} tasks completed
                  </p>
                </div>
                {project.overdue > 0 ? (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                    {project.overdue} overdue
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    On track
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8eef5]">
                  <div
                    className={`h-full rounded-full ${
                      project.isDelayed ? 'bg-red-500' : 'bg-[#2563eb]'
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-[#475569]">
                  {project.progress}%
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10.5px] text-[#94a3b8]">
                <span>Budget {formatInr(project.budget)}</span>
                <span>Spent {formatInr(project.spent)}</span>
              </div>
            </div>
          ))}
        </div>
      </ReportPanel>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          icon={AlertTriangle}
          label="Delayed projects"
          value={d?.health?.delayed ?? 0}
          tone="red"
        />
        <MiniStat
          icon={Clock3}
          label="POs in transit"
          value={d?.vendorPerformance?.inTransit ?? 0}
          tone="amber"
        />
        <MiniStat
          icon={Receipt}
          label="Delivered POs"
          value={`${d?.vendorPerformance?.delivered ?? 0} / ${d?.vendorPerformance?.totalPOs ?? 0}`}
          tone="emerald"
        />
      </div>
    </div>
  )
}

function ReportKpi({ icon: Icon, label, value, note, tone = 'blue', progress }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <section className="rounded-2xl border border-[#e0e7f0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[#64748b]">{label}</p>
          <p className="mt-2 text-[24px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-[#0f172a]">
            {value}
          </p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 truncate text-[10.5px] text-[#94a3b8]">{note}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#edf1f6]">
          <div
            className={`h-full rounded-full ${
              tone === 'emerald' ? 'bg-emerald-500' : 'bg-[#2563eb]'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </section>
  )
}

function ReportPanel({ title, subtitle, action, children, noPadding = false }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-[#0f172a]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10.5px] text-[#94a3b8]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={noPadding ? '' : 'px-4 pb-4'}>{children}</div>
    </section>
  )
}

function MetricCell({ value, tone = 'default' }) {
  const tones = {
    default: 'text-[#475569]',
    success: 'text-emerald-600',
    violet: 'text-violet-600',
    danger: 'text-red-600',
    muted: 'text-[#94a3b8]',
  }
  return (
    <td className={`px-3 py-3 text-center text-[12px] font-semibold tabular-nums ${tones[tone]}`}>
      {value}
    </td>
  )
}

function MiniStat({ icon: Icon, label, value, tone }) {
  const tones = {
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e0e7f0] bg-white p-4 shadow-sm">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10.5px] text-[#94a3b8]">{label}</p>
        <p className="text-[16px] font-semibold tabular-nums text-[#0f172a]">{value}</p>
      </div>
    </div>
  )
}

function roleLabel(role) {
  return String(role || 'member')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function NotificationsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api('/notifications'),
  })

  const readAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: (id) =>
      api(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-secondary mb-1">Inbox</p>
          <h1 className="text-[32px] font-semibold tracking-tight leading-none">
            Inbox
          </h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => readAll.mutate()}>
          Mark all read
        </Button>
      </div>

      <Card padding={false}>
        <div className="divide-y divide-border">
          {(data?.notifications || []).map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => !n.read && markRead.mutate(n._id)}
              className="flex w-full gap-3 px-5 py-4 text-left hover:bg-surface-raised transition-colors"
            >
              <span
                className={`mt-1.5 h-2 w-2 rounded-full ${n.read ? 'bg-border' : 'bg-accent'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-secondary mt-0.5">{n.body}</p>
                <p className="text-[11px] text-secondary mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {n.link && (
                <Link
                  to={n.link}
                  className="text-xs text-accent self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                </Link>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useStateSafe(user?.name || '')
  const [title, setTitle] = useStateSafe(user?.title || '')
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: 'project_manager',
  })
  const [inviteResult, setInviteResult] = useState(null)
  const [pwd, setPwd] = useState({ current: '', next: '' })
  const canInvite =
    user?.isPlatformAdmin ||
    ['admin', 'owner', 'hr', 'project_manager'].includes(user?.role)

  const save = async () => {
    try {
      const data = await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, title }),
      })
      setUser(data.user)
      toast('Profile saved', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const sendInvite = async () => {
    try {
      const data = await api('/auth/invite', {
        method: 'POST',
        body: JSON.stringify(invite),
      })
      setInviteResult({
        workspace: tenant?.slug || getTenantSlug(),
        email: data.user.email,
        tempPassword: data.tempPassword,
        loginUrl: window.location.origin + '/login',
      })
      setInvite({ name: '', email: '', role: 'project_manager' })
      toast('Invite created', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const changePassword = async () => {
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pwd.current || undefined,
          password: pwd.next,
        }),
      })
      setUser({ ...user, mustChangePassword: false })
      setPwd({ current: '', next: '' })
      toast('Password updated', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-sm text-secondary mb-1">Account</p>
        <h1 className="text-[32px] font-semibold tracking-tight leading-none">
          Settings
        </h1>
        {(tenant?.slug || user?.tenantId) && (
          <p className="mt-2 text-xs text-secondary">
            Workspace: <code>{tenant?.slug || '—'}</code>
            {tenant?.seatLimit != null && ` · ${tenant.seatLimit} seats`}
          </p>
        )}
      </div>

      {user?.mustChangePassword && (
        <Card className="border border-status-delayed/40 space-y-3">
          <p className="font-semibold text-sm">Set a new password</p>
          <Input
            label="Current / temp password"
            type="password"
            value={pwd.current}
            onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            value={pwd.next}
            onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))}
          />
          <Button onClick={changePassword} disabled={pwd.next.length < 6}>
            Update password
          </Button>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar} name={user?.name} size="lg" />
          <div>
            <p className="font-semibold">{user?.email}</p>
            <p className="text-xs text-secondary capitalize">
              {(user?.role || '').replace(/_/g, ' ')}
              {user?.isPlatformAdmin ? ' · platform admin' : ''}
            </p>
          </div>
        </div>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={save}>Save changes</Button>
      </Card>

      {canInvite && (
        <Card className="space-y-3">
          <div>
            <p className="font-semibold">Invite teammate</p>
            <p className="text-xs text-secondary mt-0.5">
              Creates a user in this workspace (counts toward seat limit). Details
              open in a popup to copy and share.
            </p>
          </div>
          <Input
            label="Name"
            value={invite.name}
            onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={invite.email}
            onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
          />
          <Select
            label="Role"
            value={invite.role}
            onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'owner', label: 'Owner' },
              { value: 'hr', label: 'HR' },
              { value: 'project_manager', label: 'Project manager' },
              { value: 'designer', label: 'Designer' },
              { value: 'site_supervisor', label: 'Site supervisor' },
              { value: 'client', label: 'Client' },
              { value: 'vendor', label: 'Vendor' },
            ]}
          />
          <Button
            onClick={sendInvite}
            disabled={!invite.name || !invite.email}
          >
            Create invite
          </Button>
        </Card>
      )}

      <InviteDetailsModal
        open={!!inviteResult}
        details={inviteResult}
        onClose={() => setInviteResult(null)}
      />

      <CustomFieldsSettings />
    </div>
  )
}

function CustomFieldsSettings() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState({
    name: '',
    type: 'text',
    options: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['custom-fields', 'all'],
    queryFn: () => api('/custom-fields/all'),
  })
  const fields = data?.fields || []

  const createField = useMutation({
    mutationFn: (body) =>
      api('/custom-fields', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields'] })
      setDraft({ name: '', type: 'text', options: '' })
      toast('Field created', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const patchField = useMutation({
    mutationFn: ({ id, ...body }) =>
      api(`/custom-fields/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields'] })
      toast('Field updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const removeField = useMutation({
    mutationFn: (id) => api(`/custom-fields/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields'] })
      toast('Field deactivated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-semibold">Task custom fields</p>
        <p className="text-xs text-secondary mt-0.5">
          Workspace-wide fields (e.g. Developer) appear on every task sheet.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-secondary">Loading…</p>
      ) : fields.length === 0 ? (
        <p className="text-xs text-secondary">No custom fields yet.</p>
      ) : (
        <ul className="space-y-2">
          {fields.map((f) => (
            <li
              key={f._id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{f.name}</p>
                <p className="text-[11px] text-secondary">
                  {f.slug} · {f.type}
                  {!f.isActive ? ' · inactive' : ''}
                </p>
              </div>
              {f.isActive ? (
                <button
                  type="button"
                  className="text-[12px] text-secondary hover:text-primary"
                  onClick={() => removeField.mutate(f._id)}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className="text-[12px] text-secondary hover:text-primary"
                  onClick={() =>
                    patchField.mutate({ id: f._id, isActive: true })
                  }
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[12px] font-medium">Add field</p>
        <Input
          label="Name"
          value={draft.name}
          onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
          placeholder="Developer"
        />
        <Select
          label="Type"
          value={draft.type}
          onChange={(e) => setDraft((s) => ({ ...s, type: e.target.value }))}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'user', label: 'Person' },
            { value: 'select', label: 'Select' },
            { value: 'number', label: 'Number' },
          ]}
        />
        {draft.type === 'select' && (
          <Input
            label="Options"
            value={draft.options}
            onChange={(e) =>
              setDraft((s) => ({ ...s, options: e.target.value }))
            }
            placeholder="Option A, Option B"
          />
        )}
        <Button
          disabled={!draft.name.trim() || createField.isPending}
          onClick={() =>
            createField.mutate({
              name: draft.name.trim(),
              type: draft.type,
              options:
                draft.type === 'select'
                  ? draft.options
                      .split(',')
                      .map((o) => o.trim())
                      .filter(Boolean)
                  : [],
            })
          }
        >
          Add field
        </Button>
      </div>
    </Card>
  )
}

function useStateSafe(initial) {
  return useState(initial)
}

export function MobileSupervisorPage() {
  const user = useAuthStore((s) => s.user)
  const { data: home } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
  })
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api('/projects'),
  })
  const [screen, setScreen] = useState('home')
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [snagTitle, setSnagTitle] = useState('')
  const qc = useQueryClient()

  const firstProject = projects?.projects?.[0]?._id

  const postUpdate = async () => {
    try {
      await api('/site-updates', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || firstProject,
          note,
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
            },
          ],
        }),
      })
      toast('Site update posted', { type: 'success' })
      setNote('')
      setScreen('home')
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const logExpense = async () => {
    try {
      await api('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || firstProject,
          amount: Number(amount),
          category: 'Materials',
          note: 'Logged from mobile',
          receiptUrl:
            'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
        }),
      })
      toast('Expense submitted', { type: 'success' })
      setAmount('')
      setScreen('home')
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const addSnag = async () => {
    try {
      await api('/snags', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || firstProject,
          title: snagTitle,
          status: 'open',
          assignee: user?.id,
        }),
      })
      toast('Snag logged', { type: 'success' })
      setSnagTitle('')
      setScreen('home')
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const toggleTask = async (id) => {
    await api(`/tasks/${id}/toggle`, { method: 'PATCH' })
    qc.invalidateQueries({ queryKey: ['home'] })
  }

  if (screen === 'home') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <p className="text-sm text-secondary">Site mode</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hey {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'update', label: 'Post site update', icon: Camera },
            { key: 'tasks', label: 'My tasks', icon: CheckSquare },
            { key: 'expense', label: 'Log expense', icon: Receipt },
            { key: 'snags', label: 'Snags', icon: AlertTriangle },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setScreen(t.key)}
              className="flex min-h-[120px] flex-col items-start justify-between rounded-[18px] border border-border bg-surface p-4 text-left hover:border-accent/40 transition-colors"
            >
              <t.icon className="h-6 w-6 text-accent" />
              <span className="text-sm font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Button variant="ghost" onClick={() => setScreen('home')}>
        ← Back
      </Button>

      {screen === 'update' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Post site update</h2>
          <Select
            label="Project"
            value={projectId || firstProject || ''}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects?.projects || []).map((p) => ({
              value: p._id,
              label: p.name,
            }))}
          />
          <div className="flex h-40 items-center justify-center rounded-[16px] border border-dashed border-border bg-surface-raised text-secondary text-sm">
            Camera capture (URL stub for web)
          </div>
          <Input
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button className="w-full" onClick={postUpdate}>
            Publish
          </Button>
        </Card>
      )}

      {screen === 'tasks' && (
        <Card padding={false}>
          {(home?.data?.tasks?.today || [])
            .concat(home?.data?.tasks?.overdue || [])
            .map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => toggleTask(t._id)}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left last:border-0"
              >
                <StatusChip status={t.status} />
                <span className="text-sm flex-1">{t.title}</span>
              </button>
            ))}
        </Card>
      )}

      {screen === 'expense' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Log expense</h2>
          <Select
            label="Project"
            value={projectId || firstProject || ''}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects?.projects || []).map((p) => ({
              value: p._id,
              label: p.name,
            }))}
          />
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button className="w-full" onClick={logExpense}>
            Submit for approval
          </Button>
        </Card>
      )}

      {screen === 'snags' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Log snag</h2>
          <Select
            label="Project"
            value={projectId || firstProject || ''}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects?.projects || []).map((p) => ({
              value: p._id,
              label: p.name,
            }))}
          />
          <Input
            label="Issue"
            value={snagTitle}
            onChange={(e) => setSnagTitle(e.target.value)}
          />
          <Button className="w-full" onClick={addSnag}>
            Save snag
          </Button>
        </Card>
      )}
    </div>
  )
}
