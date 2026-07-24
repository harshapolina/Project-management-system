import { useOutletContext, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { formatInr, stageLabel } from '../../lib/format'
import { Card, ProgressBar, StatusChip } from '../../components/ui'

export function ProjectOverview() {
  const { project, stats } = useOutletContext()

  return (
    <div className="space-y-4">
      {(project.isDelayed || project.status === 'delayed') && (
        <div className="rounded-[16px] border border-status-delayed/40 bg-status-delayed/10 px-5 py-4 text-sm text-status-delayed">
          This project is behind schedule. Review delayed tasks and procurement
          ETAs in the Tasks and Procurement tabs.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-secondary mb-2">Timeline</p>
          <p className="text-sm font-semibold">
            {project.startDate
              ? format(new Date(project.startDate), 'dd MMM yyyy')
              : '—'}
            {' → '}
            {project.endDate
              ? format(new Date(project.endDate), 'dd MMM yyyy')
              : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-secondary mb-2">Budget vs spent</p>
          <p className="text-lg font-semibold tabular-nums text-accent">
            {formatInr(project.spent)}
            <span className="text-secondary text-sm font-normal">
              {' '}
              / {formatInr(project.budget)}
            </span>
          </p>
          <ProgressBar
            className="mt-3"
            value={stats?.budgetVsSpent?.pct || 0}
          />
        </Card>
        <Card>
          <p className="text-xs text-secondary mb-2">Open tasks</p>
          <p className="text-[28px] font-semibold tabular-nums leading-none">
            {stats?.openTasks ?? 0}
          </p>
          <Link to="tasks" className="text-xs text-accent mt-2 inline-block">
            View tasks →
          </Link>
        </Card>
        <Card>
          <p className="text-xs text-secondary mb-2">Pending approvals</p>
          <p className="text-[28px] font-semibold tabular-nums leading-none">
            {stats?.pendingApprovals ?? 0}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Stage tracker</h3>
          <div className="space-y-3">
            {(project.stages || []).map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{s.label || stageLabel(s.key)}</span>
                  <StatusChip status={s.status} />
                </div>
                <ProgressBar value={s.progress} />
              </div>
            ))}
          </div>
        </Card>
        <Card variant="light">
          <h3 className="text-sm font-semibold text-on-light mb-2">About</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {project.description ||
              `${project.name} for ${project.clientName}. Currently in ${stageLabel(project.currentStage)}.`}
          </p>
          {stats?.latestActivity && (
            <p className="mt-4 text-xs text-zinc-500">
              Latest: {stats.latestActivity.message}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
