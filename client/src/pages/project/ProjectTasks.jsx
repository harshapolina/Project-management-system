import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Flag,
  MessageSquare,
  Calendar as CalIcon,
  Circle,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar, toast } from '../../components/ui'
import { ClickUpListToolbar } from './ProjectWorkspace'
import { TaskDetailPanel } from './TaskDetailPanel'
import { cn } from '../../lib/utils'

const BOARD = [
  { key: 'todo', label: 'TO DO' },
  { key: 'in_progress', label: 'IN PROGRESS' },
  { key: 'review', label: 'REVIEW' },
  { key: 'done', label: 'DONE' },
]

const PRIORITY_COLOR = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b6b70',
}

export function ProjectTasks({ forcedView }) {
  const { id } = useParams()
  const { project } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState(forcedView || 'list')
  const [selectedId, setSelectedId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStatus, setCreateStatus] = useState('todo')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const qc = useQueryClient()

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
  })
  const users = usersData?.users || []

  useEffect(() => {
    if (forcedView) setView(forcedView)
  }, [forcedView])

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
    const list = data?.tasks || []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((t) => t.title?.toLowerCase().includes(q))
  }, [data?.tasks, search])

  const patch = useMutation({
    mutationFn: ({ taskId, body }) =>
      api(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['home'] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const byStatus = useMemo(() => {
    const map = {}
    for (const col of BOARD) map[col.key] = []
    for (const t of tasks) {
      const k = map[t.status] ? t.status : 'todo'
      map[k].push(t)
    }
    return map
  }, [tasks])

  const panel = (
    <>
      <TaskDetailPanel
        open={createOpen}
        mode="create"
        projectId={id}
        projectName={project?.name}
        initialStatus={createStatus}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
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
    </>
  )

  if (isLoading) {
    return <div className="h-40 animate-pulse bg-[#1c1c1e]" />
  }

  if (view === 'board') {
    return (
      <BoardView
        byStatus={byStatus}
        search={search}
        onSearch={setSearch}
        onAddTask={(status) => {
          setCreateStatus(status || 'todo')
          setCreateOpen(true)
        }}
        onOpenTask={(taskId) => setSelectedId(taskId)}
        onMoveTask={(taskId, status) => {
          if (!taskId || !status) return
          const task = tasks.find((t) => t._id === taskId)
          if (!task || task.status === status) return
          // Optimistic UI
          qc.setQueryData(['tasks', id], (old) => {
            if (!old?.tasks) return old
            return {
              ...old,
              tasks: old.tasks.map((t) =>
                t._id === taskId ? { ...t, status } : t,
              ),
            }
          })
          patch.mutate({ taskId, body: { status } })
        }}
        panel={panel}
      />
    )
  }

  if (view === 'gantt') {
    return (
      <div>
        <ClickUpListToolbar
          onAddTask={() => {
            setCreateStatus('todo')
            setCreateOpen(true)
          }}
          search={search}
          onSearch={setSearch}
        />
        <div className="p-4">
          <GanttView
            tasks={tasks}
            onSelect={(t) => setSelectedId(t._id)}
            onReschedule={(taskId, dueDate) =>
              patch.mutate({ taskId, body: { dueDate } })
            }
          />
        </div>
        {panel}
      </div>
    )
  }

  if (view === 'calendar') {
    return (
      <div>
        <ClickUpListToolbar
          onAddTask={() => {
            setCreateStatus('todo')
            setCreateOpen(true)
          }}
          search={search}
          onSearch={setSearch}
        />
        <div className="p-4">
          <CalendarView tasks={tasks} onSelect={(t) => setSelectedId(t._id)} />
        </div>
        {panel}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ClickUpListToolbar
        onAddTask={() => setCreateOpen(true)}
        search={search}
        onSearch={setSearch}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[minmax(220px,1fr)_120px_130px_100px_130px_44px] items-center gap-0 border-b border-[#2e2e32] px-3 py-1.5 text-[11px] font-medium text-[#6b6b70]">
            <div className="pl-7">Name</div>
            <div>Assignee</div>
            <div>Due date</div>
            <div>Priority</div>
            <div>Status</div>
            <div className="text-center">
              <MessageSquare className="mx-auto h-3 w-3" />
            </div>
          </div>

          {BOARD.map((col) => {
            const list = byStatus[col.key] || []
            const isCollapsed = collapsed[col.key]
            return (
              <div key={col.key} className="border-b border-[#2e2e32]/60">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((s) => ({ ...s, [col.key]: !s[col.key] }))
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#1c1c1e]/80"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-[#8b8b90]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#8b8b90]" />
                  )}
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white"
                    style={{
                      background:
                        col.key === 'todo'
                          ? '#3a3a3e'
                          : col.key === 'done'
                            ? '#065f46'
                            : col.key === 'in_progress'
                              ? '#1e3a5f'
                              : '#3b2f1a',
                    }}
                  >
                    {col.label}
                  </span>
                  <span className="text-[12px] text-[#6b6b70]">{list.length}</span>
                </button>

                {!isCollapsed && (
                  <>
                    {list.map((t) => (
                      <TaskRow
                        key={t._id}
                        task={t}
                        users={users}
                        onOpen={() => setSelectedId(t._id)}
                        onPatch={(body) =>
                          patch.mutate({ taskId: t._id, body })
                        }
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setCreateStatus(col.key)
                        setCreateOpen(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 pl-10 text-[13px] text-[#6b6b70] hover:bg-[#1c1c1e] hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Task
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {panel}
    </div>
  )
}

function TaskRow({ task, users = [], onOpen, onPatch }) {
  const done = task.status === 'done'
  const assigneeId = task.assignee?._id || task.assignee || ''

  return (
    <div className="group grid grid-cols-[minmax(220px,1fr)_120px_130px_100px_130px_44px] items-center gap-0 border-t border-[#2e2e32]/40 px-3 py-[7px] hover:bg-[#1c1c1e]">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onPatch({ status: done ? 'todo' : 'done' })
          }
          className="shrink-0 text-[#6b6b70] hover:text-accent"
          title={done ? 'Mark todo' : 'Mark done'}
        >
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-accent" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'truncate text-left text-[13px] hover:text-accent',
            done && 'text-[#6b6b70] line-through',
          )}
        >
          {task.title}
        </button>
      </div>

      <div>
        <select
          value={assigneeId}
          onChange={(e) =>
            onPatch({ assignee: e.target.value || null })
          }
          className="h-7 w-full max-w-[110px] rounded-md border border-transparent bg-transparent px-1 text-[11px] text-[#c5c5c8] outline-none hover:border-[#2e2e32] focus:border-[#2e2e32] focus:bg-[#121214]"
          title="Assignee"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <input
          type="date"
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
          className="h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[11px] text-[#8b8b90] outline-none hover:border-[#2e2e32] focus:border-[#2e2e32] focus:bg-[#121214]"
        />
      </div>

      <div>
        <select
          value={task.priority || 'medium'}
          onChange={(e) => onPatch({ priority: e.target.value })}
          className="h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[11px] outline-none hover:border-[#2e2e32] focus:border-[#2e2e32] focus:bg-[#121214]"
          style={{ color: PRIORITY_COLOR[task.priority] || '#6b6b70' }}
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div>
        <select
          value={task.status || 'todo'}
          onChange={(e) => onPatch({ status: e.target.value })}
          className="h-7 w-full rounded-md border border-transparent bg-[#3a3a3e] px-1.5 text-[10px] font-semibold tracking-wide text-[#c5c5c8] outline-none hover:border-[#2e2e32]"
        >
          {BOARD.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onOpen}
          className="rounded p-1 text-[#6b6b70] hover:bg-[#252528] hover:text-white"
          title="Comments"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function BoardView({
  byStatus,
  search,
  onSearch,
  onAddTask,
  onOpenTask,
  onMoveTask,
  panel,
}) {
  const [dragOverCol, setDragOverCol] = useState(null)
  const [draggingId, setDraggingId] = useState(null)

  return (
    <div>
      <ClickUpListToolbar
        onAddTask={() => onAddTask('todo')}
        search={search}
        onSearch={onSearch}
      />
        <div className="grid gap-3 p-3 sm:gap-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4">
        {BOARD.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverCol(col.key)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setDragOverCol((cur) => (cur === col.key ? null : cur))
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              const taskId =
                e.dataTransfer.getData('text/task-id') ||
                e.dataTransfer.getData('text/plain')
              setDragOverCol(null)
              setDraggingId(null)
              onMoveTask(taskId, col.key)
            }}
            className={cn(
              'min-h-[220px] rounded-xl border bg-[#1c1c1e] transition-colors',
              dragOverCol === col.key
                ? 'border-accent/60 bg-accent/5'
                : 'border-[#2e2e32]',
            )}
          >
            <div className="flex items-center gap-2 border-b border-[#2e2e32] px-3 py-2 text-[11px] font-semibold tracking-wide text-[#8b8b90]">
              {col.label}
              <span className="rounded bg-[#252528] px-1.5 text-[10px]">
                {byStatus[col.key]?.length || 0}
              </span>
            </div>
            <div className="space-y-1.5 p-2">
              {(byStatus[col.key] || []).map((t) => (
                <div
                  key={t._id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/task-id', t._id)
                    e.dataTransfer.setData('text/plain', t._id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggingId(t._id)
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setDragOverCol(null)
                  }}
                  onDoubleClick={() => onOpenTask(t._id)}
                  title="Drag to move · Double-click for details"
                  className={cn(
                    'cursor-grab rounded-md border border-[#2e2e32] bg-[#121214] p-2.5 text-left active:cursor-grabbing hover:border-[#3a3a3e]',
                    draggingId === t._id && 'opacity-40',
                  )}
                >
                  <p className="text-[13px] font-medium select-none">{t.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Avatar
                      src={t.assignee?.avatar}
                      name={t.assignee?.name}
                      size="xs"
                    />
                    <StatusPill status={t.status} />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddTask(col.key)}
                className="w-full rounded-md px-2 py-1.5 text-left text-[12px] text-[#6b6b70] hover:bg-[#252528] hover:text-white"
              >
                + Add Task
              </button>
            </div>
          </div>
        ))}
      </div>
      {panel}
    </div>
  )
}

function StatusPill({ status }) {
  const label =
    BOARD.find((b) => b.key === status)?.label ||
    String(status || '').replace(/_/g, ' ').toUpperCase()
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-[#3a3a3e] text-[#c5c5c8]">
      {label}
    </span>
  )
}

function GanttView({ tasks, onSelect, onReschedule }) {
  const start = startOfMonth(new Date())
  const days = eachDayOfInterval({ start, end: addDays(start, 27) })

  return (
    <div className="overflow-x-auto rounded-lg border border-[#2e2e32]">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[200px_1fr] border-b border-[#2e2e32] text-[11px] text-[#8b8b90]">
          <div className="px-3 py-2 font-medium">Task</div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))`,
            }}
          >
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={cn(
                  'border-l border-[#2e2e32] px-0.5 py-2 text-center',
                  isSameDay(d, new Date()) && 'bg-accent/10 text-accent',
                )}
              >
                {format(d, 'd')}
              </div>
            ))}
          </div>
        </div>
        {tasks.map((t) => {
          const due = t.dueDate ? new Date(t.dueDate) : addDays(start, 7)
          const s = t.startDate ? new Date(t.startDate) : addDays(due, -3)
          const startIdx = Math.max(0, Math.round((s - start) / 86400000))
          const endIdx = Math.min(
            days.length - 1,
            Math.round((due - start) / 86400000),
          )
          const span = Math.max(1, endIdx - startIdx + 1)
          return (
            <div
              key={t._id}
              className="grid grid-cols-[200px_1fr] border-b border-[#2e2e32] last:border-0"
            >
              <button
                type="button"
                onClick={() => onSelect(t)}
                className="truncate px-3 py-2.5 text-left text-[13px] hover:text-accent"
              >
                {t.title}
              </button>
              <div
                className="relative grid py-2"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))`,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    onReschedule(t._id, addDays(due, 1).toISOString())
                  }
                  className="h-5 rounded-full bg-accent text-[10px] font-semibold text-[#0E0E10]"
                  style={{ gridColumn: `${startIdx + 1} / span ${span}` }}
                >
                  {t.progress}%
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalendarView({ tasks, onSelect }) {
  const monthStart = startOfMonth(new Date())
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  })

  return (
    <div className="rounded-lg border border-[#2e2e32] p-4">
      <h3 className="mb-3 text-[14px] font-semibold">
        {format(monthStart, 'MMMM yyyy')}
      </h3>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-[#6b6b70]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dayTasks = tasks.filter(
            (t) => t.dueDate && isSameDay(new Date(t.dueDate), d),
          )
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'min-h-[72px] rounded-md border border-[#2e2e32] p-1.5',
                !isSameMonth(d, monthStart) && 'opacity-40',
                isSameDay(d, new Date()) && 'border-accent/40 bg-accent/5',
              )}
            >
              <p className="mb-1 text-[11px] text-[#8b8b90]">{format(d, 'd')}</p>
              {dayTasks.slice(0, 2).map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => onSelect(t)}
                  className="mb-0.5 block w-full truncate rounded bg-[#1c1c1e] px-1 py-0.5 text-left text-[10px] hover:text-accent"
                >
                  {t.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
