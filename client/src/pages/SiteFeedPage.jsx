import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Building2,
  Camera,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
} from 'lucide-react'
import { api } from '../lib/api'
import { Skeleton, Avatar } from '../components/ui'
import { cn } from '../lib/utils'

export function SiteFeedPage() {
  const [selectedProject, setSelectedProject] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['site-updates-feed'],
    queryFn: () => api('/site-updates'),
  })
  const { data: projectsData } = useQuery({
    queryKey: ['projects-site-feed'],
    queryFn: () => api('/projects'),
  })
  const updates = data?.updates || data?.data || []
  const projects = projectsData?.projects || []

  const projectGroups = useMemo(() => {
    const groups = new Map()

    for (const project of projects) {
      groups.set(String(project._id), {
        id: String(project._id),
        name: project.name,
        location: project.location || '',
        status: project.status,
        coverImage: project.coverImage || '',
        updates: [],
      })
    }

    for (const update of updates) {
      const project =
        typeof update.projectId === 'object' ? update.projectId : null
      const id = String(project?._id || update.projectId || 'unassigned')
      if (!groups.has(id)) {
        groups.set(id, {
          id,
          name: project?.name || update.projectName || 'Other updates',
          location: project?.location || '',
          status: project?.status || '',
          coverImage: project?.coverImage || '',
          updates: [],
        })
      }
      groups.get(id).updates.push(update)
    }

    return [...groups.values()]
      .filter((group) => group.updates.length > 0)
      .sort((a, b) => {
        const aTime = new Date(a.updates[0]?.createdAt || 0).getTime()
        const bTime = new Date(b.updates[0]?.createdAt || 0).getTime()
        return bTime - aTime
      })
  }, [projects, updates])

  const visibleGroups =
    selectedProject === 'all'
      ? projectGroups
      : projectGroups.filter((group) => group.id === selectedProject)

  return (
    <div className="min-h-full bg-[var(--bg-canvas)]">
      <div className="mx-auto max-w-[1320px] space-y-5 p-4 md:p-6 lg:p-8">
        <section className="on-dark overflow-hidden rounded-[22px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] px-6 py-6 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.4)] md:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--create-fg)]">
                <Radio className="h-3 w-3" />
                Live field activity
              </div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white md:text-[34px]">
                Site updates by project
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] text-white/55">
                Follow progress, notes, and recent activity without mixing
                updates from different sites.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-2xl font-semibold leading-none text-[var(--text-primary)]">
                  {projectGroups.length}
                </p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Active sites
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-2xl font-semibold leading-none text-[var(--text-primary)]">
                  {updates.length}
                </p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Updates
                </p>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-[22px]" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="on-dark flex flex-col items-center rounded-[22px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] py-16 text-center shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-white/40">
              <Camera className="h-7 w-7" />
            </span>
            <p className="mt-4 text-sm font-semibold text-white">
              No site updates yet
            </p>
            <p className="mt-1 text-xs text-white/45">
              Post updates from a project&apos;s Site tab or Site mode.
            </p>
          </div>
        ) : (
          <>
            <section className="on-dark rounded-full border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] p-1.5 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]">
              <div className="flex gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedProject('all')}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition',
                    selectedProject === 'all'
                      ? 'bg-accent text-[#171717] shadow-sm'
                      : 'text-secondary hover:text-primary',
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  All projects
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9px]',
                      selectedProject === 'all'
                        ? 'bg-black/10 text-[#171717]'
                        : 'bg-surface-raised text-secondary',
                    )}
                  >
                    {updates.length}
                  </span>
                </button>
                {projectGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedProject(group.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition',
                      selectedProject === group.id
                        ? 'bg-accent text-[#171717] shadow-sm'
                        : 'text-secondary hover:text-primary',
                    )}
                  >
                    {group.name}
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[9px]',
                        selectedProject === group.id
                          ? 'bg-black/10 text-[#171717]'
                          : 'bg-surface-raised text-secondary',
                      )}
                    >
                      {group.updates.length}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid items-start gap-5 lg:grid-cols-2">
              {visibleGroups.map((group) => (
                <section
                  key={group.id}
                  className="on-dark overflow-hidden rounded-[20px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]"
                >
                  <div className="relative border-b border-white/[0.06] bg-[var(--panel-dark-raised)] px-5 py-4">
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-[15px] font-semibold text-white">
                            {group.name}
                          </h2>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/45">
                            {group.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {group.location}
                              </span>
                            )}
                            <span>
                              {group.updates.length} update
                              {group.updates.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {group.id !== 'unassigned' && (
                        <Link
                          to={`/projects/${group.id}/site`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.08] px-3 py-2 text-[10px] font-semibold text-white/80 ring-1 ring-white/[0.08] transition hover:bg-[var(--accent)]/15 hover:text-[var(--accent)]"
                        >
                          Open site
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[420px] divide-y divide-white/[0.06] overflow-y-auto px-5">
                    {group.updates.map((update) => {
                      const author =
                        typeof update.author === 'object'
                          ? update.author
                          : update.createdBy
                      return (
                        <article key={update._id} className="flex gap-3 py-4">
                          <Avatar
                            src={author?.avatar}
                            name={author?.name || 'Site'}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-white/80">
                                {author?.name || 'Site team'}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[9px] text-white/40">
                                <Clock3 className="h-3 w-3" />
                                {update.createdAt
                                  ? format(
                                      new Date(update.createdAt),
                                      'dd MMM, h:mm a',
                                    )
                                  : ''}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-white/65">
                              {update.note ||
                                update.message ||
                                update.title ||
                                'Update posted'}
                            </p>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
