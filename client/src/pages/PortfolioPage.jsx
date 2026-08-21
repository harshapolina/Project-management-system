import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { api } from '../lib/api'
import { stageLabel } from '../lib/format'
import {
  Avatar,
  Button,
  Card,
  KpiCard,
  ProgressBar,
  ProgressRing,
  SkeletonCard,
  StatusChip,
} from '../components/ui'

export function PortfolioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api('/projects/portfolio'),
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const d = data?.data
  const counts = d?.counts || {}
  const healthTotal =
    (d?.health || []).reduce((s, h) => s + h.value, 0) || 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-secondary mb-1">Real-time visibility across all interior projects</p>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none text-primary md:text-[32px]">
            Project Dashboard
          </h1>
        </div>
        <Link to="/projects">
          <Button>View all projects</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total projects" value={counts.total ?? 0} trend="4%" trendUp />
        <KpiCard label="Ongoing" value={counts.ongoing ?? 0} trend="2%" trendUp accentValue />
        <KpiCard label="Completed" value={counts.completed ?? 0} trend="6%" trendUp />
        <KpiCard
          label="Delayed"
          value={counts.delayed ?? 0}
          trend="1"
          trendUp={false}
        />
        <KpiCard label="On hold" value={counts.onHold ?? 0} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Project health</h2>
          <span className="text-xs text-secondary tabular-nums">
            {d?.projects?.length || 0} active
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border">
          {(d?.health || []).map((h) => (
            <div
              key={h.key}
              title={`${h.label}: ${h.value}`}
              style={{
                width: `${(h.value / healthTotal) * 100}%`,
                backgroundColor: h.color,
              }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-secondary">
          {(d?.health || []).map((h) => (
            <span key={h.key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: h.color }}
              />
              {h.label} ({h.value})
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {(d?.projects || []).map((p) => (
            <Link key={p._id} to={`/projects/${p._id}`}>
              <Card
                padding={false}
                hover
                className="overflow-hidden h-full group"
              >
                <div
                  className="relative h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(14,14,16,.92), transparent), url(${p.coverImage})`,
                  }}
                >
                  <div className="on-dark absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-white/70">{p.clientName}</p>
                    </div>
                    <ProgressRing
                      value={p.progress}
                      size={44}
                      stroke={3}
                      trackColor="rgba(255,255,255,0.35)"
                      color="#ffffff"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <StatusChip status={p.status} />
                  <span className="text-xs text-secondary capitalize">
                    {stageLabel(p.currentStage)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          <Card padding={false}>
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-delayed" />
              <h3 className="text-sm font-semibold">Alerts & risks</h3>
            </div>
            <div className="divide-y divide-border">
              {(d?.delayAlerts || []).length === 0 && (
                <p className="px-4 py-6 text-sm text-secondary text-center">
                  No delays — portfolio looks healthy.
                </p>
              )}
              {(d?.delayAlerts || []).map((a) => (
                <Link
                  key={a.id}
                  to={`/projects/${a.id}`}
                  className="block px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    {a.location} · {stageLabel(a.stage)}
                  </p>
                </Link>
              ))}
            </div>
          </Card>

          <Card padding={false}>
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold">Upcoming deadlines</h3>
            </div>
            <div className="divide-y divide-border">
              {(d?.upcomingDeadlines || []).map((t) => (
                <div key={t._id} className="px-4 py-3">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    {t.projectId?.name}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold mb-3">Team workload</h3>
            <div className="space-y-3">
              {(d?.workload || []).map((w) => (
                <div key={w.user._id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar src={w.user.avatar} name={w.user.name} size="xs" />
                      <span className="text-xs font-medium">{w.user.name}</span>
                    </div>
                    <span className="text-[11px] text-secondary tabular-nums">
                      {w.openTasks} open
                    </span>
                  </div>
                  <ProgressBar value={w.load} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
