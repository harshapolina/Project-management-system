import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import {
  X,
  Sparkles,
  Check,
  Flag,
  Calendar,
  Clock,
  Tag,
  Plus,
  ListTodo,
  Link2,
  CheckSquare,
  Paperclip,
  Search,
  AtSign,
  Settings,
  Send,
  Smile,
  ChevronDown,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { Avatar, toast } from '../../components/ui'
import { cn } from '../../lib/utils'

const STATUSES = [
  { value: 'todo', label: 'TO DO', bg: '#3a3a3e' },
  { value: 'in_progress', label: 'IN PROGRESS', bg: '#1e3a5f' },
  { value: 'review', label: 'REVIEW', bg: '#3b2f1a' },
  { value: 'done', label: 'DONE', bg: '#065f46' },
]

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'medium', label: 'Normal', color: '#3b82f6' },
  { value: 'low', label: 'Low', color: '#6b6b70' },
]

/**
 * ClickUp-style full task panel — create + edit.
 * Layout: main details (left) + Activity sidebar (right)
 */
export function TaskDetailPanel({
  open,
  mode = 'edit', // 'create' | 'edit'
  taskId,
  projectId,
  projectName,
  onClose,
  onCreated,
  initialStatus = 'todo',
}) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const isCreate = mode === 'create' || !taskId

  const { data } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api(`/tasks/${taskId}`),
    enabled: open && !!taskId && !isCreate,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
    enabled: open,
    staleTime: 60_000,
  })

  const task = data?.task
  const comments = data?.comments || []
  const activity = data?.activity || []
  const users = usersData?.users || []

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: '',
    startDate: '',
    dueDate: '',
    tags: '',
    checklist: [],
  })
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isCreate) {
      setForm({
        title: '',
        description: '',
        status: initialStatus || 'todo',
        priority: 'medium',
        assignee: user?.id || '',
        startDate: '',
        dueDate: '',
        tags: '',
        checklist: [],
      })
      setComment('')
      return
    }
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee: task.assignee?._id || task.assignee || '',
        startDate: task.startDate
          ? format(new Date(task.startDate), 'yyyy-MM-dd')
          : '',
        dueDate: task.dueDate
          ? format(new Date(task.dueDate), 'yyyy-MM-dd')
          : '',
        tags: '',
        checklist: task.checklist || [],
      })
    }
  }, [open, isCreate, task, user?.id, initialStatus])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const save = async (partial = {}) => {
    const payload = {
      title: form.title.trim() || 'Untitled Task',
      description: form.description,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee || undefined,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      checklist: form.checklist,
      projectId,
      ...partial,
    }

    setSaving(true)
    try {
      if (isCreate) {
        const res = await api('/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        qc.invalidateQueries({ queryKey: ['tasks', projectId] })
        toast('Task created', { type: 'success' })
        onCreated?.(res.task)
        onClose?.()
      } else {
        await api(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        qc.invalidateQueries({ queryKey: ['tasks', projectId] })
        qc.invalidateQueries({ queryKey: ['task', taskId] })
        toast('Saved', { type: 'success' })
      }
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const postComment = useMutation({
    mutationFn: (body) =>
      api(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      setComment('')
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  if (!open) return null

  const statusMeta = STATUSES.find((s) => s.value === form.status) || STATUSES[0]
  const priorityMeta =
    PRIORITIES.find((p) => p.value === form.priority) || PRIORITIES[2]
  const assigneeUser =
    users.find((u) => u._id === form.assignee || u.id === form.assignee) ||
    task?.assignee

  const feed = [
    ...activity.map((a) => ({
      id: a._id,
      text: a.message,
      at: a.createdAt,
      kind: 'activity',
    })),
    ...comments.map((c) => ({
      id: c._id,
      text: `${c.author?.name || 'Someone'}: ${c.body}`,
      at: c.createdAt,
      kind: 'comment',
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="relative m-0 flex h-full w-full max-w-[1200px] flex-col bg-[#121214] shadow-2xl sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-xl border border-[#2e2e32] overflow-hidden">
        {/* Top bar */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#2e2e32] px-4 text-[12px] text-[#8b8b90]">
          <span className="hover:text-white cursor-default">Team Space</span>
          <span>/</span>
          <span className="hover:text-white cursor-default">Projects</span>
          <span>/</span>
          <span className="truncate text-white font-medium">
            {projectName || 'Project'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* ─── Main details ─── */}
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5 lg:px-8">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 py-0.5 text-[11px] font-medium text-[#8b8b90]">
              <ListTodo className="h-3 w-3" />
              Task
            </div>

            <input
              autoFocus={isCreate}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={() => !isCreate && form.title.trim() && save()}
              placeholder="Task name"
              className="mb-4 w-full bg-transparent text-[28px] font-bold tracking-tight text-white outline-none placeholder:text-[#3a3a3e]"
            />

            {/* AI bar */}
            <button
              type="button"
              className="mb-6 flex w-full items-center gap-2 rounded-lg border border-[#2e2e32] bg-[#1c1c1e] px-3 py-2.5 text-left text-[13px] text-[#8b8b90] hover:border-[#3a3a3e]"
            >
              <Sparkles className="h-4 w-4 text-accent shrink-0" />
              Ask Cubic AI for a presentation, document or prototype.
            </button>

            {/* Attributes grid — ClickUp style */}
            <div className="mb-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <AttrRow label="Status">
                <div className="flex items-center gap-2">
                  <select
                    value={form.status}
                    onChange={(e) => {
                      const status = e.target.value
                      setForm({ ...form, status })
                      if (!isCreate) save({ status })
                    }}
                    className="rounded px-2 py-1 text-[11px] font-bold tracking-wide text-white outline-none border-0 cursor-pointer"
                    style={{ background: statusMeta.bg }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {form.status !== 'done' && (
                    <button
                      type="button"
                      title="Mark complete"
                      onClick={() => {
                        setForm({ ...form, status: 'done' })
                        if (!isCreate) save({ status: 'done' })
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-[#2e2e32] text-[#8b8b90] hover:text-accent hover:border-accent/40"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </AttrRow>

              <AttrRow label="Assignees">
                <div className="flex items-center gap-2">
                  {assigneeUser ? (
                    <>
                      <Avatar
                        src={assigneeUser.avatar}
                        name={assigneeUser.name}
                        size="xs"
                      />
                      <span className="text-[13px]">{assigneeUser.name}</span>
                    </>
                  ) : null}
                  <select
                    value={form.assignee}
                    onChange={(e) => {
                      const assignee = e.target.value
                      setForm({ ...form, assignee })
                      if (!isCreate) save({ assignee })
                    }}
                    className="max-w-[160px] rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 py-1 text-[12px] text-white outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id || u.id} value={u._id || u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </AttrRow>

              <AttrRow label="Dates">
                <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  <Calendar className="h-3.5 w-3.5 text-[#6b6b70]" />
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    onBlur={() => !isCreate && save()}
                    className="rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 py-1 text-[12px] outline-none"
                  />
                  <span className="text-[#6b6b70]">→</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    onBlur={() => !isCreate && save()}
                    className="rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 py-1 text-[12px] outline-none"
                  />
                </div>
              </AttrRow>

              <AttrRow label="Priority">
                <div className="flex items-center gap-2">
                  <Flag
                    className="h-3.5 w-3.5"
                    style={{ color: priorityMeta.color }}
                    fill={priorityMeta.color}
                  />
                  <select
                    value={form.priority}
                    onChange={(e) => {
                      const priority = e.target.value
                      setForm({ ...form, priority })
                      if (!isCreate) save({ priority })
                    }}
                    className="rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 py-1 text-[12px] outline-none"
                    style={{ color: priorityMeta.color }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </AttrRow>

              <AttrRow label="Time estimate">
                <span className="text-[13px] text-[#6b6b70]">Empty</span>
              </AttrRow>

              <AttrRow label="Track time">
                <div className="flex items-center gap-2 text-[13px] text-[#8b8b90]">
                  <Clock className="h-3.5 w-3.5 text-red-500" />
                  0:00:00
                </div>
              </AttrRow>

              <AttrRow label="Tags">
                <div className="flex items-center gap-1.5 text-[13px] text-[#6b6b70]">
                  <Tag className="h-3.5 w-3.5" />
                  Empty
                </div>
              </AttrRow>
            </div>

            {/* Description */}
            <div className="mb-6">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                onBlur={() => !isCreate && save()}
                rows={4}
                placeholder="Add description, or write with AI…"
                className="w-full resize-none rounded-lg border border-transparent bg-transparent px-0 py-1 text-[14px] leading-relaxed text-[#c5c5c8] outline-none placeholder:text-[#6b6b70] hover:border-[#2e2e32] focus:border-[#2e2e32] focus:bg-[#1c1c1e] focus:px-3 focus:py-2"
              />
            </div>

            {/* Checklist */}
            {(form.checklist?.length > 0 || true) && (
              <div className="mb-4 space-y-1">
                {form.checklist?.map((item, idx) => (
                  <label
                    key={item._id || idx}
                    className="flex items-center gap-2 rounded-md px-1 py-1 text-[13px] hover:bg-[#1c1c1e]"
                  >
                    <input
                      type="checkbox"
                      checked={!!item.done}
                      onChange={() => {
                        const checklist = form.checklist.map((c, i) =>
                          i === idx ? { ...c, done: !c.done } : c,
                        )
                        setForm({ ...form, checklist })
                        if (!isCreate) save({ checklist })
                      }}
                      className="accent-[var(--accent)]"
                    />
                    <span
                      className={cn(
                        item.done && 'line-through text-[#6b6b70]',
                      )}
                    >
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Action links */}
            <div className="space-y-0.5 border-t border-[#2e2e32] pt-3">
              <ActionLink
                icon={CheckSquare}
                label="Create checklist"
                onClick={() => {
                  const text = window.prompt('Checklist item')
                  if (!text) return
                  const checklist = [
                    ...(form.checklist || []),
                    { text, done: false },
                  ]
                  setForm({ ...form, checklist })
                  if (!isCreate) save({ checklist })
                }}
              />
              <ActionLink
                icon={Paperclip}
                label="Attach file"
                onClick={() => toast('Attach a file URL from Design & Files')}
              />
            </div>

            {/* Create CTA */}
            {isCreate && (
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={saving || !form.title.trim()}
                  onClick={() => save()}
                  className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-[#0E0E10] hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-[13px] text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* ─── Activity sidebar ─── */}
          <aside className="hidden w-[320px] shrink-0 flex-col border-l border-[#2e2e32] bg-[#161618] md:flex">
            <div className="flex h-11 items-center gap-2 border-b border-[#2e2e32] px-3">
              <span className="text-[13px] font-semibold">Activity</span>
              <div className="ml-auto flex items-center gap-0.5 text-[#8b8b90]">
                <IconBtn>
                  <Search className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn>
                  <AtSign className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn>
                  <Settings className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {isCreate && (
                <p className="text-[12px] text-[#6b6b70]">
                  Activity appears after the task is created.
                </p>
              )}
              {!isCreate && feed.length === 0 && (
                <p className="text-[12px] text-[#6b6b70]">
                  No activity yet.
                </p>
              )}
              {feed.map((item) => (
                <div key={item.id} className="flex gap-2 text-[12px]">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3a3a3e]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[#c5c5c8] leading-snug">{item.text}</p>
                    <p className="mt-0.5 text-[11px] text-[#6b6b70]">
                      {item.at
                        ? formatDistanceToNow(new Date(item.at), {
                            addSuffix: false,
                          })
                            .replace('about ', '')
                            .replace(' minutes', ' mins')
                            .replace(' minute', ' min')
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment composer */}
            <div className="border-t border-[#2e2e32] p-3">
              <div className="relative rounded-lg border border-[#2e2e32] bg-[#1c1c1e] focus-within:border-[#3a3a3e]">
                {mentionOpen && users.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-40 overflow-y-auto rounded-lg border border-[#2e2e32] bg-[#1c1c1e] py-1 shadow-xl">
                    {users.slice(0, 8).map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => {
                          const tag = `@${u.name} `
                          setComment((prev) =>
                            prev.includes(`@${u.name}`)
                              ? prev
                              : `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${tag}`,
                          )
                          setMentionOpen(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#c5c5c8] hover:bg-[#252528]"
                      >
                        <Avatar src={u.avatar} name={u.name} size="xs" />
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isCreate}
                  rows={2}
                  placeholder={
                    isCreate
                      ? 'Save the task to comment…'
                      : 'Write a comment… Use @Name to assign'
                  }
                  className="w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] outline-none placeholder:text-[#6b6b70] disabled:opacity-50"
                />
                <div className="flex items-center gap-0.5 px-2 pb-2">
                  <IconBtn>
                    <Plus className="h-3.5 w-3.5" />
                  </IconBtn>
                  <button
                    type="button"
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-[#8b8b90] hover:bg-[#252528]"
                  >
                    Comment <ChevronDown className="h-3 w-3" />
                  </button>
                  <IconBtn>
                    <Sparkles className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn>
                    <Smile className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn>
                    <Paperclip className="h-3.5 w-3.5" />
                  </IconBtn>
                  <button
                    type="button"
                    disabled={isCreate}
                    onClick={() => setMentionOpen((v) => !v)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#252528] hover:text-white disabled:opacity-40',
                      mentionOpen && 'bg-[#252528] text-white',
                    )}
                  >
                    <AtSign className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isCreate || !comment.trim()}
                    onClick={() => postComment.mutate(comment.trim())}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[#0E0E10] disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function AttrRow({ label, children }) {
  return (
    <div className="flex items-start gap-3 min-h-[32px]">
      <span className="w-[100px] shrink-0 pt-1 text-[12px] text-[#8b8b90]">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function ActionLink({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </button>
  )
}

function IconBtn({ children }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#252528] hover:text-white"
    >
      {children}
    </button>
  )
}
