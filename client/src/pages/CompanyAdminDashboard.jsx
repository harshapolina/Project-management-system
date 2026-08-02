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
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Store,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatInr, stageLabel } from '../lib/format'
import {
  Avatar,
  Button,
  EmptyState,
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
  const statusTotal =
    statusSegments.reduce((s, seg) => s + (seg.value || 0), 0) || 1
  const delayedSegment = statusSegments.find((seg) =>
    String(seg.key || seg.label)
      .toLowerCase()
      .includes('delay'),
  )

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            Company overview
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-[#0f172a]">
            Company Admin
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[#64748b]">
            Projects, pipeline, spend, and vendors — the whole company at a
            glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#eef2f7] p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                  range === r.key
                    ? 'bg-white text-[#0f172a] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]',
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
      </header>

      {/* KPI strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          to="/projects"
          icon={FolderKanban}
          tone="blue"
          label="Total projects"
          value={kpis?.totalProjects ?? 0}
          delta={projectTrend}
          foot={
            <span className="inline-flex items-center gap-1 font-semibold text-[#2563eb]">
              View projects <ArrowUpRight className="h-3 w-3" />
            </span>
          }
        />
        <StatCard
          to="/leads"
          icon={TrendingUp}
          tone="violet"
          label="Active leads"
          value={kpis?.activeLeads ?? 0}
          foot={`Pipeline ${formatInr(kpis?.pipelineValue || 0)}`}
        />
        <StatCard
          to="/projects"
          icon={ClipboardList}
          tone="amber"
          label="BOQs / quotes"
          value={kpis?.totalBoqs ?? 0}
          foot={`${kpis?.approvedBoqs ?? 0} approved`}
        />
        <StatCard
          to="/finance"
          icon={Wallet}
          tone="emerald"
          label="Budget utilization"
          value={utilization}
          foot={`${formatInr(kpis?.totalSpent || 0)} of ${formatInr(
            kpis?.totalBudget || 0,
          )}`}
        />
      </section>

      {/* Status + Budget — matched heights, content fills the card */}
      <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
        <Panel
          className="h-full lg:col-span-2"
          icon={FolderKanban}
          title="Project status"
          subtitle="Distribution across all projects"
          action={
            <Link
              to="/portfolio"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Portfolio
            </Link>
          }
        >
          {(d?.projectCounts?.total || 0) === 0 ? (
            <EmptyState
              className="!border-0 !bg-transparent !py-8"
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project to see status distribution."
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="flex shrink-0 justify-center pt-1">
                <Donut segments={statusSegments} size="lg" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-3">
                {statusSegments.map((seg) => {
                  const pct = Math.round(
                    ((seg.value || 0) / statusTotal) * 100,
                  )
                  return (
                    <div key={seg.key} className="rounded-xl bg-[#f8fafc] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="inline-flex items-center gap-2 font-medium text-[#334155]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: seg.color }}
                          />
                          {seg.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#64748b]">
                          <span className="font-semibold text-[#0f172a]">
                            {seg.value}
                          </span>{' '}
                          · {pct}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: seg.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              {delayedSegment?.value > 0 ? (
                <p className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {delayedSegment.value}{' '}
                  {delayedSegment.value === 1 ? 'project' : 'projects'} delayed
                  — needs attention
                </p>
              ) : (
                <p className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                  All projects on track
                </p>
              )}
            </div>
          )}
        </Panel>

        <Panel
          className="h-full lg:col-span-3"
          icon={Wallet}
          title="Budget tracking"
          subtitle="Approved budgets vs actual spend"
          action={
            <Link
              to="/finance"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Money
            </Link>
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-4 grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
              <BudgetTile
                label="Approved budget"
                value={formatInr(budget?.totalBudget || 0)}
              />
              <BudgetTile
                label="Actual spend"
                value={formatInr(budget?.totalSpent || 0)}
              />
              <BudgetTile
                label="Committed POs"
                value={formatInr(budget?.committedAmount || 0)}
                tone="blue"
              />
              <BudgetTile
                label="Variance"
                value={formatInr(budget?.variance || 0)}
                tone={(budget?.variance || 0) < 0 ? 'red' : 'green'}
              />
            </div>

            <div className="mb-4 shrink-0">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-[#64748b]">Utilization</span>
                <span className="font-semibold tabular-nums text-[#0f172a]">
                  {utilization}
                </span>
              </div>
              <ProgressBar
                value={Math.min(
                  100,
                  Math.max(0, Number(kpis?.budgetUtilization) || 0),
                )}
              />
              {budget?.periodSpend != null && (
                <p className="mt-2 text-[11px] text-[#94a3b8]">
                  Approved expense spend in range:{' '}
                  {formatInr(budget.periodSpend)}
                  {budget.spendDelta != null && (
                    <span
                      className={cn(
                        'ml-1 font-semibold',
                        budget.spendDelta >= 0
                          ? 'text-[#dc2626]'
                          : 'text-[#059669]',
                      )}
                    >
                      ({budget.spendDelta >= 0 ? '+' : ''}
                      {budget.spendDelta}% vs prior)
                    </span>
                  )}
                </p>
              )}
            </div>

            <p className="mb-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
              By project
            </p>
            <ul className="min-h-0 flex-1 divide-y divide-[#eef2f7] overflow-y-auto">
              {(budget?.projects || []).slice(0, 6).map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/projects/${row.id}/overview`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-[#f8fafc]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13px] font-medium text-[#0f172a]">
                          {row.name}
                        </p>
                        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#475569]">
                          {row.utilization != null
                            ? `${Math.round(row.utilization)}%`
                            : '—'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              (row.utilization || 0) > 100
                                ? 'bg-red-400'
                                : 'bg-[#2563eb]',
                            )}
                            style={{
                              width: `${Math.min(100, Math.max(0, Math.round(row.utilization || 0)))}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-[10.5px] tabular-nums text-[#94a3b8]">
                          {formatInr(row.spent)} / {formatInr(row.budget)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              {!budget?.projects?.length && (
                <li className="py-6 text-center text-sm text-[#94a3b8]">
                  No budget rows yet
                </li>
              )}
            </ul>
          </div>
        </Panel>
      </div>

      {/* Materials + Vendors + Activity — compact equal height with scroll */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="flex h-[360px] flex-col"
          icon={Truck}
          title="Materials summary"
          subtitle="BOQ to purchase-order coverage"
          action={
            <Link
              to="/procurement"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Materials
            </Link>
          }
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f8fafc] p-3">
                <p className="text-[11px] font-medium text-[#64748b]">
                  Approved BOQ lines
                </p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-[#0f172a]">
                  {d?.materials?.approvedBoqLines ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-[#f8fafc] p-3">
                <p className="text-[11px] font-medium text-[#64748b]">PO lines</p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-[#0f172a]">
                  {d?.materials?.poLines ?? 0}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="text-[#64748b]">BOQ → PO coverage</span>
                <span className="font-semibold tabular-nums text-[#0f172a]">
                  {d?.materials?.coveragePct != null
                    ? `${d.materials.coveragePct}%`
                    : '—'}
                </span>
              </div>
              <ProgressBar value={d?.materials?.coveragePct || 0} />
            </div>
            <ul className="space-y-1">
              {(d?.materials?.poStatus || []).map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] odd:bg-[#fafcfe]"
                >
                  <span className="text-[#64748b]">{row.label}</span>
                  <span className="font-semibold tabular-nums text-[#0f172a]">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
            {d?.materials?.note && (
              <p className="text-[10px] leading-relaxed text-[#94a3b8]">
                {d.materials.note}
              </p>
            )}
          </div>
        </Panel>

        <Panel
          className="flex h-[360px] flex-col"
          icon={Store}
          title="Top vendors"
          subtitle="Ranked by PO value in range"
          action={
            <Link
              to="/procurement"
              className="text-[12px] font-semibold text-[#2563eb] hover:underline"
            >
              Vendors
            </Link>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
              {(d?.topVendors || []).map((vendor, idx) => {
                const maxValue = Math.max(
                  ...(d?.topVendors || []).map((v) => v.value || 0),
                  1,
                )
                const share = Math.round(((vendor.value || 0) / maxValue) * 100)
                return (
                  <li
                    key={vendor.id}
                    className="rounded-xl px-2 py-2.5 transition hover:bg-[#f8fafc]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white shadow-sm',
                          idx === 0
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                            : idx === 1
                              ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                              : 'bg-gradient-to-br from-blue-400 to-indigo-600',
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-[#0f172a]">
                            {vendor.name}
                          </p>
                          <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#0f172a]">
                            {formatInr(vendor.value)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
                            <div
                              className="h-full rounded-full bg-[#2563eb]"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-[10.5px] text-[#94a3b8]">
                            {vendor.poCount} POs
                            {vendor.deliveryRate != null
                              ? ` · ${vendor.deliveryRate}% delivered`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
              {!d?.topVendors?.length && (
                <li className="py-8 text-center text-sm text-[#94a3b8]">
                  No vendor spend yet
                </li>
              )}
            </ul>
            <div className="mt-2 shrink-0 rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-center text-[11px] text-[#64748b]">
              {(d?.topVendors || []).length} vendors ·{' '}
              {formatInr(
                (d?.topVendors || []).reduce((s, v) => s + (v.value || 0), 0),
              )}{' '}
              total PO value
            </div>
          </div>
        </Panel>

        <Panel
          className="flex h-[360px] flex-col"
          icon={Activity}
          title="Recent activities"
          subtitle="Latest changes across projects"
          noPadding
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
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
          </div>
        </Panel>
      </div>

      {/* Timeline */}
      <Panel
        icon={ClipboardList}
        title="Project timeline"
        subtitle="Progress, dates, and spend for every project"
        action={
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <Percent className="h-3.5 w-3.5" />
            Live from project data
          </span>
        }
        noPadding
      >
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-y border-[#e8eef5] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                <th className="px-5 py-2.5">Project</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Stage</th>
                <th className="px-3 py-2.5">Start</th>
                <th className="px-3 py-2.5">End</th>
                <th className="px-3 py-2.5">Progress</th>
                <th className="px-5 py-2.5 text-right">Spend / Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {(d?.timeline || []).map((row) => (
                <tr key={row.id} className="transition hover:bg-[#fbfdff]">
                  <td className="px-5 py-3">
                    <Link
                      to={`/projects/${row.id}/overview`}
                      className="font-semibold text-[#0f172a] hover:text-[#2563eb]"
                    >
                      {row.name}
                    </Link>
                    <p className="text-[11px] text-[#94a3b8]">
                      {row.clientName}
                    </p>
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
                      <ProgressBar
                        value={row.progress || 0}
                        className="flex-1"
                      />
                      <span className="w-8 text-right text-[11px] tabular-nums text-[#64748b]">
                        {row.progress || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className="font-semibold text-[#0f172a]">
                      {formatInr(row.spent)}
                    </span>
                    <span className="text-[#94a3b8]">
                      {' '}
                      / {formatInr(row.budget)}
                    </span>
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
                  <p className="truncate font-medium text-[#0f172a]">
                    {row.name}
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{row.clientName}</p>
                </div>
                <StatusChip status={statusTone(row)} />
              </div>
              <p className="mt-2 text-[11px] text-[#64748b]">
                {stageLabel(row.currentStage)} · {formatShortDate(row.startDate)}{' '}
                → {formatShortDate(row.endDate)}
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
      </Panel>
    </div>
  )
}

function StatCard({ to, icon: Icon, tone, label, value, delta, foot }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-[#e0e7f0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.28)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
          {label}
        </p>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            tones[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-[26px] font-semibold tabular-nums tracking-[-0.03em] text-[#0f172a]">
          {value}
        </p>
        {delta && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
              delta.up
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600',
            )}
          >
            {delta.label}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[#64748b]">{foot}</p>
    </Link>
  )
}

function BudgetTile({ label, value, tone }) {
  const tones = {
    blue: 'bg-[#eff6ff] text-[#2563eb]',
    red: 'bg-[#fef2f2] text-[#dc2626]',
    green: 'bg-[#ecfdf5] text-[#059669]',
  }
  return (
    <div className={cn('rounded-xl p-3', tone ? tones[tone] : 'bg-[#f8fafc]')}>
      <p
        className={cn(
          'text-[11px] font-medium',
          tone ? 'opacity-80' : 'text-[#64748b]',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-[17px] font-semibold tabular-nums tracking-[-0.02em]',
          !tone && 'text-[#0f172a]',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Donut({ segments, size = 'md' }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let offset = 0
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const sizeClass =
    size === 'lg' ? 'h-44 w-44 sm:h-48 sm:w-48' : 'h-36 w-36'

  return (
    <svg viewBox="0 0 100 100" className={cn('shrink-0', sizeClass)}>
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#eef2f7"
        strokeWidth="13"
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
            strokeWidth="13"
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
        y="47"
        textAnchor="middle"
        className="fill-[#0f172a]"
        style={{ fontSize: '20px', fontWeight: 700 }}
      >
        {total}
      </text>
      <text
        x="50"
        y="60"
        textAnchor="middle"
        className="fill-[#94a3b8]"
        style={{ fontSize: '7px', fontWeight: 600, letterSpacing: '0.1em' }}
      >
        PROJECTS
      </text>
    </svg>
  )
}

function Panel({ icon: Icon, title, subtitle, action, children, className, noPadding }) {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="text-[13.5px] font-semibold text-[#0f172a]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[10.5px] text-[#94a3b8]">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          noPadding ? '' : 'px-5 pb-5',
        )}
      >
        {children}
      </div>
    </section>
  )
}
