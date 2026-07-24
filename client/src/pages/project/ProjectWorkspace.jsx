import { useEffect, useState } from 'react'
import { NavLink, Outlet, useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutList,
  Columns3,
  GanttChart,
  CalendarDays,
  Plus,
  Share2,
  Search,
  ChevronRight,
  FileImage,
  FileSpreadsheet,
  Camera,
  Users,
  Trash2,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Button, Modal, Skeleton, toast } from '../../components/ui'
import { cn } from '../../lib/utils'

const VIEWS = [
  { to: 'board', label: 'Board', icon: Columns3 },
  { to: 'tasks', label: 'List', icon: LayoutList },
  { to: 'calendar', label: 'Calendar', icon: CalendarDays },
  { to: 'gantt', label: 'Gantt', icon: GanttChart },
  { to: 'files', label: 'Files', icon: FileImage },
  { to: 'boq', label: 'BOQ', icon: FileSpreadsheet },
  { to: 'site', label: 'Site', icon: Camera },
  { to: 'team', label: 'Team', icon: Users },
]

export function ProjectWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
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
      // Already gone — clean UI anyway
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

  if (isLoading || !project) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Breadcrumbs row */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-[#2e2e32] px-4 text-[12px] text-[#8b8b90]">
        <Link to="/projects" className="hover:text-white">
          Spaces
        </Link>
        <button
          type="button"
          title="New space"
          onClick={() => window.dispatchEvent(new CustomEvent('cubic:new-space'))}
          className="rounded p-0.5 hover:bg-[#252528] hover:text-white"
        >
          <Plus className="h-3 w-3" />
        </button>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <Link to="/projects" className="hover:text-white">
          Projects
        </Link>
        <button
          type="button"
          title="New project"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('cubic:new-project'))
          }
          className="rounded p-0.5 hover:bg-[#252528] hover:text-white"
        >
          <Plus className="h-3 w-3" />
        </button>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span className="font-medium text-white truncate">{project.name}</span>
      </div>

      {/* View tabs + actions — ClickUp exact placement */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-[#2e2e32] px-2">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {VIEWS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'relative flex shrink-0 items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium transition-colors',
                  isActive ? 'text-white' : 'text-[#8b8b90] hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon className="h-3.5 w-3.5 opacity-80" strokeWidth={1.75} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-[var(--tab-underline)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Delete project"
            onClick={() => setConfirmDelete(true)}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-[#8b8b90] hover:bg-red-500/15 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href)
                toast('Project link copied', { type: 'success' })
              } catch {
                toast('Could not copy link', { type: 'error' })
              }
            }}
            className="ml-1 flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-[#c5c5c8] hover:bg-[#1c1c1e]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet context={{ project, stats: data?.stats }} />
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => !remove.isPending && setConfirmDelete(false)}
        title="Delete project?"
        size="sm"
      >
        <p className="text-sm text-secondary">
          Delete <span className="font-medium text-white">{project.name}</span>?
          This removes the project and its tasks. This cannot be undone.
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

/** Shared ClickUp-style filter bar used above list content */
export function ClickUpListToolbar({ onAddTask, search, onSearch }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#2e2e32] px-3">
      <div className="relative ml-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b6b70]" />
        <input
          value={search || ''}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="Search…"
          className="h-7 w-36 rounded-md border border-transparent bg-transparent pl-7 pr-2 text-[12px] outline-none placeholder:text-[#6b6b70] hover:border-[#2e2e32] focus:border-[#2e2e32] focus:bg-[#1c1c1e]"
        />
      </div>
      <div className="ml-auto">
        <button
          type="button"
          onClick={onAddTask}
          className="flex h-7 items-center gap-1 rounded-md bg-accent px-2.5 text-[12px] font-semibold text-[#0E0E10] hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Task
        </button>
      </div>
    </div>
  )
}
