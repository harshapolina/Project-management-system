import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { format, isPast, isToday } from 'date-fns'
import {
  Plus,
  Search,
  Circle,
  CheckCircle2,
  ChevronDown,
  Calendar,
  User,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { capabilitiesForUser } from '../../lib/roles'
import { toast } from '../../components/ui'
import { TaskDetailPanel } from './TaskDetailPanel'
import { cn } from '../../lib/utils'
import {
  getTaskStatus,
  nextTaskStatus,
} from '../../lib/taskStatus'

const GROUPS = [
  {
    key: 'todo',
    label: 'Not started',
    hint: 'Waiting to begin',
    dot: 'bg-slate-400',
    tint: 'bg-slate-50',
    ring: 'ring-slate-200',
  },
  {
    key: 'in_progress',
    label: 'Working on it',
    hint: 'Happening now',
    dot: 'bg-blue-500',
    tint: 'bg-blue-50',
    ring: 'ring-blue-100',
  },
  {
    key: 'review',
    label: 'Needs check',
    hint: 'Ready for review',
    dot: 'bg-amber-500',
    tint: 'bg-amber-50',
    ring: 'ring-amber-100',
  },
  {
    key: 'done',
    label: 'Finished',
    hint: 'Done',
    dot: 'bg-emerald-500',
    tint: 'bg-emerald-50',
    ring: 'ring-emerald-100',
  },
]

const PRIORITY = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Normal', className: 'bg-slate-100 text-slate-600' },
  low: { label: 'Low', className: 'bg-slate-50 text-slate-500' },
}

function dueLabel(dueDate) {
  if (!dueDate) return { text: 'No date', className: 'text-[#94a3b8]' }
  const d = new Date(dueDate)
  const text = format(d, 'dd MMM')
  if (isToday(d)) return { text: `Today`, className: 'text-blue-700 font-bold' }
  if (isPast(d)) return { text: `Late · ${text}`, className: 'text-red-600 font-bold' }
  return { text, className: 'text-[#475569]' }
}

export function ProjectTasks() {
  const { id } = useParams()
  const { project } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStatus, setCreateStatus] = useState('todo')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [filter, setFilter] = useState('open')
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
  })
  const users = usersData?.users || []

  useEffect(() => {
    const taskFromUrl = searchParams.get('task')
    if (taskFromUrl) setSelectedId(taskFromUrl)
  }, [searchParams])

  const closeTask = () => {
    setSelectedId(null)
    if (searchParams.has('task')) {
      const next = new URLSearchParams(searchParams)
      next.delete('task')
      setSearchParams(next, { replace: true })
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api(`/tasks?projectId=${id}`),
  })

  const tasks = useMemo(() => {
    let list = data?.tasks || []
    if (filter === 'open') list = list.filter((t) => t.status !== 'done')
    if (filter === 'done') list = list.filter((t) => t.status === 'done')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => t.title?.toLowerCase().includes(q))
    }
    return list
  }, [data?.tasks, search, filter])

  const patch = useMutation({
    mutationFn: ({ taskId, body }) =>
      api(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['home'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(GROUPS.map((g) => [g.key, []]))
    for (const t of tasks) {
      const k = map[t.status] ? t.status : 'todo'
      map[k].push(t)
    }
    return map
  }, [tasks])

  const allTasks = data?.tasks || []
  const counts = {
    open: allTasks.filter((t) => t.status !== 'done').length,
    done: allTasks.filter((t) => t.status === 'done').length,
    late: allTasks.filter(
      (t) =>
        t.status !== 'done' &&
        t.dueDate &&
        isPast(new Date(t.dueDate)) &&
        !isToday(new Date(t.dueDate)),
    ).length,
  }

  if (isLoading) {
    return <div className="m-3 h-40 animate-pulse rounded-xl bg-[#e2e8f0]" />
  }

  const visibleGroups =
    filter === 'open'
      ? GROUPS.filter((g) => g.key !== 'done')
      : filter === 'done'
        ? GROUPS.filter((g) => g.key === 'done')
        : GROUPS

  const gridClass =
    filter === 'all'
      ? 'grid-cols-1 sm:grid-cols-2'
      : filter === 'done'
        ? 'grid-cols-1 max-w-2xl'
        : 'grid-cols-1 lg:grid-cols-3'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#E8EEF5]">
      {/* Single packed toolbar — filters sit with actions, no empty stretch */}
      <div className="shrink-0 border-b border-[#d0dbe8] bg-white px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="shrink-0 text-[13px] font-semibold text-[#0f172a]">
            Who does what
          </h2>

          <div className="inline-flex rounded-lg bg-[#f1f5f9] p-0.5">
            {[
              { id: 'open', label: 'Active', count: counts.open },
              { id: 'done', label: 'Finished', count: counts.done },
              { id: 'all', label: 'All', count: allTasks.length },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition',
                  filter === f.id
                    ? 'bg-white text-[#0f172a] shadow-sm'
                    : 'text-[#64748b] hover:text-[#334155]',
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'tabular-nums',
                    filter === f.id ? 'text-[#2563eb]' : 'text-[#94a3b8]',
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {counts.late > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-100">
              Late {counts.late}
            </span>
          )}

          <div className="flex flex-1 items-center justify-end gap-1.5 min-w-[140px]">
            <div className="relative min-w-0 flex-1 max-w-[200px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find…"
                className="h-8 w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] pl-7 pr-2 text-[12px] outline-none focus:border-[#93c5fd] focus:bg-white"
              />
            </div>
            {caps.createTask && (
              <button
                type="button"
                onClick={() => {
                  setCreateStatus('todo')
                  setCreateOpen(true)
                }}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#2563eb] px-2.5 text-[12px] font-semibold text-white hover:bg-[#1d4ed8]"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2.5 sm:p-3">
        <div className={cn('grid gap-2.5', gridClass)}>
          {visibleGroups.map((g) => {
            const list = byStatus[g.key] || []
            const closed = collapsed[g.key]
            return (
              <section
                key={g.key}
                className={cn(
                  'flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#cfdceb] bg-white shadow-sm ring-1',
                  g.ring,
                  filter === 'all' && 'min-h-[180px]',
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((s) => ({ ...s, [g.key]: !s[g.key] }))
                  }
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left',
                    g.tint,
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-[#64748b] transition',
                      closed && '-rotate-90',
                    )}
                  />
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', g.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-[#0f172a]">
                      {g.label}
                    </p>
                    <p className="text-[10px] text-[#94a3b8]">{g.hint}</p>
                  </div>
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#334155] ring-1 ring-[#e2e8f0]">
                    {list.length}
                  </span>
                </button>

                {!closed && (
                  <div className="flex flex-1 flex-col divide-y divide-[#eef2f7]">
                    {list.length === 0 && (
                      <p className="px-3 py-6 text-center text-[11px] text-[#94a3b8]">
                        Nothing here yet
                      </p>
                    )}
                    {list.map((t) => (
                      <TaskCard
                        key={t._id}
                        task={t}
                        users={users}
                        canManage={caps.manageTasks}
                        onOpen={() => setSelectedId(t._id)}
                        onPatch={(body) =>
                          patch.mutate({ taskId: t._id, body })
                        }
                      />
                    ))}
                    {caps.createTask && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreateStatus(g.key === 'done' ? 'todo' : g.key)
                          setCreateOpen(true)
                        }}
                        className="mt-auto flex w-full items-center justify-center gap-1 py-2 text-[11px] font-semibold text-[#2563eb] hover:bg-[#f8fafc]"
                      >
                        <Plus className="h-3 w-3" />
                        Add task
                      </button>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      <TaskDetailPanel
        open={createOpen}
        mode="create"
        projectId={id}
        projectName={project?.name}
        initialStatus={createStatus}
        onClose={() => setCreateOpen(false)}
        onCreated={(task) => {
          setCreateOpen(false)
          if (task?._id) setSelectedId(task._id)
          qc.invalidateQueries({ queryKey: ['tasks', id] })
          qc.invalidateQueries({ queryKey: ['home'] })
        }}
      />
      <TaskDetailPanel
        open={!!selectedId}
        mode="edit"
        taskId={selectedId}
        projectId={id}
        projectName={project?.name}
        onClose={closeTask}
      />
    </div>
  )
}

function TaskCard({ task, users, canManage, onOpen, onPatch }) {
  const status = task.status || 'todo'
  const statusMeta = getTaskStatus(status)
  const next = nextTaskStatus(status)
  const done = status === 'done'
  const assigneeId = task.assignee?._id || task.assignee || ''
  const due = dueLabel(task.dueDate)
  const pri = PRIORITY[task.priority] || PRIORITY.medium

  return (
    <div className="px-2.5 py-2 hover:bg-[#f8fafc]">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onPatch({ status: next.value })}
          className="mt-0.5 shrink-0"
          title={`${statusMeta.shortLabel} → ${next.shortLabel}`}
          aria-label={`Advance status to ${next.shortLabel}`}
        >
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : status === 'in_progress' ? (
            <Circle
              className="h-4 w-4 fill-blue-500/25 text-blue-500"
              strokeWidth={2.5}
            />
          ) : status === 'review' ? (
            <Circle
              className="h-4 w-4 fill-amber-500/30 text-amber-500"
              strokeWidth={2.5}
            />
          ) : (
            <Circle className="h-4 w-4 text-[#94a3b8]" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              'block w-full text-left text-[13px] font-semibold leading-snug text-[#0f172a] hover:text-[#2563eb]',
              done && 'font-medium text-[#94a3b8] line-through',
            )}
          >
            {task.title}
          </button>

          <div className="mt-1.5 flex flex-nowrap items-center gap-1 overflow-x-auto">
            <label className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#f1f5f9] px-1.5 py-0.5">
              <User className="h-3 w-3 shrink-0 text-[#94a3b8]" />
              <select
                value={assigneeId}
                disabled={!canManage}
                onChange={(e) =>
                  onPatch({ assignee: e.target.value || null })
                }
                className="max-w-[72px] truncate bg-transparent text-[10px] font-semibold text-[#334155] outline-none"
              >
                <option value="">Anyone</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name?.split(' ')[0] || u.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#f1f5f9] px-1.5 py-0.5">
              <Calendar className="h-3 w-3 shrink-0 text-[#94a3b8]" />
              <input
                type="date"
                disabled={!canManage}
                value={
                  task.dueDate
                    ? format(new Date(task.dueDate), 'yyyy-MM-dd')
                    : ''
                }
                onChange={(e) =>
                  onPatch({
                    dueDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className={cn(
                  'w-[78px] bg-transparent text-[10px] font-semibold outline-none',
                  due.className,
                )}
                title={due.text}
              />
            </label>

            <select
              value={task.priority || 'medium'}
              disabled={!canManage}
              onChange={(e) => onPatch({ priority: e.target.value })}
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold outline-none',
                pri.className,
              )}
            >
              {Object.entries(PRIORITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            <select
              value={task.status || 'todo'}
              onChange={(e) => onPatch({ status: e.target.value })}
              className="shrink-0 rounded-md bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#1d4ed8] outline-none"
            >
              {GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
