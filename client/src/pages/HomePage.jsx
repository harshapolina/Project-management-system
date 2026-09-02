import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  formatDistanceToNow,
} from 'date-fns'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Calendar,
  ChevronDown,
  Plus,
  MessageSquare,
  Search,
  History,
} from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { Avatar, EmptyState, SkeletonCard, toast } from '../components/ui'
import { ToolbarPills } from '../components/layout/PageToolbar'
import { PageHeader } from '../components/layout/PageHeader'
import { PageLayout } from '../components/layout/PageLayout'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { cn } from '../lib/utils'
import {
  getTaskStatus,
  nextTaskStatus,
} from '../lib/taskStatus'
import {
  clearGcalSession,
  fetchAllGoogleEvents,
  fetchGoogleEmail,
  getGcalSession,
  requestGoogleCalendarAccess,
  saveGcalSession,
} from '../lib/googleCalendar'

const BOARD_COLUMNS = [
  {
    key: 'todo',
    label: 'To do',
    dot: 'bg-[#aeaeb2]',
    tint: 'bg-surface-raised/80',
  },
  {
    key: 'in_progress',
    label: 'In progress',
    dot: 'bg-accent',
    tint: 'bg-surface-raised/80',
  },
  {
    key: 'review',
    label: 'Review',
    dot: 'bg-amber-500',
    tint: 'bg-surface-raised/80',
  },
]

const FILTER_PILLS = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'today', label: 'Today' },
  { id: 'personal', label: 'Personal' },
  { id: 'history', label: 'Done' },
  { id: 'all', label: 'Overview' },
]

function dueMeta(dueDate) {
  if (!dueDate) return null
  const d = new Date(dueDate)
  const text = isToday(d) ? 'Today' : format(d, 'd MMM')
  if (isPast(d) && !isToday(d))
    return { text, className: 'text-red-500' }
  if (isToday(d)) return { text, className: 'text-accent' }
  return { text, className: 'text-secondary' }
}

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const rawView = params.get('view')
  const view = [
    'all',
    'assigned',
    'today',
    'personal',
    'history',
  ].includes(rawView)
    ? rawView
    : 'assigned'

  useEffect(() => {
    if (!rawView || !FILTER_PILLS.some((p) => p.id === rawView)) {
      const next = new URLSearchParams(params)
      next.set('view', 'assigned')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawView])

  useEffect(() => {
    if (params.get('create') !== '1') return
    setQuickAdd({ open: true, status: 'todo' })
    const next = new URLSearchParams(params)
    next.delete('create')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('create')])

  useEffect(() => {
    const gcal = params.get('gcal')
    if (!gcal) return
    if (gcal === 'connected') {
      toast('Google Calendar connected', { type: 'success' })
      qc.invalidateQueries({ queryKey: ['gcal-status'] })
    } else if (gcal === 'error') {
      toast(params.get('message') || 'Google Calendar connection failed', {
        type: 'error',
      })
    }
    const next = new URLSearchParams(params)
    next.delete('gcal')
    next.delete('message')
    if (!next.get('view')) next.set('view', 'assigned')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('gcal')])

  const [selected, setSelected] = useState(null)
  const [quickAdd, setQuickAdd] = useState({ open: false, status: 'todo' })
  const [quickDraft, setQuickDraft] = useState('')
  const [assignedSearch, setAssignedSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [gcalSession, setGcalSession] = useState(() => getGcalSession())
  const [googleEvents, setGoogleEvents] = useState([])
  const [gcalEventsLoading, setGcalEventsLoading] = useState(false)
  const [showGcalSetup, setShowGcalSetup] = useState(false)
  const [gcalClientDraft, setGcalClientDraft] = useState('')
  const [savingClientId, setSavingClientId] = useState(false)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
    staleTime: 30_000,
  })

  const needsGcal = view === 'all' || view === 'today'
  const { data: gcalStatus, isLoading: gcalStatusLoading } = useQuery({
    queryKey: ['gcal-status'],
    queryFn: () => api('/calendar/google/status'),
    enabled: needsGcal,
    staleTime: 60_000,
  })

  const gcalConnected = !!gcalSession?.accessToken
  const home = data?.data
  const tasks = home?.tasks || {}

  const loadGoogleEvents = async (accessToken) => {
    setGcalEventsLoading(true)
    try {
      const { events } = await fetchAllGoogleEvents(accessToken, 30)
      setGoogleEvents(events)
    } catch (e) {
      toast(e.message || 'Could not load calendar events', { type: 'error' })
      setGoogleEvents([])
    } finally {
      setGcalEventsLoading(false)
    }
  }

  useEffect(() => {
    if (!needsGcal) return
    if (gcalSession?.accessToken) {
      loadGoogleEvents(gcalSession.accessToken)
    } else {
      setGoogleEvents([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcalSession?.accessToken, needsGcal])

  const STATUS_ORDER = ['todo', 'in_progress', 'review', 'done']

  const invalidateHome = () => qc.invalidateQueries({ queryKey: ['home'] })

  const toggleTask = useMutation({
    mutationFn: (id) => api(`/tasks/${id}/toggle`, { method: 'PATCH' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['home'] })
      const prev = qc.getQueryData(['home'])
      qc.setQueryData(['home'], (old) => {
        if (!old?.data?.tasks) return old
        const bump = (list = []) =>
          list.map((t) => {
            if (String(t._id) !== String(id)) return t
            const i = STATUS_ORDER.indexOf(t.status || 'todo')
            const next =
              STATUS_ORDER[(i < 0 ? 0 : i + 1) % STATUS_ORDER.length]
            return { ...t, status: next }
          })
        const t = old.data.tasks
        return {
          ...old,
          data: {
            ...old.data,
            tasks: {
              ...t,
              assigned: bump(t.assigned),
              today: bump(t.today),
              overdue: bump(t.overdue),
              next: bump(t.next),
              upcoming: bump(t.upcoming),
              unscheduled: bump(t.unscheduled),
              personal: bump(t.personal),
              priorities: bump(t.priorities),
              done: bump(t.done),
            },
          },
        }
      })
      return { prev }
    },
    onError: (e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['home'], ctx.prev)
      toast(e.message, { type: 'error' })
    },
    onSuccess: (res) => {
      const to = res?.to || res?.task?.status
      const meta = getTaskStatus(to)
      toast(`Moved to ${meta.shortLabel}`, { type: 'success' })
    },
    onSettled: invalidateHome,
  })

  const createPersonalMut = useMutation({
    mutationFn: ({ title, status }) =>
      api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          isPersonal: true,
          status: status || 'todo',
          priority: 'medium',
        }),
      }),
    onSuccess: () => {
      invalidateHome()
      setQuickDraft('')
      setQuickAdd({ open: false, status: 'todo' })
      toast('Task added', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const firstName = user?.name?.split(' ')[0] || 'there'
  const greeting =
    home?.greeting ||
    (() => {
      const h = new Date().getHours()
      if (h < 12) return `Good morning, ${firstName}`
      if (h < 17) return `Good afternoon, ${firstName}`
      return `Good evening, ${firstName}`
    })()

  const openTask = (task) => {
    if (task.isPersonal) {
      setSelected({
        taskId: task._id,
        projectId: null,
        projectName: 'Personal List',
        isPersonal: true,
      })
      return
    }
    const projectId =
      typeof task.projectId === 'object' ? task.projectId?._id : task.projectId
    if (!projectId) return
    setSelected({
      taskId: task._id,
      projectId,
      projectName: task.projectId?.name,
    })
  }

  const connectGoogleCalendar = async (forcedClientId) => {
    try {
      setConnectingGoogle(true)
      let clientId =
        forcedClientId ||
        gcalStatus?.clientId ||
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        ''
      if (!clientId) {
        setShowGcalSetup(true)
        setConnectingGoogle(false)
        return
      }
      const { accessToken, expiresAt } =
        await requestGoogleCalendarAccess(clientId)
      const email = await fetchGoogleEmail(accessToken)
      const session = { accessToken, expiresAt, email }
      saveGcalSession(session)
      setGcalSession(session)
      setShowGcalSetup(false)
      await loadGoogleEvents(accessToken)
      toast('Google Calendar connected', { type: 'success' })
    } catch (e) {
      toast(e.message || 'Could not connect Google Calendar', { type: 'error' })
    } finally {
      setConnectingGoogle(false)
    }
  }

  const saveClientIdAndConnect = async () => {
    const clientId = gcalClientDraft.trim()
    if (!clientId) {
      toast('Paste your Google Client ID first', { type: 'error' })
      return
    }
    try {
      setSavingClientId(true)
      await api('/calendar/google/client-id', {
        method: 'PUT',
        body: JSON.stringify({ clientId }),
      })
      await qc.invalidateQueries({ queryKey: ['gcal-status'] })
      setSavingClientId(false)
      await connectGoogleCalendar(clientId)
    } catch (e) {
      setSavingClientId(false)
      toast(e.message, { type: 'error' })
    }
  }

  const assignedByStatus = useMemo(() => {
    let list = tasks.assigned || []
    if (assignedSearch.trim()) {
      const q = assignedSearch.toLowerCase()
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.projectId?.name?.toLowerCase().includes(q),
      )
    }
    const map = { todo: [], in_progress: [], review: [] }
    for (const t of list) {
      const k = map[t.status] ? t.status : 'todo'
      map[k].push(t)
    }
    return map
  }, [tasks.assigned, assignedSearch])

  const personalByStatus = useMemo(() => {
    const map = { todo: [], in_progress: [], review: [] }
    for (const t of tasks.personal || []) {
      if (t.status === 'done') continue
      const k = map[t.status] ? t.status : 'todo'
      map[k].push(t)
    }
    return map
  }, [tasks.personal])

  const doneList = useMemo(() => {
    let list = tasks.done || []
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase()
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.projectId?.name?.toLowerCase().includes(q),
      )
    }
    return list
  }, [tasks.done, historySearch])

  const kpis = useMemo(
    () => ({
      assigned: (tasks.assigned || []).length,
      overdue: (tasks.overdue || []).length,
      today: (tasks.today || []).length,
      comments: (home?.assignedComments || []).length,
    }),
    [tasks, home?.assignedComments],
  )

  const boardProps = {
    collapsed,
    setCollapsed,
    onToggle: (id) => toggleTask.mutate(id),
    onOpenTask: openTask,
    onAdd: (status) => setQuickAdd({ open: true, status }),
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-4">
        <SkeletonCard className="h-14" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-[420px]" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1500px] justify-center py-16">
        <EmptyState
          icon={AlertCircle}
          title="Could not load your work"
          description={error?.message || 'Check your connection and try again.'}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </div>
    )
  }

  return (
    <PageLayout className={cn('flex flex-col gap-4 pb-6 transition-opacity', isFetching && 'opacity-90')}>
          <PageHeader
            title={greeting}
            actions={
              <>
              <ToolbarPills
                items={FILTER_PILLS}
                value={view}
                onChange={(id) => setParams({ view: id })}
              />
              <span
                className="hidden h-5 w-px bg-border sm:block"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => setQuickAdd({ open: true, status: 'todo' })}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12px] font-semibold text-[#171717] transition hover:bg-accent-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                New task
              </button>
              </>
            }
          />

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label="Assigned"
              value={kpis.assigned}
              active={view === 'assigned'}
              onClick={() => setParams({ view: 'assigned' })}
            />
            <MiniStat
              label="Overdue"
              value={kpis.overdue}
              danger={kpis.overdue > 0}
              active={view === 'today'}
              onClick={() => setParams({ view: 'today' })}
            />
            <MiniStat
              label="Due today"
              value={kpis.today}
              accent
              active={view === 'today'}
              onClick={() => setParams({ view: 'today' })}
            />
            <MiniStat
              label="Comments"
              value={kpis.comments}
              onClick={() => navigate('/assigned-comments')}
            />
          </section>

          {view === 'assigned' && (
            <AssignedBoard
              byStatus={assignedByStatus}
              search={assignedSearch}
              setSearch={setAssignedSearch}
              {...boardProps}
            />
          )}

          {view === 'today' && (
            <TodayBoard
              overdue={tasks.overdue || []}
              today={tasks.today || []}
              {...boardProps}
              gcal={{
                gcalStatusLoading,
                connected: gcalConnected,
                events: googleEvents,
                eventsLoading: gcalEventsLoading,
                connecting: connectingGoogle,
                onConnect: connectGoogleCalendar,
                onDisconnect: () => {
                  clearGcalSession()
                  setGcalSession(null)
                  setGoogleEvents([])
                },
                onRefresh: async () => {
                  if (gcalSession?.accessToken) {
                    await loadGoogleEvents(gcalSession.accessToken)
                    toast('Calendar refreshed', { type: 'success' })
                  }
                },
                email: gcalSession?.email || '',
                showSetup: showGcalSetup,
                setShowSetup: setShowGcalSetup,
                clientDraft: gcalClientDraft,
                setClientDraft: setGcalClientDraft,
                onSaveAndConnect: saveClientIdAndConnect,
                savingClientId,
                agenda: home?.agenda || [],
              }}
            />
          )}

          {view === 'personal' && (
            <AssignedBoard
              byStatus={personalByStatus}
              search=""
              setSearch={() => {}}
              personal
              hideSearch
              {...boardProps}
            />
          )}

          {view === 'all' && (
            <Overview
              byStatus={assignedByStatus}
              overdue={tasks.overdue || []}
              today={tasks.today || []}
              comments={home?.assignedComments || []}
              priorities={tasks.priorities || []}
              {...boardProps}
              go={(v) => setParams({ view: v })}
              gcal={{
                gcalStatusLoading,
                connected: gcalConnected,
                events: googleEvents,
                eventsLoading: gcalEventsLoading,
                connecting: connectingGoogle,
                onConnect: connectGoogleCalendar,
                onDisconnect: () => {
                  clearGcalSession()
                  setGcalSession(null)
                  setGoogleEvents([])
                },
                onRefresh: async () => {
                  if (gcalSession?.accessToken) {
                    await loadGoogleEvents(gcalSession.accessToken)
                  }
                },
                email: gcalSession?.email || '',
                showSetup: showGcalSetup,
                setShowSetup: setShowGcalSetup,
                clientDraft: gcalClientDraft,
                setClientDraft: setGcalClientDraft,
                onSaveAndConnect: saveClientIdAndConnect,
                savingClientId,
                agenda: home?.agenda || [],
              }}
            />
          )}

          {view === 'history' && (
            <HistoryBoard
              items={doneList}
              total={(tasks.done || []).length}
              search={historySearch}
              setSearch={setHistorySearch}
              onToggle={(id) => toggleTask.mutate(id)}
              onOpenTask={openTask}
              onBack={() => setParams({ view: 'assigned' })}
            />
          )}

      {quickAdd.open && (
        <QuickAddBar
          status={quickAdd.status}
          draft={quickDraft}
          setDraft={setQuickDraft}
          loading={createPersonalMut.isPending}
          onClose={() => {
            setQuickAdd({ open: false, status: 'todo' })
            setQuickDraft('')
          }}
          onSubmit={() => {
            if (!quickDraft.trim()) return
            createPersonalMut.mutate({
              title: quickDraft.trim(),
              status: quickAdd.status,
            })
          }}
        />
      )}

      <TaskDetailPanel
        open={!!selected}
        mode="edit"
        taskId={selected?.taskId}
        projectId={selected?.isPersonal ? undefined : selected?.projectId}
        projectName={selected?.projectName}
        isPersonal={!!selected?.isPersonal}
        onClose={() => setSelected(null)}
      />
    </PageLayout>
  )
}

function MiniStat({ label, value, accent, danger, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[12px] border bg-surface px-3 py-2.5 text-left transition',
        active ? 'border-accent/50 shadow-sm' : 'border-border hover:border-accent/30',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-secondary">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-[20px] font-semibold tabular-nums tracking-tight',
          danger ? 'text-red-500' : accent ? 'text-accent' : 'text-primary',
        )}
      >
        {value}
      </p>
    </button>
  )
}

function AssignedBoard({
  byStatus,
  search,
  setSearch,
  collapsed,
  setCollapsed,
  onToggle,
  onOpenTask,
  onAdd,
  personal,
  hideSearch,
}) {
  return (
    <div className="space-y-3">
      {!hideSearch && (
        <div className="flex justify-end">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find…"
              className="h-8 w-44 rounded-lg border border-border bg-surface pl-8 pr-2 text-[12px] text-primary outline-none placeholder:text-secondary focus:border-accent/40"
            />
          </div>
        </div>
      )}

      <div className="kanban-scroll grid min-h-[440px] gap-4 lg:grid-cols-3">
        {BOARD_COLUMNS.map((col) => (
          <BoardColumn
            key={col.key}
            column={col}
            items={byStatus[col.key] || []}
            collapsed={!!collapsed[col.key]}
            onToggleCollapse={() =>
              setCollapsed((s) => ({ ...s, [col.key]: !s[col.key] }))
            }
            onToggle={onToggle}
            onOpenTask={onOpenTask}
            onAdd={() => onAdd(col.key)}
            showProject={!personal}
          />
        ))}
      </div>
    </div>
  )
}

function BoardColumn({
  column,
  items,
  collapsed,
  onToggleCollapse,
  onToggle,
  onOpenTask,
  onAdd,
  showProject,
}) {
  return (
    <section className="flex min-h-[440px] flex-col overflow-hidden rounded-[12px] border border-border bg-surface">
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          'flex w-full shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 text-left',
          column.tint,
        )}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-secondary transition',
            collapsed && '-rotate-90',
          )}
        />
        <span className={cn('h-2 w-2 shrink-0 rounded-full', column.dot)} />
        <p className="min-w-0 flex-1 text-[13px] font-semibold text-primary">
          {column.label}
        </p>
        <span className="text-[12px] font-semibold tabular-nums text-secondary">
          {items.length}
        </span>
      </button>

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-10 text-center text-[11px] text-secondary">
                Nothing here yet
              </p>
            ) : (
              items.map((t) => (
                <BoardTask
                  key={t._id}
                  task={t}
                  showProject={showProject}
                  onToggle={() => onToggle(t._id)}
                  onOpen={() => onOpenTask(t)}
                />
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-auto flex w-full shrink-0 items-center justify-center gap-1 py-2.5 text-[11px] font-semibold text-accent hover:bg-surface-raised"
          >
            <Plus className="h-3 w-3" />
            Add task
          </button>
        </div>
      )}
    </section>
  )
}

function BoardTask({ task, showProject, onToggle, onOpen }) {
  const status = task.status || 'todo'
  const next = nextTaskStatus(status)
  const due = dueMeta(task.dueDate)

  return (
    <div className="px-3 py-2.5 transition-colors hover:bg-surface-raised/70">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0"
          title={`Move to ${next.shortLabel}`}
        >
          {status === 'in_progress' ? (
            <Circle
              className="h-4 w-4 fill-accent/25 text-accent"
              strokeWidth={2.5}
            />
          ) : status === 'review' ? (
            <Circle
              className="h-4 w-4 fill-amber-500/30 text-amber-500"
              strokeWidth={2.5}
            />
          ) : (
            <Circle className="h-4 w-4 text-secondary" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-[13px] font-medium text-primary hover:text-accent">
            {task.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-secondary">
            {[showProject ? task.projectId?.name : null, due?.text]
              .filter(Boolean)
              .join(' · ') || (showProject ? '—' : 'Personal')}
          </p>
        </button>
      </div>
    </div>
  )
}

function TodayBoard({
  overdue,
  today,
  onToggle,
  onOpenTask,
  gcal,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="flex min-h-[440px] flex-col overflow-hidden rounded-[12px] bg-surface">
        <div className="flex items-center gap-2 bg-red-50/70 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <p className="min-w-0 flex-1 text-[13px] font-semibold text-primary">
            Overdue
          </p>
          <span className="text-[12px] font-semibold tabular-nums text-secondary">
            {overdue.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {overdue.length === 0 ? (
            <p className="px-3 py-10 text-center text-[11px] text-secondary">
              You’re clear — nothing overdue
            </p>
          ) : (
            overdue.map((t) => (
              <BoardTask
                key={t._id}
                task={t}
                showProject
                onToggle={() => onToggle(t._id)}
                onOpen={() => onOpenTask(t)}
              />
            ))
          )}
        </div>
      </section>

      <section className="flex min-h-[440px] flex-col overflow-hidden rounded-[12px] bg-surface">
        <div className="flex items-center gap-2 bg-emerald-50/70 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <p className="min-w-0 flex-1 text-[13px] font-semibold text-primary">
            Today
          </p>
          <span className="text-[12px] font-semibold tabular-nums text-secondary">
            {today.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {today.length === 0 ? (
            <p className="px-3 py-10 text-center text-[11px] text-secondary">
              Nothing due today
            </p>
          ) : (
            today.map((t) => (
              <BoardTask
                key={t._id}
                task={t}
                showProject
                onToggle={() => onToggle(t._id)}
                onOpen={() => onOpenTask(t)}
              />
            ))
          )}
        </div>
      </section>

      <AgendaPanel {...gcal} onOpenTask={onOpenTask} />
    </div>
  )
}

function Overview({
  byStatus,
  overdue,
  today,
  comments,
  priorities,
  onToggle,
  onOpenTask,
  onAdd,
  go,
  gcal,
}) {
  const preview = {
    todo: (byStatus.todo || []).slice(0, 3),
    in_progress: (byStatus.in_progress || []).slice(0, 3),
    review: (byStatus.review || []).slice(0, 3),
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-primary">Assigned board</p>
        <button
          type="button"
          onClick={() => go('assigned')}
          className="text-[11px] font-semibold text-accent hover:underline"
        >
          Open full board
        </button>
      </div>
      <div className="kanban-scroll grid min-h-[320px] gap-4 lg:grid-cols-3">
        {BOARD_COLUMNS.map((col) => (
          <BoardColumn
            key={col.key}
            column={col}
            items={preview[col.key]}
            collapsed={false}
            onToggleCollapse={() => {}}
            onToggle={onToggle}
            onOpenTask={onOpenTask}
            onAdd={() => onAdd(col.key)}
            showProject
          />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <FocusStrip
          title="Overdue & today"
          items={[...overdue, ...today].slice(0, 5)}
          onToggle={onToggle}
          onOpenTask={onOpenTask}
          onSeeAll={() => go('today')}
        />
        <FocusStrip
          title="Priorities"
          items={(priorities || []).slice(0, 5)}
          onToggle={onToggle}
          onOpenTask={onOpenTask}
          onSeeAll={() => go('assigned')}
        />
        <CommentsStrip comments={comments} />
      </div>
      <AgendaPanel {...gcal} onOpenTask={onOpenTask} className="min-h-[280px]" />
    </div>
  )
}

function FocusStrip({ title, items, onToggle, onOpenTask, onSeeAll }) {
  return (
    <section className="min-h-[240px] overflow-hidden rounded-[12px] bg-surface">
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-[12px] font-semibold text-primary">{title}</p>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-[11px] font-medium text-accent hover:underline"
        >
          See all
        </button>
      </div>
      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-[11px] text-secondary">
            All clear
          </p>
        ) : (
          items.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => onOpenTask(t)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-raised"
            >
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(t._id)
                }}
              >
                <Circle className="h-3.5 w-3.5 text-secondary" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-primary">
                {t.title}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function CommentsStrip({ comments }) {
  return (
    <section className="min-h-[240px] overflow-hidden rounded-[12px] bg-surface">
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-[12px] font-semibold text-primary">Comments</p>
        <Link
          to="/assigned-comments"
          className="text-[11px] font-medium text-accent hover:underline"
        >
          Open all
        </Link>
      </div>
      <div className="divide-y divide-border">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center px-3 py-8 text-center">
            <MessageSquare className="mb-2 h-5 w-5 text-secondary" />
            <p className="text-[11px] text-secondary">No assigned comments</p>
          </div>
        ) : (
          comments.slice(0, 4).map((c) => (
            <div key={c._id} className="flex gap-2 px-3 py-2.5">
              <Avatar src={c.author?.avatar} name={c.author?.name} size="xs" />
              <div className="min-w-0">
                <p className="truncate text-[11px] text-secondary">
                  <span className="font-semibold text-primary">
                    {c.author?.name}
                  </span>
                </p>
                <p className="line-clamp-2 text-[12px] text-primary">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function HistoryBoard({
  items,
  total,
  search,
  setSearch,
  onToggle,
  onOpenTask,
  onBack,
}) {
  return (
    <section className="min-h-[420px] overflow-hidden rounded-[12px] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-secondary" />
          <div>
            <h2 className="text-[14px] font-semibold text-primary">
              Done history
            </h2>
            <p className="text-[11px] text-secondary">
              {total} completed — tap the check to reopen
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history…"
            className="h-8 w-44 rounded-lg border border-border bg-surface-raised pl-8 pr-2 text-[12px] outline-none focus:border-accent/40"
          />
        </div>
      </div>
      {items.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-4">
          <EmptyState
            icon={History}
            title="No completed tasks yet"
            description="Finish work and it will land here."
            actionLabel="Back to board"
            onAction={onBack}
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((t) => (
            <li
              key={t._id}
              className="flex min-h-[64px] items-center gap-3 px-4 py-3 sm:px-5"
            >
              <button
                type="button"
                onClick={() => onToggle(t._id)}
                className="text-emerald-600 hover:text-accent"
                title="Reopen"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenTask(t)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-[13px] text-secondary line-through">
                  {t.title}
                </p>
                <p className="truncate text-[11px] text-secondary">
                  {t.isPersonal
                    ? 'Personal'
                    : t.projectId?.name || 'Task'}
                  {t.updatedAt
                    ? ` · ${formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}`
                    : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AgendaPanel({
  gcalStatusLoading,
  connected,
  events,
  eventsLoading,
  connecting,
  onConnect,
  onDisconnect,
  onRefresh,
  email,
  showSetup,
  setShowSetup,
  clientDraft,
  setClientDraft,
  onSaveAndConnect,
  savingClientId,
  agenda = [],
  onOpenTask,
  className,
}) {
  return (
    <section
      className={cn(
        'flex min-h-[440px] flex-col overflow-hidden rounded-[12px] bg-surface',
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          <div>
            <p className="text-[12px] font-bold text-primary">Agenda</p>
            <p className="text-[10px] text-secondary">Calendar + due dates</p>
          </div>
        </div>
        {connected ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] text-secondary hover:text-primary"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-[11px] text-secondary hover:text-primary"
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {gcalStatusLoading ? (
          <p className="py-8 text-center text-[12px] text-secondary">
            Checking calendar…
          </p>
        ) : !connected ? (
          <div className="flex flex-col items-center px-2 py-8 text-center">
            <Calendar className="mb-3 h-7 w-7 text-violet-500" />
            <p className="text-[13px] font-semibold text-primary">
              Connect Google Calendar
            </p>
            <p className="mt-1 max-w-xs text-[11px] text-secondary">
              See meetings beside your due dates.
            </p>
            {showSetup ? (
              <div className="mt-3 w-full rounded-[10px] border border-border bg-surface-raised p-3 text-left">
                <input
                  value={clientDraft}
                  onChange={(e) => setClientDraft(e.target.value)}
                  placeholder="Client ID"
                  className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-[12px] outline-none"
                />
                <button
                  type="button"
                  disabled={savingClientId || connecting}
                  onClick={onSaveAndConnect}
                  className="mt-2 w-full rounded-lg bg-accent py-2 text-[12px] font-semibold text-[#171717]"
                >
                  Save & connect
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={connecting}
                onClick={() => onConnect()}
                className="mt-4 rounded-[10px] border border-border px-3 py-2 text-[12px] font-semibold text-primary hover:bg-surface-raised"
              >
                {connecting ? 'Opening…' : 'Connect'}
              </button>
            )}
          </div>
        ) : eventsLoading ? (
          <p className="py-8 text-center text-[12px] text-secondary">
            Loading events…
          </p>
        ) : (
          <>
            {email ? (
              <p className="mb-2 text-[10px] text-secondary">Connected · {email}</p>
            ) : null}
            {(events || []).slice(0, 6).map((ev) => {
              const d = new Date(ev.start)
              return (
                <a
                  key={`${ev.calendarId}-${ev.id}-${ev.start}`}
                  href={ev.htmlLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-1 flex gap-2 rounded-lg px-2 py-2 hover:bg-surface-raised"
                >
                  <div className="w-16 shrink-0 text-[11px]">
                    <p className="font-semibold text-primary">
                      {isToday(d)
                        ? 'Today'
                        : isTomorrow(d)
                          ? 'Tomorrow'
                          : format(d, 'MMM d')}
                    </p>
                    <p className="text-secondary">
                      {ev.allDay ? 'All day' : format(d, 'h:mm a')}
                    </p>
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-primary">
                    {ev.title}
                  </p>
                </a>
              )
            })}
            {agenda.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                  Task dues
                </p>
                {agenda.slice(0, 4).map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => onOpenTask(t)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-raised"
                  >
                    <span className="w-14 text-[11px] font-medium text-accent">
                      {isToday(new Date(t.dueDate))
                        ? 'Today'
                        : format(new Date(t.dueDate), 'MMM d')}
                    </span>
                    <span className="truncate text-[12px] text-primary">
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function QuickAddBar({ status, draft, setDraft, loading, onClose, onSubmit }) {
  const meta = getTaskStatus(status)
  return (
    <div className="shrink-0 border-t border-border bg-surface px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] sm:px-6">
      <form
        className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <span className="rounded-md bg-surface-raised px-2 py-1 text-[10px] font-semibold text-secondary">
          {meta.shortLabel}
        </span>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What do you need to do?"
          className="h-10 min-w-[200px] flex-1 rounded-[10px] border border-border bg-surface-raised px-3 text-[13px] outline-none focus:border-accent/40"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="h-10 rounded-[10px] bg-accent px-4 text-[12px] font-semibold text-[#171717] hover:bg-accent-hover disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[10px] px-3 text-[12px] text-secondary hover:bg-surface-raised"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
