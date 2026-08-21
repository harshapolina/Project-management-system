import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  LayoutList,
  Share2,
  ChevronRight,
  FileImage,
  Camera,
  Send,
  StickyNote,
  Users,
  Trash2,
  Truck,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { Button, Modal, Skeleton, toast } from '../../components/ui'
import { cn } from '../../lib/utils'
import {
  PILL_ACTIVE,
  PILL_IDLE,
  PILL_TRACK,
} from '../../components/layout/PageToolbar'
import { stageLabel } from '../../lib/format'
import { whatsappLink } from '../../lib/phone'
import { capabilitiesForUser } from '../../lib/roles'

/** Only what an interior studio needs inside a project */
const MAIN_TABS = [
  { to: 'overview', label: 'Home', icon: LayoutDashboard, capability: 'overview' },
  { to: 'tasks', label: 'Tasks', icon: LayoutList, capability: 'tasks' },
  { to: 'procurement', label: 'Materials', icon: Truck, capability: 'procurement' },
  { to: 'site', label: 'Site', icon: Camera, capability: 'site' },
  { to: 'notes', label: 'Notes', icon: StickyNote, capability: 'overview' },
  { to: 'files', label: 'Drawings', icon: FileImage, capability: 'files' },
  { to: 'team', label: 'Team', icon: Users, capability: 'team' },
]

export function ProjectWorkspace() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api(`/projects/${id}`),
    retry: (count, err) => (err?.status === 404 ? false : count < 1),
  })

  const bustProjectCaches = (projectId) => {
    qc.setQueryData(['projects-nav'], (old) => {
      if (!old?.projects) return old
      return {
        ...old,
        projects: old.projects.filter((p) => String(p._id) !== String(projectId)),
      }
    })
    qc.setQueriesData({ queryKey: ['projects'] }, (old) => {
      if (!old?.projects) return old
      return {
        ...old,
        projects: old.projects.filter((p) => String(p._id) !== String(projectId)),
      }
    })
    qc.removeQueries({ queryKey: ['project', projectId] })
    qc.invalidateQueries({ queryKey: ['projects-nav'] })
    qc.invalidateQueries({ queryKey: ['projects'] })
    qc.invalidateQueries({ queryKey: ['home'] })
    qc.invalidateQueries({ queryKey: ['portfolio'] })
  }

  const remove = useMutation({
    mutationFn: () => api(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Project deleted', { type: 'success' })
      bustProjectCaches(id)
      setConfirmDelete(false)
      navigate('/projects', { replace: true })
    },
    onError: (e) => {
      if (e.status === 404) {
        bustProjectCaches(id)
        toast('Project was already deleted', { type: 'success' })
        navigate('/projects', { replace: true })
        return
      }
      toast(e.message, { type: 'error' })
    },
  })

  useEffect(() => {
    if (isError && error?.status === 404) {
      bustProjectCaches(id)
      navigate('/projects', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error?.status, id])

  const project = data?.project
  const caps = capabilitiesForUser(user, tenant)
  const visibleTabs = useMemo(
    () => MAIN_TABS.filter((tab) => caps.projectTabs[tab.capability]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.role, user?.isPlatformAdmin, user?.permissions, tenant?.customRoles],
  )
  const canManageProject = caps.manageProjects

  useEffect(() => {
    if (!project || !visibleTabs.length) return
    const segment = location.pathname.split('/').pop()
    const allowed = visibleTabs.some((t) => t.to === segment)
    if (!allowed) {
      navigate(`/projects/${id}/${visibleTabs[0].to}`, { replace: true })
    }
  }, [project, visibleTabs, location.pathname, id, navigate])

  if (isLoading || !project) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-canvas)] print:h-auto print:overflow-visible">
      <header className="shrink-0 border-b border-border/80 bg-surface/90 backdrop-blur-md print:hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[11px] text-secondary">
              <Link to="/projects" className="hover:text-primary">
                All projects
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate">{project.name}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="truncate text-[20px] font-semibold tracking-tight text-primary">
                {project.name}
              </h1>
              <p className="truncate text-[12px] text-secondary">
                {project.clientName}
                {project.location ? ` · ${project.location}` : ''}
                {' · '}
                <span className="font-medium text-primary">
                  {stageLabel(project.currentStage)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {canManageProject && (
              <button
                type="button"
                title="Delete project"
                onClick={() => setConfirmDelete(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-secondary hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href)
                  toast('Link copied', { type: 'success' })
                } catch {
                  toast('Could not copy link', { type: 'error' })
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[12px] font-semibold text-secondary hover:bg-black/[0.03] hover:text-primary"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              title={
                project.clientPhone
                  ? `WhatsApp ${project.clientName} · ${project.clientPhone}`
                  : 'Add the client phone number to enable WhatsApp'
              }
              onClick={() => {
                const url = whatsappLink(
                  project.clientPhone,
                  `Hi ${project.clientName}, regarding your project "${project.name}" —`,
                )
                if (!url) {
                  toast('No client phone number saved for this project', {
                    type: 'error',
                  })
                  return
                }
                window.open(url, '_blank', 'noopener')
              }}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[#171717] shadow-sm transition',
                project.clientPhone
                  ? 'bg-[#3ecf8e] hover:bg-[#24b47e]'
                  : 'bg-[#c7f0d8] hover:bg-[#b5e9cb]',
              )}
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>

        <nav className="px-4 pb-3 sm:px-5">
          <div className={cn(PILL_TRACK, 'max-w-full overflow-x-auto')}>
            {visibleTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition',
                    isActive ? PILL_ACTIVE : PILL_IDLE,
                  )
                }
              >
                <tab.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
        <Outlet context={{ project, stats: data?.stats }} />
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => !remove.isPending && setConfirmDelete(false)}
        title="Delete this project?"
        size="sm"
      >
        <p className="text-sm text-secondary">
          Delete <span className="font-medium">{project.name}</span>? This cannot
          be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={remove.isPending}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
