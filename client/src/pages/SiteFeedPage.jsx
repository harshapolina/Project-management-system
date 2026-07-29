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
    <div className="min-h-full bg-[#eef3f8]">
      <div className="mx-auto max-w-[1320px] space-y-5 p-4 md:p-6 lg:p-8">
        <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#12385b] via-[#174d78] to-[#1d648f] px-6 py-6 text-white shadow-[0_18px_50px_rgba(18,56,91,0.18)] md:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                <Radio className="h-3 w-3" />
                Live field activity
              </div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] md:text-[34px]">
                Site updates by project
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] text-blue-100/80">
                Follow progress, notes, and recent activity without mixing
                updates from different sites.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-semibold leading-none">
                  {projectGroups.length}
                </p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-blue-100/70">
                  Active sites
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-semibold leading-none">
                  {updates.length}
                </p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-blue-100/70">
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
          <div className="flex flex-col items-center rounded-[24px] border border-[#dce5ef] bg-white py-16 text-center shadow-sm">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <Camera className="h-7 w-7 text-blue-600" />
            </span>
            <p className="mt-4 text-sm font-semibold text-[#12324f]">
              No site updates yet
            </p>
            <p className="mt-1 text-xs text-[#7c8fa2]">
              Post updates from a project&apos;s Site tab or Site mode.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-[22px] border border-[#dce5ef] bg-white p-3 shadow-[0_8px_28px_rgba(15,42,67,0.05)]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedProject('all')}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition',
                    selectedProject === 'all'
                      ? 'bg-[#174d78] text-white shadow-sm'
                      : 'bg-[#f3f6f9] text-[#5d7185] hover:bg-[#e9eff5]',
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  All projects
                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px]">
                    {updates.length}
                  </span>
                </button>
                {projectGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedProject(group.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition',
                      selectedProject === group.id
                        ? 'bg-[#174d78] text-white shadow-sm'
                        : 'bg-[#f3f6f9] text-[#5d7185] hover:bg-[#e9eff5]',
                    )}
                  >
                    {group.name}
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[9px]">
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
                  className="overflow-hidden rounded-[24px] border border-[#dce5ef] bg-white shadow-[0_12px_38px_rgba(15,42,67,0.07)]"
                >
                  <div className="relative overflow-hidden border-b border-[#e5ecf3] bg-gradient-to-r from-[#f5f9fd] to-white px-5 py-4">
                    <div className="absolute right-4 top-0 h-24 w-24 rounded-full bg-blue-100/50 blur-2xl" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#174d78] text-white shadow-sm">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-[15px] font-semibold text-[#12324f]">
                            {group.name}
                          </h2>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#7b8fa2]">
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
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-[10px] font-semibold text-[#175f9d] ring-1 ring-[#d7e5f2] transition hover:bg-blue-50"
                        >
                          Open site
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[420px] divide-y divide-[#edf1f5] overflow-y-auto px-5">
                    {group.updates.map((update) => {
                      const author =
                        typeof update.author === 'object'
                          ? update.author
                          : update.createdBy
                      return (
                        <article
                          key={update._id}
                          className="flex gap-3 py-4"
                        >
                          <Avatar
                            src={author?.avatar}
                            name={author?.name || 'Site'}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-[#36516b]">
                                {author?.name || 'Site team'}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[9px] text-[#91a0af]">
                                <Clock3 className="h-3 w-3" />
                                {update.createdAt
                                  ? format(
                                      new Date(update.createdAt),
                                      'dd MMM, h:mm a',
                                    )
                                  : ''}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-[#334e68]">
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
