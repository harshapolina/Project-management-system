import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  X,
  Sparkles,
  Check,
  Calendar,
  Clock,
  Tag,
  Plus,
  ListTodo,
  CheckSquare,
  Paperclip,
  Search,
  AtSign,
  Settings,
  Send,
  Smile,
  ChevronDown,
  CircleDot,
  Flag,
  Hourglass,
  LayoutList,
  GitBranch,
  Bell,
  Users,
  Play,
  Square,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { Avatar, toast } from '../ui'
import { cn } from '../../lib/utils'
import {
  formatTimeEstimate,
  parseTimeEstimate,
  formatTrackedSeconds,
  liveTrackedSeconds,
} from '../../lib/taskStatus'
import { AttrRow } from './AttrRow'
import { StatusSelect } from './StatusBadge'
import { PrioritySelect } from './PriorityBadge'
import { ActivityItem, mapActivityToFeed } from './ActivityFeed'

/**
 * Global ClickUp-style task panel — create + edit.
 */
export function TaskDetailPanel({
  open,
  mode = 'edit',
  taskId,
  projectId,
  projectName,
  isPersonal = false,
  onClose,
  onCreated,
  initialStatus = 'todo',
  initialStartDate = '',
  initialDueDate = '',
}) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [createdId, setCreatedId] = useState(null)

  useEffect(() => {
    if (!open) setCreatedId(null)
  }, [open])

  const activeTaskId = taskId || createdId || null
  const isCreate = !activeTaskId

  const { data } = useQuery({
    queryKey: ['task', activeTaskId],
    queryFn: () => api(`/tasks/${activeTaskId}`),
    enabled: open && !!activeTaskId && !isCreate,
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
    enabled: open,
    staleTime: 60_000,
  })

  const { data: fieldsData } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api('/custom-fields'),
    enabled: open,
    staleTime: 30_000,
  })

  const task = data?.task
  const comments = data?.comments || []
  const activity = data?.activity || []
  const users = usersData?.users || usersData?.data || []
  const customFieldDefs = (fieldsData?.fields || []).filter(
    (f) => f.isActive !== false,
  )

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: '',
    startDate: '',
    dueDate: '',
    tags: '',
    timeEstimate: '',
    checklist: [],
    customFields: {},
  })
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [newField, setNewField] = useState({
    name: '',
    type: 'user',
    options: '',
  })
  const [timerTick, setTimerTick] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [timeTrackingStartedAt, setTimeTrackingStartedAt] = useState(null)
  const [timerBusy, setTimerBusy] = useState(false)

  const emptyForm = () => ({
    title: '',
    description: '',
    status: initialStatus || 'todo',
    priority: 'medium',
    assignee: user?.id || '',
    startDate: initialStartDate
      ? formatDateInput(initialStartDate)
      : '',
    dueDate: initialDueDate ? formatDateInput(initialDueDate) : '',
    tags: '',
    timeEstimate: '',
    checklist: [],
    customFields: {},
  })

  useEffect(() => {
    if (!open) return
    if (isCreate) {
      setForm(emptyForm())
      setComment('')
      return
    }
    if (task) {
      const cf =
        task.customFields && typeof task.customFields === 'object'
          ? { ...task.customFields }
          : {}
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
        tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
        timeEstimate: formatTimeEstimate(task.timeEstimate) || '',
        checklist: task.checklist || [],
        customFields: cf,
      })
      setTimeSpent(Number(task.timeSpent) || 0)
      setTimeTrackingStartedAt(task.timeTrackingStartedAt || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCreate, task, user?.id, initialStatus, initialStartDate, initialDueDate])

  useEffect(() => {
    if (!open || isCreate) {
      setTimeSpent(0)
      setTimeTrackingStartedAt(null)
    }
  }, [open, isCreate])

  useEffect(() => {
    if (!timeTrackingStartedAt) return undefined
    const id = window.setInterval(() => setTimerTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [timeTrackingStartedAt])

  /** Ensure person-style fields (e.g. Developer created as Text) use the people dropdown */
  useEffect(() => {
    if (!open || !fieldsData?.fields?.length) return
    const personNames = /^(developer|person|owner|lead|member|assignee)$/i
    const toFix = fieldsData.fields.filter(
      (f) =>
        f.isActive !== false &&
        f.type === 'text' &&
        personNames.test(String(f.name || '').trim()),
    )
    if (!toFix.length) return
    let cancelled = false
    ;(async () => {
      try {
        await Promise.all(
          toFix.map((f) =>
            api(`/custom-fields/${f._id}`, {
              method: 'PATCH',
              body: JSON.stringify({ type: 'user' }),
            }),
          ),
        )
        if (!cancelled) {
          qc.invalidateQueries({ queryKey: ['custom-fields'] })
        }
      } catch {
        /* ignore — user can still change type manually */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, fieldsData, qc])

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

  const parseTags = (raw) =>
    String(raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

  const buildPayload = (partial = {}) => {
    const estimate =
      partial.timeEstimate !== undefined
        ? partial.timeEstimate
        : parseTimeEstimate(form.timeEstimate)

    return {
      title: form.title.trim() || 'Untitled Task',
      description: form.description,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee || null,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      tags: parseTags(form.tags),
      timeEstimate: estimate,
      checklist: form.checklist,
      customFields: form.customFields || {},
      ...(isPersonal || !projectId
        ? { isPersonal: true }
        : { projectId }),
      ...partial,
    }
  }

  const save = async (partial = {}) => {
    const hasPartial = Object.keys(partial).length > 0
    const payload = isCreate
      ? buildPayload(partial)
      : hasPartial
        ? { ...partial }
        : buildPayload()

    setSaving(true)
    try {
      if (isCreate) {
        const res = await api('/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        const newId = res.task?._id || res.task?.id
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['home'] })
        toast('Task created', { type: 'success' })
        onCreated?.(res.task)
        if (newId) {
          setCreatedId(newId)
          await qc.invalidateQueries({ queryKey: ['task', newId] })
        } else {
          onClose?.()
        }
      } else {
        await api(`/tasks/${activeTaskId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['home'] })
        await qc.invalidateQueries({ queryKey: ['task', activeTaskId] })
      }
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const setCustomValue = (slug, value) => {
    setForm((f) => ({
      ...f,
      customFields: { ...f.customFields, [slug]: value },
    }))
    if (!isCreate) {
      save({
        customFields: { ...(form.customFields || {}), [slug]: value },
      })
    }
  }

  const createField = async () => {
    if (!newField.name.trim()) {
      toast('Field name required', { type: 'error' })
      return
    }
    try {
      const options =
        newField.type === 'select'
          ? newField.options
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : []
      await api('/custom-fields', {
        method: 'POST',
        body: JSON.stringify({
          name: newField.name.trim(),
          type: newField.type,
          options,
        }),
      })
      qc.invalidateQueries({ queryKey: ['custom-fields'] })
      setNewField({ name: '', type: 'user', options: '' })
      setAddFieldOpen(false)
      toast('Field added to workspace', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const updateFieldType = async (field, type) => {
    if (!field?._id || field.type === type) return
    try {
      await api(`/custom-fields/${field._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ type }),
      })
      qc.invalidateQueries({ queryKey: ['custom-fields'] })
      toast(
        type === 'user'
          ? `${field.name} is now a people field`
          : `Updated ${field.name} type`,
        { type: 'success' },
      )
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const toggleTrackTime = async () => {
    if (isCreate || !activeTaskId || timerBusy) {
      if (isCreate) toast('Save the task first to track time', { type: 'info' })
      return
    }
    setTimerBusy(true)
    try {
      if (timeTrackingStartedAt) {
        const spent = liveTrackedSeconds(timeSpent, timeTrackingStartedAt)
        await api(`/tasks/${activeTaskId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            timeSpent: spent,
            timeTrackingStartedAt: null,
            timeTrackingUserId: null,
          }),
        })
        setTimeSpent(spent)
        setTimeTrackingStartedAt(null)
      } else {
        const startedAt = new Date().toISOString()
        await api(`/tasks/${activeTaskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ timeTrackingStartedAt: startedAt }),
        })
        setTimeTrackingStartedAt(startedAt)
      }
      qc.invalidateQueries({ queryKey: ['task', activeTaskId] })
      qc.invalidateQueries({ queryKey: ['active-timer'] })
      qc.invalidateQueries({ queryKey: ['home'] })
    } catch (e) {
      toast(e.message || 'Could not update timer', { type: 'error' })
    } finally {
      setTimerBusy(false)
    }
  }

  const postComment = useMutation({
    mutationFn: (body) =>
      api(`/tasks/${activeTaskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', activeTaskId] })
      setComment('')
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  if (!open) return null

  const crumb = isPersonal || !projectId ? 'Personal' : projectName || 'Project'
  const feed = mapActivityToFeed(activity, comments, task)

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/55">
      <div className="relative m-0 flex h-full w-full max-w-[1180px] flex-col overflow-hidden border border-[#2a2a2e] bg-[#0f0f10] shadow-2xl sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-xl">
        {/* Breadcrumb */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#2a2a2e] px-4 text-[12px] text-[#8b8b90]">
          <span>Team Space</span>
          <span className="text-[#3a3a3e]">/</span>
          {!isPersonal && projectId ? (
            <>
              <span>Projects</span>
              <span className="text-[#3a3a3e]">/</span>
            </>
          ) : null}
          <span className="truncate font-medium text-white">{crumb}</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* ─── Main ─── */}
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5 lg:px-8">
            <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-0.5 text-[11px] font-medium text-[#8b8b90]">
              <ListTodo className="h-3 w-3" />
              Task
              <ChevronDown className="h-3 w-3" />
            </div>

            <input
              autoFocus={isCreate}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={() => !isCreate && form.title.trim() && save()}
              placeholder="Task name"
              className="mb-4 w-full bg-transparent text-[26px] font-semibold tracking-tight text-white outline-none placeholder:text-[#3a3a3e]"
            />

            <button
              type="button"
              className="mb-7 flex w-full items-center gap-2.5 rounded-xl border border-[#2a2a2e] bg-[#161618] px-3.5 py-2.5 text-left text-[13px] text-[#8b8b90] hover:border-[#3a3a3e]"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#a78bfa]" />
              Ask Cubic AI for a presentation, document or prototype.
            </button>

            {/* Property grid — ClickUp layout */}
            <div className="mb-2 grid gap-x-12 gap-y-1 sm:grid-cols-2">
              <AttrRow label="Status" icon={CircleDot}>
                <div className="flex items-center gap-2">
                  <StatusSelect
                    value={form.status}
                    onChange={(status) => {
                      setForm({ ...form, status })
                      if (!isCreate) save({ status })
                    }}
                  />
                  {form.status !== 'done' && (
                    <button
                      type="button"
                      title="Mark complete"
                      onClick={() => {
                        setForm({ ...form, status: 'done' })
                        if (!isCreate) save({ status: 'done' })
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#6b6b70] hover:bg-[#1c1c1e] hover:text-accent"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </AttrRow>

              <AttrRow label="Assignees" icon={Users}>
                <PersonPicker
                  value={form.assignee}
                  users={users}
                  loading={usersLoading}
                  onChange={(assignee) => {
                    setForm({ ...form, assignee: assignee || '' })
                    if (!isCreate) save({ assignee: assignee || null })
                  }}
                />
              </AttrRow>

              <AttrRow label="Dates" icon={Calendar}>
                <div className="relative flex min-w-0 items-center gap-1.5 text-[13px]">
                  {!form.startDate && !form.dueDate ? (
                    <span className="pointer-events-none absolute left-0 text-[#6b6b70]">
                      Start → Due
                    </span>
                  ) : null}
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    onBlur={() => !isCreate && save()}
                    className={cn(
                      'w-[118px] rounded bg-transparent py-1 text-[13px] outline-none [color-scheme:dark]',
                      !form.startDate && 'text-transparent',
                    )}
                  />
                  <span className="text-[#6b6b70]">→</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    onBlur={() => !isCreate && save()}
                    className={cn(
                      'w-[118px] rounded bg-transparent py-1 text-[13px] outline-none [color-scheme:dark]',
                      !form.dueDate && 'text-transparent',
                    )}
                  />
                </div>
              </AttrRow>

              <AttrRow label="Priority" icon={Flag}>
                <PrioritySelect
                  value={form.priority}
                  onChange={(priority) => {
                    setForm({ ...form, priority })
                    if (!isCreate) save({ priority })
                  }}
                  hideIcon
                />
              </AttrRow>

              <AttrRow label="Time estimate" icon={Hourglass}>
                <input
                  type="text"
                  value={form.timeEstimate}
                  placeholder="Empty"
                  onChange={(e) =>
                    setForm({ ...form, timeEstimate: e.target.value })
                  }
                  onBlur={() => {
                    const mins = parseTimeEstimate(form.timeEstimate)
                    setForm((f) => ({
                      ...f,
                      timeEstimate: formatTimeEstimate(mins) || '',
                    }))
                    if (!isCreate) save({ timeEstimate: mins })
                  }}
                  className="w-full max-w-[140px] bg-transparent py-1 text-[13px] text-white outline-none placeholder:text-[#6b6b70]"
                />
              </AttrRow>

              <AttrRow label="Track time" icon={Clock}>
                <button
                  type="button"
                  disabled={timerBusy || isCreate}
                  onClick={toggleTrackTime}
                  className="flex items-center gap-2 text-[13px] text-[#c5c5c8] disabled:opacity-50"
                  title={
                    timeTrackingStartedAt ? 'Stop timer' : 'Start timer'
                  }
                >
                  {timeTrackingStartedAt ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                      <Square className="h-2.5 w-2.5 fill-current" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent">
                      <Play className="h-2.5 w-2.5 fill-current" />
                    </span>
                  )}
                  <span
                    className={cn(
                      'tabular-nums',
                      timeTrackingStartedAt && 'text-white',
                    )}
                  >
                    {formatTrackedSeconds(
                      liveTrackedSeconds(
                        timeSpent,
                        timeTrackingStartedAt,
                      ) +
                        /* force re-render while running */ timerTick * 0,
                    )}
                  </span>
                </button>
              </AttrRow>

              <AttrRow label="Tags" icon={Tag}>
                <input
                  type="text"
                  value={form.tags}
                  placeholder="Empty"
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  onBlur={() => !isCreate && save()}
                  className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-white outline-none placeholder:text-[#6b6b70]"
                />
              </AttrRow>

              {customFieldDefs.map((field) => (
                <AttrRow key={field._id || field.slug} label={field.name}>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <CustomFieldInput
                      field={field}
                      value={form.customFields?.[field.slug]}
                      users={users}
                      usersLoading={usersLoading}
                      onChange={(v) => setCustomValue(field.slug, v)}
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateFieldType(field, e.target.value)}
                      title="Field data type"
                      className="h-7 shrink-0 rounded-md border border-[#2a2a2e] bg-[#161618] px-1.5 text-[10px] font-medium uppercase tracking-wide text-[#8b8b90] outline-none hover:border-[#3a3a3e] hover:text-white"
                    >
                      <option value="text">Text</option>
                      <option value="user">Person</option>
                      <option value="select">Select</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                </AttrRow>
              ))}
            </div>

            {/* Description */}
            <div className="mt-5 border-t border-[#2a2a2e] pt-4">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                onBlur={() => !isCreate && save()}
                rows={3}
                placeholder="Add description, or write with AI."
                className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-[#c5c5c8] outline-none placeholder:text-[#6b6b70]"
              />
            </div>

            {form.checklist?.length > 0 && (
              <div className="mb-3 mt-2 space-y-1">
                {form.checklist.map((item, idx) => (
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
                      className={cn(item.done && 'line-through text-[#6b6b70]')}
                    >
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Action links — ClickUp order */}
            <div className="mt-2 space-y-0.5">
              <ActionLink
                icon={Plus}
                label="Add fields"
                onClick={() => setAddFieldOpen((v) => !v)}
              />
              {addFieldOpen && (
                <div className="mb-2 ml-1 space-y-2 rounded-lg border border-[#2a2a2e] bg-[#161618] p-3">
                  <p className="text-[12px] text-[#8b8b90]">
                    Workspace-wide field on every task.
                  </p>
                  <input
                    value={newField.name}
                    onChange={(e) =>
                      setNewField({ ...newField, name: e.target.value })
                    }
                    placeholder="Field name (e.g. Developer)"
                    className="w-full rounded-md border border-[#2a2a2e] bg-[#0f0f10] px-2.5 py-1.5 text-[13px] outline-none"
                  />
                  <select
                    value={newField.type}
                    onChange={(e) =>
                      setNewField({ ...newField, type: e.target.value })
                    }
                    className="w-full rounded-md border border-[#2a2a2e] bg-[#0f0f10] px-2.5 py-1.5 text-[13px] outline-none"
                  >
                    <option value="user">Person (company members)</option>
                    <option value="text">Text</option>
                    <option value="select">Select</option>
                    <option value="number">Number</option>
                  </select>
                  {newField.type === 'select' && (
                    <input
                      value={newField.options}
                      onChange={(e) =>
                        setNewField({ ...newField, options: e.target.value })
                      }
                      placeholder="Options, comma separated"
                      className="w-full rounded-md border border-[#2a2a2e] bg-[#0f0f10] px-2.5 py-1.5 text-[13px] outline-none"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={createField}
                      className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#0E0E10]"
                    >
                      Create field
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddFieldOpen(false)}
                      className="rounded-md px-3 py-1.5 text-[12px] text-[#8b8b90]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <ActionLink
                icon={LayoutList}
                label="Add subtask"
                onClick={() => toast('Subtasks coming soon')}
              />
              <ActionLink
                icon={GitBranch}
                label="Relate items or add dependencies"
                onClick={() => toast('Dependencies coming soon')}
              />
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

          {/* ─── Activity ─── */}
          <aside className="flex min-h-[280px] w-full shrink-0 flex-col border-t border-[#2a2a2e] bg-[#0f0f10] md:min-h-0 md:w-[360px] md:border-l md:border-t-0">
            <div className="flex h-11 items-center gap-2 border-b border-[#2a2a2e] px-4">
              <span className="text-[14px] font-semibold text-white">
                Activity
              </span>
              <div className="ml-auto flex items-center gap-0.5 text-[#8b8b90]">
                <IconBtn>
                  <Search className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn>
                  <span className="relative">
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                </IconBtn>
                <IconBtn>
                  <Settings className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>

            <div className="min-h-[160px] flex-1 overflow-y-auto px-3 py-2">
              {isCreate && (
                <p className="px-2 py-6 text-center text-[12px] text-[#6b6b70]">
                  Activity appears after the task is created.
                </p>
              )}
              {!isCreate && feed.length === 0 && (
                <p className="px-2 py-6 text-center text-[12px] text-[#6b6b70]">
                  No activity yet.
                </p>
              )}
              {feed.map((item) => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  currentUser={user}
                />
              ))}
            </div>

            <div className="border-t border-[#2a2a2e] p-3">
              <div className="relative rounded-xl border border-[#2a2a2e] bg-[#161618] focus-within:border-[#3a3a3e]">
                {mentionOpen && users.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-40 overflow-y-auto rounded-lg border border-[#2a2a2e] bg-[#1c1c1e] py-1 shadow-xl">
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
                      : 'Write a comment…'
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

function formatDateInput(value) {
  if (!value) return ''
  try {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }
    return format(new Date(value), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

function PersonPicker({ value, users, loading, onChange, label = 'Person' }) {
  const [open, setOpen] = useState(false)
  const selected = users.find(
    (u) => String(u._id || u.id) === String(value || ''),
  )

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!e.target.closest?.('[data-person-picker]')) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative min-w-0 flex-1" data-person-picker>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-0.5 text-left hover:bg-[#1c1c1e]"
        aria-label={label}
      >
        {selected ? (
          <>
            <Avatar src={selected.avatar} name={selected.name} size="xs" />
            <span className="truncate text-[13px] text-white">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-[#6b6b70]">Empty</span>
        )}
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[#6b6b70]" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-56 w-[min(280px,70vw)] overflow-y-auto rounded-lg border border-[#2a2a2e] bg-[#161618] py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#8b8b90] hover:bg-[#1c1c1e]"
          >
            Empty
          </button>
          {loading && (
            <p className="px-3 py-2 text-[12px] text-[#6b6b70]">Loading…</p>
          )}
          {!loading && users.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-[#6b6b70]">
              No company members found
            </p>
          )}
          {users.map((u) => {
            const id = String(u._id || u.id)
            const active = id === String(value || '')
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#1c1c1e]',
                  active && 'bg-[#1c1c1e]',
                )}
              >
                <Avatar src={u.avatar} name={u.name} size="xs" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-white">
                  {u.name}
                </span>
                {u.role ? (
                  <span className="shrink-0 text-[10px] uppercase text-[#6b6b70]">
                    {String(u.role).replace(/_/g, ' ')}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CustomFieldInput({ field, value, users, usersLoading, onChange }) {
  if (field.type === 'user') {
    return (
      <PersonPicker
        value={value}
        users={users}
        loading={usersLoading}
        onChange={onChange}
        label={field.name}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full max-w-[180px] rounded-md border border-[#2a2a2e] bg-[#0f0f10] px-2 py-1 text-[13px] outline-none"
      >
        <option value="">Empty</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        placeholder="Empty"
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Number(e.target.value))
        }
        className="w-full max-w-[120px] bg-transparent py-1 text-[13px] outline-none placeholder:text-[#6b6b70]"
      />
    )
  }

  return (
    <input
      type="text"
      defaultValue={value ?? ''}
      key={`${field.slug}-${value ?? ''}`}
      placeholder="Empty"
      onBlur={(e) => onChange(e.target.value || null)}
      className="w-full max-w-[200px] bg-transparent py-1 text-[13px] outline-none placeholder:text-[#6b6b70]"
    />
  )
}

function ActionLink({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-0.5 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
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
