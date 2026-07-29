import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  ClipboardList,
  FolderKanban,
  Percent,
  Truck,
  Wallet,
  Activity,
  AlertCircle,
  ArrowUpRight,
  CalendarRange,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatInr, stageLabel } from '../lib/format'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  KpiCard,
  ProgressBar,
  SkeletonCard,
  StatusChip,
} from '../components/ui'
import { cn } from '../lib/utils'

const RANGES = [
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
  { key: 'all', label: 'All time' },
]

function formatShortDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function relativeTime(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function Donut({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let offset = 0
  const radius = 42
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
        />
        {segments.map((seg) => {
          const length = (seg.value / total) * circumference
          const dasharray = `${length} ${circumference - length}`
          const el = (
            <circle
              key={seg.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
            />
          )
          offset += length
          return el
        })}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-[#0f172a]"
          style={{ fontSize: '16px', fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          className="fill-[#64748b]"
          style={{ fontSize: '8px' }}
        >
          projects
        </text>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[#475569]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              {seg.label}
            </span>
            <span className="font-semibold tabular-nums text-[#0f172a]">
              {seg.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function statusTone(row) {
  if (row.isDelayed || row.status === 'delayed') return 'delayed'
  if (row.status === 'completed') return 'completed'
  if (row.status === 'on_hold') return 'on_hold'
  return 'in_progress'
}

export function CompanyAdminDashboard() {
  const [range, setRange] = useState('30d')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['company-admin-dashboard', range],
    queryFn: () => api(`/company-admin/dashboard?range=${range}`),
  })

  const d = data?.data
  const kpis = d?.kpis
  const budget = d?.budget

  const projectTrend = useMemo(() => {
    if (kpis?.projectDelta == null) return null
    const up = kpis.projectDelta >= 0
    return {
      label: `${up ? '+' : ''}${kpis.projectDelta}`,
      up,
    }
  }, [kpis?.projectDelta])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard className="h-20" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load company dashboard"
        description={error?.message || 'Try again in a moment.'}
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    )
  }

  const utilization =
    kpis?.budgetUtilization != null ? `${kpis.budgetUtilization}%` : '—'
  const statusSegments = d?.statusOverview?.length
    ? d.statusOverview
    : [{ key: 'empty', label: 'No projects', value: 1, color: '#cbd5e1' }]

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-[#64748b]">
            EPM · Company-wide view of projects, pipeline, spend, and vendors
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none text-[#0f172a] md:text-[32px]">
            Company Admin
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white p-1">
            <CalendarRange className="ml-2 h-3.5 w-3.5 text-[#94a3b8]" />
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition',
                  range === r.key
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#64748b] hover:bg-[#f1f5f9]',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Link to="/projects">
            <Button variant="secondary">All projects</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/projects" className="block">
          <KpiCard
            label="Total projects"
            value={kpis?.totalProjects ?? 0}
            trend={projectTrend?.label}
            trendUp={projectTrend?.up}
            accentValue
            action={
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563eb]">
                View projects <ArrowUpRight className="h-3 w-3" />
              </span>
            }
          />
        </Link>
        <Link to="/leads" className="block">
          <KpiCard
            label="Active leads"
            value={kpis?.activeLeads ?? 0}
            action={
              <span className="text-[11px] text-[#64748b]">
                Pipeline {formatInr(kpis?.pipelineValue || 0)}
              </span>
            }
          />
        </Link>
        <Link to="/projects" className="block">
          <KpiCard
            label="BOQs / quotes"
            value={kpis?.totalBoqs ?? 0}
            action={
              <span className="text-[11px] text-[#64748b]">
                {kpis?.approvedBoqs ?? 0} approved
              </span>
            }
          />
        </Link>
        <Link to="/finance" className="block">
          <KpiCard
            label="Budget utilization"
            value={utilization}
            action={
              <span className="text-[11px] text-[#64748b]">
                {formatInr(kpis?.totalSpent || 0)} of{' '}
                {formatInr(kpis?.totalBudget || 0)}
              </span>
            }
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[#2563eb]" />
              <h2 className="text-sm font-semibold text-[#0f172a]">
                Project status overview
              </h2>
            </div>
            <Link
              to="/portfolio"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Portfolio
            </Link>
          </div>
          {(d?.projectCounts?.total || 0) === 0 ? (
            <EmptyState
              className="!border-0 !bg-transparent !py-8"
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project to see status distribution."
            />
          ) : (
            <Donut segments={statusSegments} />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#2563eb]" />
              <h2 className="text-sm font-semibold text-[#0f172a]">
                Budget tracking
              </h2>
            </div>
            <Link
              to="/finance"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Money
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <p className="text-[11px] font-medium text-[#64748b]">Approved budget</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#0f172a]">
                {formatInr(budget?.totalBudget || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <p className="text-[11px] font-medium text-[#64748b]">Actual spend</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#0f172a]">
                {formatInr(budget?.totalSpent || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-[#eff6ff] p-3">
              <p className="text-[11px] font-medium text-[#64748b]">Committed POs</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#2563eb]">
                {formatInr(budget?.committedAmount || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <p className="text-[11px] font-medium text-[#64748b]">Variance</p>
              <p
                className={cn(
                  'mt-1 text-[18px] font-semibold tabular-nums',
                  (budget?.variance || 0) < 0 ? 'text-[#dc2626]' : 'text-[#059669]',
                )}
              >
                {formatInr(budget?.variance || 0)}
              </p>
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="text-[#64748b]">Utilization</span>
              <span className="font-semibold tabular-nums text-[#0f172a]">
                {utilization}
              </span>
            </div>
            <ProgressBar
              value={Math.min(100, Math.max(0, Number(kpis?.budgetUtilization) || 0))}
            />
          </div>

          {budget?.periodSpend != null && (
            <p className="mb-3 text-[11px] text-[#64748b]">
              Approved expense spend in range: {formatInr(budget.periodSpend)}
              {budget.spendDelta != null && (
                <span
                  className={cn(
                    'ml-1 font-semibold',
                    budget.spendDelta >= 0 ? 'text-[#dc2626]' : 'text-[#059669]',
                  )}
                >
                  ({budget.spendDelta >= 0 ? '+' : ''}
                  {budget.spendDelta}% vs prior)
                </span>
              )}
            </p>
          )}

          <ul className="divide-y divide-[#eef2f7]">
            {(budget?.projects || []).slice(0, 5).map((row) => (
              <li key={row.id}>
                <Link
                  to={`/projects/${row.id}/overview`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#f8fafc]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#0f172a]">
                      {row.name}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">
                      {formatInr(row.spent)} / {formatInr(row.budget)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#475569]">
                    {row.utilization != null
                      ? `${Math.round(row.utilization)}%`
                      : '—'}
                  </span>
                </Link>
              </li>
            ))}
            {!budget?.projects?.length && (
              <li className="py-6 text-center text-sm text-[#94a3b8]">
                No budget rows yet
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2563eb]" />
              <h2 className="text-sm font-semibold">Recent activities</h2>
            </div>
          </div>
          <ul className="space-y-3">
            {(d?.activity || []).map((item) => (
              <li key={item.id} className="flex gap-2.5">
                <Avatar
                  name={item.actor?.name || 'System'}
                  src={item.actor?.avatar}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-[#334155]">
                    {item.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                    {item.project ? (
                      <Link
                        to={`/projects/${item.project.id}/overview`}
                        className="font-medium text-[#2563eb] hover:underline"
                      >
                        {item.project.name}
                      </Link>
                    ) : (
                      'Company'
                    )}
                    {' · '}
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
            {!d?.activity?.length && (
              <li className="py-8 text-center text-sm text-[#94a3b8]">
                No activity in this range
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#2563eb]" />
              <h2 className="text-sm font-semibold">Materials summary</h2>
            </div>
            <Link
              to="/procurement"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Materials
            </Link>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#e2e8f0] p-3">
              <p className="text-[11px] text-[#64748b]">Approved BOQ lines</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d?.materials?.approvedBoqLines ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] p-3">
              <p className="text-[11px] text-[#64748b]">PO lines</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d?.materials?.poLines ?? 0}
              </p>
            </div>
          </div>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="text-[#64748b]">BOQ → PO coverage</span>
              <span className="font-semibold">
                {d?.materials?.coveragePct != null
                  ? `${d.materials.coveragePct}%`
                  : '—'}
              </span>
            </div>
            <ProgressBar value={d?.materials?.coveragePct || 0} />
          </div>
          <ul className="space-y-1.5">
            {(d?.materials?.poStatus || []).map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-[#64748b]">{row.label}</span>
                <span className="font-semibold tabular-nums text-[#0f172a]">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-[#94a3b8]">
            {d?.materials?.note}
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#2563eb]" />
              <h2 className="text-sm font-semibold">Top vendors</h2>
            </div>
            <Link
              to="/procurement"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Vendors
            </Link>
          </div>
          <ul className="divide-y divide-[#eef2f7]">
            {(d?.topVendors || []).map((vendor, idx) => (
              <li
                key={vendor.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#0f172a]">
                    <span className="mr-1.5 text-[#94a3b8]">{idx + 1}.</span>
                    {vendor.name}
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">
                    {vendor.poCount} POs
                    {vendor.deliveryRate != null
                      ? ` · ${vendor.deliveryRate}% delivered`
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#0f172a]">
                  {formatInr(vendor.value)}
                </span>
              </li>
            ))}
            {!d?.topVendors?.length && (
              <li className="py-8 text-center text-sm text-[#94a3b8]">
                No vendor spend yet
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#2563eb]" />
            <h2 className="text-sm font-semibold">Project timeline</h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
            <Percent className="h-3.5 w-3.5" />
            Progress, dates, and spend
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-wide text-[#64748b]">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-5">Project</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Stage</th>
                <th className="px-3 py-3 font-semibold">Start</th>
                <th className="px-3 py-3 font-semibold">End</th>
                <th className="px-3 py-3 font-semibold">Progress</th>
                <th className="px-4 py-3 font-semibold text-right sm:px-5">
                  Spend / Budget
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {(d?.timeline || []).map((row) => (
                <tr key={row.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 sm:px-5">
                    <Link
                      to={`/projects/${row.id}/overview`}
                      className="font-medium text-[#0f172a] hover:text-[#2563eb]"
                    >
                      {row.name}
                    </Link>
                    <p className="text-[11px] text-[#94a3b8]">{row.clientName}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={statusTone(row)} />
                  </td>
                  <td className="px-3 py-3 text-[#475569]">
                    {stageLabel(row.currentStage)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[#475569]">
                    {formatShortDate(row.startDate)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[#475569]">
                    {formatShortDate(row.endDate)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[110px] items-center gap-2">
                      <ProgressBar value={row.progress || 0} className="flex-1" />
                      <span className="w-8 text-right text-[11px] tabular-nums text-[#64748b]">
                        {row.progress || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                    <span className="font-medium text-[#0f172a]">
                      {formatInr(row.spent)}
                    </span>
                    <span className="text-[#94a3b8]"> / {formatInr(row.budget)}</span>
                  </td>
                </tr>
              ))}
              {!d?.timeline?.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-[#94a3b8]"
                  >
                    No projects to show on the timeline
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-[#eef2f7] md:hidden">
          {(d?.timeline || []).map((row) => (
            <Link
              key={row.id}
              to={`/projects/${row.id}/overview`}
              className="block px-4 py-3 hover:bg-[#f8fafc]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#0f172a]">{row.name}</p>
                  <p className="text-[11px] text-[#94a3b8]">{row.clientName}</p>
                </div>
                <StatusChip status={statusTone(row)} />
              </div>
              <p className="mt-2 text-[11px] text-[#64748b]">
                {stageLabel(row.currentStage)} · {formatShortDate(row.startDate)} →{' '}
                {formatShortDate(row.endDate)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={row.progress || 0} className="flex-1" />
                <span className="text-[11px] tabular-nums text-[#64748b]">
                  {row.progress || 0}%
                </span>
              </div>
              <p className="mt-2 text-[12px] tabular-nums text-[#475569]">
                {formatInr(row.spent)} / {formatInr(row.budget)}
              </p>
            </Link>
          ))}
          {!d?.timeline?.length && (
            <p className="px-4 py-10 text-center text-sm text-[#94a3b8]">
              No projects to show
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
