import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format,
  isToday,
  isYesterday,
  isTomorrow,
  isBefore,
  startOfDay,
  formatDistanceToNow,
} from 'date-fns'
import {
  CheckCircle2,
  Circle,
  Calendar,
  Flag,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  MessageSquare,
  BookHeart,
  X,
  History,
} from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { Avatar, toast } from '../components/ui'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { cn } from '../lib/utils'
import {
  clearGcalSession,
  fetchAllGoogleEvents,
  fetchGoogleEmail,
  getGcalSession,
  requestGoogleCalendarAccess,
  saveGcalSession,
} from '../lib/googleCalendar'

const PRIORITY_META = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high: { label: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  medium: { label: 'Normal', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  low: { label: 'Low', color: '#8b8b90', bg: 'rgba(139,139,144,0.12)' },
}

const STATUS_GROUPS = [
  { key: 'todo', label: 'TO DO', tint: '#8b8b90' },
  { key: 'in_progress', label: 'IN PROGRESS', tint: '#3b82f6' },
  { key: 'review', label: 'REVIEW', tint: '#f59e0b' },
]

const VIEW_META = {
  all: {
    title: 'Everything',
    hint: 'All your work — assigned, today, personal, comments, priorities & history',
  },
  assigned: {
    title: 'Assigned to me',
    hint: 'Only tasks assigned to you across Spaces',
  },
  today: {
    title: 'Today & Overdue',
    hint: 'What needs attention now — plus your agenda',
  },
  personal: {
    title: 'Personal List',
    hint: 'Private tasks that stay only with you',
  },
  history: {
    title: 'Done history',
    hint: 'Everything you’ve completed — reopen anytime',
  },
}

const FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'today', label: 'Today' },
  { id: 'personal', label: 'Personal' },
  { id: 'history', label: 'Done' },
]

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
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
    if (!rawView || !VIEW_META[rawView]) {
      const next = new URLSearchParams(params)
      next.set('view', 'assigned')
      setParams(next, { replace: true })
    }
    // Only react to the view string — not the whole params object (avoids loops).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawView])

  useEffect(() => {
    if (params.get('create') !== '1') return
    setCreatePersonal(true)
    const next = new URLSearchParams(params)
    next.delete('create')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('create')])

  // Handle return from Google OAuth redirect (optional server flow)
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
  const [createPersonal, setCreatePersonal] = useState(false)
  const [personalDraft, setPersonalDraft] = useState('')
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

  const { data, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
    staleTime: 30_000,
  })

  /** Calendar status is only needed on All / Today (Agenda card). */
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
        const tasks = old.data.tasks
        return {
          ...old,
          data: {
            ...old.data,
            tasks: {
              ...tasks,
              assigned: bump(tasks.assigned),
              today: bump(tasks.today),
              overdue: bump(tasks.overdue),
              next: bump(tasks.next),
              upcoming: bump(tasks.upcoming),
              unscheduled: bump(tasks.unscheduled),
              personal: bump(tasks.personal),
              priorities: bump(tasks.priorities),
              done: bump(tasks.done),
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
    onSuccess: (data) => {
      const to = data?.to || data?.task?.status
      const labels = {
        todo: 'Not started',
        in_progress: 'Working on it',
        review: 'Needs check',
        done: 'Finished',
      }
      toast(labels[to] ? `Moved to ${labels[to]}` : 'Status updated', {
        type: 'success',
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['home'] })
    },
  })

  const createPersonalMut = useMutation({
    mutationFn: (title) =>
      api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          isPersonal: true,
          status: 'todo',
          priority: 'medium',
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home'] })
      setPersonalDraft('')
      setCreatePersonal(false)
      toast('Added to Personal List', { type: 'success' })
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

  const meta = VIEW_META[view]

  const openTask = (task) => {
    if (task.isPersonal) {
      setSelected({
        taskId: task._id,
        projectId: null,
        projectName: 'Personal List',
        isPersonal: true,
        title: task.title,
        done: task.status === 'done',
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

  /** ClickUp-style: popup asks Google permission → fetch all events */
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
      toast('Calendar enabled for this workspace', { type: 'success' })
      setSavingClientId(false)
      await connectGoogleCalendar(clientId)
    } catch (e) {
      setSavingClientId(false)
      toast(e.message, { type: 'error' })
    }
  }

  const disconnectGoogleCalendar = async () => {
    clearGcalSession()
    setGcalSession(null)
    setGoogleEvents([])
    toast('Google Calendar disconnected', { type: 'info' })
  }

  const refreshGoogleEvents = async () => {
    if (!gcalSession?.accessToken) return
    await loadGoogleEvents(gcalSession.accessToken)
    toast('Calendar refreshed', { type: 'success' })
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
    const map = {}
    for (const g of STATUS_GROUPS) map[g.key] = []
    for (const t of list) {
      const k = map[t.status] ? t.status : 'todo'
      map[k].push(t)
    }
    return map
  }, [tasks.assigned, assignedSearch])

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

  const shared = {
    tasks,
    home,
    assignedByStatus,
    assignedSearch,
    setAssignedSearch,
    collapsed,
    setCollapsed,
    createPersonal,
    setCreatePersonal,
    personalDraft,
    setPersonalDraft,
    gcalStatus,
    gcalStatusLoading,
    gcalConnected,
    googleEvents,
    gcalEventsLoading,
    connectingGoogle,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    refreshGoogleEvents,
    gcalEmail: gcalSession?.email || '',
    showGcalSetup,
    setShowGcalSetup,
    gcalClientDraft,
    setGcalClientDraft,
    saveClientIdAndConnect,
    savingClientId,
    doneList,
    historySearch,
    setHistorySearch,
    onToggle: (id) => toggleTask.mutate(id),
    onOpenTask: openTask,
    onCreatePersonal: () => {
      if (!personalDraft.trim()) return
      createPersonalMut.mutate(personalDraft.trim())
    },
    creating: createPersonalMut.isPending,
    go: (v) => setParams({ view: v }),
  }

  if (isLoading) {
    return (
      <div className="h-full space-y-5 overflow-y-auto bg-canvas p-4 sm:p-6">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-surface" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[280px] animate-pulse rounded-2xl bg-[var(--panel-dark)]"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[26px] font-semibold tracking-tight text-primary sm:text-[30px]">
                {greeting}
              </p>
              <p className="mt-1 text-[13px] text-secondary">
                Editco Project Management — your day, aligned.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface-raised p-1">
              {FILTER_PILLS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setParams({ view: f.id })}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
                    view === f.id
                      ? 'bg-accent text-[#171717] shadow-sm'
                      : 'text-secondary hover:text-primary',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {view === 'all' && <AllOverview {...shared} />}
          {view === 'assigned' && <AssignedCard {...shared} focus tall />}
          {view === 'today' && <TodayFocus {...shared} />}
          {view === 'personal' && (
            <PersonalCard {...shared} focus tall extras />
          )}
          {view === 'history' && <HistoryCard {...shared} focus tall />}
        </div>
      </div>

      <TaskDetailPanel
        open={!!selected}
        mode="edit"
        taskId={selected?.taskId}
        projectId={
          selected?.isPersonal
            ? undefined
            : selected?.projectId
        }
        projectName={selected?.projectName}
        isPersonal={!!selected?.isPersonal}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

/* ─── ALL: Everything dashboard — exact 6-card grid ─── */

function AllOverview(props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      {/* Row 1 */}
      <AssignedCard {...props} preview />
      <TodayPreview {...props} />
      {/* Row 2 */}
      <PersonalCard {...props} preview />
      <CommentsCard comments={props.home?.assignedComments || []} />
      {/* Row 3 */}
      <PrioritiesCard
        priorities={props.tasks.priorities || []}
        onToggle={props.onToggle}
        onOpenTask={props.onOpenTask}
        onSeeAll={() => props.go('assigned')}
      />
      <AgendaCard
        gcalStatus={props.gcalStatus}
        gcalStatusLoading={props.gcalStatusLoading}
        connected={props.gcalConnected}
        events={props.googleEvents}
        eventsLoading={props.gcalEventsLoading}
        connecting={props.connectingGoogle}
        onConnectGoogle={props.connectGoogleCalendar}
        onDisconnect={props.disconnectGoogleCalendar}
        onRefresh={props.refreshGoogleEvents}
        email={props.gcalEmail}
        showSetup={props.showGcalSetup}
        setShowSetup={props.setShowGcalSetup}
        clientDraft={props.gcalClientDraft}
        setClientDraft={props.setGcalClientDraft}
        onSaveAndConnect={props.saveClientIdAndConnect}
        savingClientId={props.savingClientId}
        cubicAgenda={props.home?.agenda || []}
        onOpenTask={props.onOpenTask}
      />
    </div>
  )
}

function TodayFocus(props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="Overdue"
        accent="#ef4444"
        badge={(props.tasks.overdue || []).length}
        badgeTone="danger"
        tall
      >
        <TaskList
          items={props.tasks.overdue || []}
          empty="You’re clear — nothing overdue."
          onToggle={props.onToggle}
          onOpenTask={props.onOpenTask}
          showPriority
          tone="danger"
        />
      </Card>
      <Card
        title="Today"
        accent="#3ecf8e"
        badge={(props.tasks.today || []).length}
        tall
      >
        <TaskList
          items={props.tasks.today || []}
          empty="No tasks due today."
          onToggle={props.onToggle}
          onOpenTask={props.onOpenTask}
          showPriority
        />
      </Card>
      <AgendaCard
        gcalStatus={props.gcalStatus}
        gcalStatusLoading={props.gcalStatusLoading}
        connected={props.gcalConnected}
        events={props.googleEvents}
        eventsLoading={props.gcalEventsLoading}
        connecting={props.connectingGoogle}
        onConnectGoogle={props.connectGoogleCalendar}
        onDisconnect={props.disconnectGoogleCalendar}
        onRefresh={props.refreshGoogleEvents}
        email={props.gcalEmail}
        showSetup={props.showGcalSetup}
        setShowSetup={props.setShowGcalSetup}
        clientDraft={props.gcalClientDraft}
        setClientDraft={props.setGcalClientDraft}
        onSaveAndConnect={props.saveClientIdAndConnect}
        savingClientId={props.savingClientId}
        cubicAgenda={props.home?.agenda || []}
        onOpenTask={props.onOpenTask}
        className="lg:col-span-2"
      />
    </div>
  )
}

function TodayPreview(props) {
  const overdue = props.tasks.overdue || []
  const today = props.tasks.today || []
  const items = [...overdue, ...today].slice(0, 5)
  return (
    <Card
      title="Today & Overdue"
      accent="#ef4444"
      badge={overdue.length + today.length}
      badgeTone={overdue.length ? 'danger' : undefined}
      action={<SeeAll onClick={() => props.go('today')} />}
    >
      <TaskList
        items={items}
        empty="Nothing due today — you're all caught up."
        onToggle={props.onToggle}
        onOpenTask={props.onOpenTask}
        showPriority
        tone={overdue.length ? 'danger' : undefined}
      />
    </Card>
  )
}

/* ─── Cards ─── */

function AssignedCard({
  assignedByStatus,
  assignedSearch,
  setAssignedSearch,
  collapsed,
  setCollapsed,
  onToggle,
  onOpenTask,
  tasks,
  go,
  preview,
  tall,
  focus,
}) {
  const total = (tasks.assigned || []).length
  const PREVIEW_CAP = 5

  // In preview mode, distribute ~5 visible rows across status groups
  let remaining = PREVIEW_CAP
  const previewGroups = STATUS_GROUPS.map((g) => {
    const all = assignedByStatus[g.key] || []
    if (!preview) return { ...g, items: all }
    const take = Math.min(all.length, remaining)
    remaining -= take
    return { ...g, items: all.slice(0, take) }
  }).filter((g) => g.items.length > 0 || (!preview && !assignedSearch))

  return (
    <Card
      title="Assigned to me"
      accent="#3b82f6"
      badge={total}
      tall={tall || focus}
      className={focus || tall ? 'mx-auto w-full max-w-5xl' : undefined}
      action={
        <div className="flex items-center gap-1.5">
          {!preview && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
              <input
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                placeholder="Filter"
                className="h-7 w-[120px] rounded-md border border-white/10 bg-white/5 pl-7 pr-2 text-[12px] text-white outline-none placeholder:text-white/40 focus:border-white/20"
              />
            </div>
          )}
          {preview && <SeeAll onClick={() => go('assigned')} />}
        </div>
      }
    >
      {total === 0 ? (
        <EmptyArt
          icon={<Circle className="h-7 w-7 text-white/40" strokeWidth={1.4} />}
          text="No open tasks assigned to you."
        />
      ) : (
        (preview ? previewGroups : STATUS_GROUPS).map((g) => {
          const items = preview ? g.items : assignedByStatus[g.key] || []
          if (!items.length) return null
          const open = preview ? true : !collapsed[g.key]
          return (
            <div key={g.key} className="mb-1">
              {!preview && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))
                  }
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-[#ecfdf5]"
                >
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[#6b6b70]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[#6b6b70]" />
                  )}
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                    style={{ background: `${g.tint}22`, color: g.tint }}
                  >
                    {g.label}
                  </span>
                  <span className="text-[11px] text-[#6b6b70]">
                    {(assignedByStatus[g.key] || []).length}
                  </span>
                </button>
              )}
              {preview && (
                <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b6b70]">
                  {g.label}
                </div>
              )}
              {open &&
                items.map((t) => (
                  <TaskLine
                    key={t._id}
                    task={t}
                    onToggle={() => onToggle(t._id)}
                    onOpen={() => onOpenTask(t)}
                    showPriority
                  />
                ))}
            </div>
          )
        })
      )}
    </Card>
  )
}

function PersonalCard({
  tasks,
  home,
  onToggle,
  onOpenTask,
  createPersonal,
  setCreatePersonal,
  personalDraft,
  setPersonalDraft,
  onCreatePersonal,
  creating,
  go,
  preview,
  tall,
  focus,
  extras,
}) {
  const personal = tasks.personal || []

  const composer = createPersonal ? (
    <form
      className="mt-2 flex gap-2 border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault()
        onCreatePersonal()
      }}
    >
      <input
        autoFocus
        value={personalDraft}
        onChange={(e) => setPersonalDraft(e.target.value)}
        placeholder="What do you need to do?"
        className="h-9 flex-1 rounded-md border border-border bg-[#F4F7FB] px-3 text-[13px] outline-none focus:border-[#c7c7c7]"
      />
      <button
        type="submit"
        disabled={creating || !personalDraft.trim()}
        className="h-9 rounded-md bg-[#3ecf8e] px-3 text-[12px] font-semibold text-white hover:bg-[#24b47e] disabled:opacity-40"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setCreatePersonal(false)
          setPersonalDraft('')
        }}
        className="h-9 rounded-md px-2 text-[#8b8b90] hover:bg-surface-raised"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setCreatePersonal(true)}
      className="mt-2 flex items-center gap-1.5 rounded-md px-1 py-2 text-[12px] text-[#8b8b90] hover:bg-surface-raised hover:text-primary"
    >
      <Plus className="h-3.5 w-3.5" />
      Create a task
    </button>
  )

  const body =
    personal.length === 0 && !createPersonal ? (
      <EmptyArt
        icon={
          <BookHeart className="h-7 w-7 text-[#8b8b90]" strokeWidth={1.4} />
        }
        text="Personal List is a home for your private tasks."
        action={
          <button
            type="button"
            onClick={() => setCreatePersonal(true)}
            className="mt-3 rounded-md bg-[#3ecf8e] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#24b47e]"
          >
            + Create a task
          </button>
        }
      />
    ) : (
      <div className="flex h-full flex-col">
        <TaskList
          items={preview ? personal.slice(0, 5) : personal}
          empty=""
          onToggle={onToggle}
          onOpenTask={onOpenTask}
          showProject={false}
        />
        {composer}
      </div>
    )

  if (extras && (focus || tall)) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2">
        <Card
          title="Personal List"
          accent="#22c55e"
          badge={personal.length}
          tall
          info="Private to you — only you can see this list"
        >
          {body}
        </Card>
        <CommentsCard comments={home?.assignedComments || []} />
      </div>
    )
  }

  return (
    <Card
      title="Personal List"
      accent="#22c55e"
      badge={personal.length}
      tall={tall || focus}
      info="Private to you — only you can see this list"
      action={preview ? <SeeAll onClick={() => go('personal')} /> : null}
    >
      {body}
    </Card>
  )
}

function HistoryCard({
  doneList,
  historySearch,
  setHistorySearch,
  onToggle,
  onOpenTask,
  go,
  preview,
  tall,
  focus,
  tasks,
}) {
  const total = (tasks.done || []).length
  const items = preview ? doneList.slice(0, 6) : doneList

  return (
    <Card
      title="Done history"
      accent="#10b981"
      badge={total}
      tall={tall || focus}
      className={focus || tall ? 'mx-auto w-full max-w-5xl' : undefined}
      info="Completed tasks — click to reopen"
      action={
        <div className="flex items-center gap-1.5">
          {!preview && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b6b70]" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history"
                className="h-7 w-[140px] rounded-md border border-border bg-surface-raised pl-7 pr-2 text-[12px] outline-none focus:border-[#c7c7c7]"
              />
            </div>
          )}
          {preview && <SeeAll onClick={() => go('history')} />}
        </div>
      }
    >
      {items.length === 0 ? (
        <EmptyArt
          icon={
            <History className="h-7 w-7 text-[#8b8b90]" strokeWidth={1.4} />
          }
          text="Mark tasks done and they’ll land here as your history."
          action={
            preview ? null : (
              <button
                type="button"
                onClick={() => go('all')}
                className="mt-3 text-[12px] text-[#3ecf8e] hover:underline"
              >
                Back to all my tasks
              </button>
            )
          }
        />
      ) : (
        <ul className="space-y-0.5">
          {items.map((t) => (
            <li
              key={t._id}
              className="group flex items-center gap-2 rounded-lg px-1.5 py-2 transition-colors hover:bg-[#ecfdf5]"
            >
              <button
                type="button"
                onClick={() => onToggle(t._id)}
                className="shrink-0 text-emerald-600 hover:text-accent"
                title="Reopen"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenTask(t)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-[13px] text-[#8b8b90] line-through">
                  {t.title}
                </p>
                <p className="truncate text-[11px] text-[#6b6b70]">
                  {t.isPersonal
                    ? 'Personal List'
                    : t.projectId?.name || 'Task'}
                  {t.updatedAt
                    ? ` · ${formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}`
                    : ''}
                </p>
              </button>
              {t.isPersonal && (
                <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[10px] text-[#8b8b90]">
                  Personal
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function CommentsCard({ comments = [] }) {
  const list = comments
  return (
    <Card
      title="Assigned comments"
      accent="#8b5cf6"
      badge={list.length}
      action={
        <Link
          to="/assigned-comments"
          className="text-[11px] font-medium text-[#3ecf8e] hover:underline"
        >
          Open all
        </Link>
      }
    >
      {list.length === 0 ? (
        <EmptyArt
          icon={
            <MessageSquare
              className="h-7 w-7 text-[#8b8b90]"
              strokeWidth={1.4}
            />
          }
          text="You don't have any assigned comments."
        />
      ) : (
        <ul className="space-y-1">
          {list.slice(0, 5).map((c) => {
            const task = c.taskId
            const projectId =
              typeof task?.projectId === 'object'
                ? task.projectId?._id
                : task?.projectId
            const href =
              projectId && task?._id
                ? `/projects/${projectId}/tasks?task=${task._id}`
                : '/assigned-comments'
            return (
              <li key={c._id}>
                <Link
                  to={href}
                  className="block rounded-lg px-2 py-2 hover:bg-surface-raised"
                >
                  <div className="flex gap-2.5">
                    <Avatar
                      src={c.author?.avatar}
                      name={c.author?.name}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-[#8b8b90]">
                        <span className="font-medium text-primary">
                          {c.author?.name}
                        </span>
                        {task?.title ? ` · ${task.title}` : ''}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-[#d4d4d8]">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function PrioritiesCard({ priorities, onToggle, onOpenTask, onSeeAll }) {
  return (
    <Card
      title="Priorities"
      accent="#ef4444"
      badge={priorities.length}
      info="Urgent & high priority across all your work"
      action={onSeeAll ? <SeeAll onClick={onSeeAll} /> : null}
    >
      <TaskList
        items={(priorities || []).slice(0, 5)}
        empty="No urgent or high-priority tasks."
        onToggle={onToggle}
        onOpenTask={onOpenTask}
        showPriority
      />
    </Card>
  )
}

function AgendaCard({
  gcalStatusLoading,
  connected,
  events,
  eventsLoading,
  connecting,
  onConnectGoogle,
  onDisconnect,
  onRefresh,
  email = '',
  showSetup,
  setShowSetup,
  clientDraft,
  setClientDraft,
  onSaveAndConnect,
  savingClientId,
  cubicAgenda = [],
  onOpenTask,
  className,
}) {
  return (
    <Card
      title="Agenda"
      accent="#a855f7"
      badge={connected ? events.length : undefined}
      className={cn('min-h-[280px]', className)}
      action={
        connected ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] text-[#8b8b90] hover:text-primary"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-[11px] text-[#8b8b90] hover:text-primary"
            >
              Disconnect
            </button>
          </div>
        ) : null
      }
    >
      {gcalStatusLoading ? (
        <p className="py-10 text-center text-[13px] text-[#6b6b70]">
          Checking calendar…
        </p>
      ) : !connected ? (
        <div className="flex flex-col items-center px-3 py-8 text-center">
          <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-raised">
            <Calendar className="h-7 w-7 text-[#a855f7]" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-semibold text-primary">
            Connect your Google Calendar
          </p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#8b8b90]">
            Click Connect — Google asks you to sign in and allow calendar
            access. Your events then appear here.
          </p>

          {showSetup ? (
            <div className="mt-4 w-full rounded-xl border border-border bg-[#F4F7FB] p-4 text-left">
              <p className="text-[13px] font-medium text-primary">
                One-time workspace setup
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#8b8b90]">
                Create an OAuth Client ID in Google Cloud (Web application),
                add origin{' '}
                <code className="text-secondary">http://localhost:5173</code>,
                enable Calendar API, then paste the Client ID below.
              </p>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[12px] text-[#3ecf8e] hover:underline"
              >
                Open Google Cloud Credentials →
              </a>
              <input
                value={clientDraft}
                onChange={(e) => setClientDraft(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
                className="mt-3 h-10 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-primary outline-none placeholder:text-secondary focus:border-[#4ade80]"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingClientId || connecting}
                  onClick={onSaveAndConnect}
                  className="rounded-md bg-[#3ecf8e] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#24b47e] disabled:opacity-50"
                >
                  {savingClientId || connecting
                    ? 'Working…'
                    : 'Save & connect Google'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="rounded-md px-3 py-2 text-[12px] text-[#8b8b90] hover:bg-surface-raised hover:text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={connecting}
              onClick={() => onConnectGoogle()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-[#F4F7FB] px-4 py-2.5 text-[13px] text-primary hover:bg-surface-raised disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {connecting ? 'Opening Google…' : 'Connect'}
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-[#F4F7FB] px-3 py-2 text-[12px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-secondary">
              Connected to{' '}
              <strong className="text-primary">Google Calendar</strong>
              {email ? ` · ${email}` : ''}
            </span>
          </div>

          {eventsLoading ? (
            <p className="py-8 text-center text-[13px] text-[#6b6b70]">
              Loading events from Google…
            </p>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#6b6b70]">
              No upcoming events for the next 30 days.
            </p>
          ) : (
            <ul className="max-h-[320px] space-y-0.5 overflow-y-auto">
              {events.slice(0, 8).map((ev) => {
                const d = new Date(ev.start)
                const timeLabel = ev.allDay ? 'All day' : format(d, 'h:mm a')
                const dayLabel = isToday(d)
                  ? 'Today'
                  : isYesterday(d)
                    ? 'Yesterday'
                    : isTomorrow(d)
                      ? 'Tomorrow'
                      : format(d, 'EEE, MMM d')
                return (
                  <li key={`${ev.calendarId}-${ev.id}-${ev.start}`}>
                    <a
                      href={ev.htmlLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-raised"
                    >
                      <div
                        className="mt-1 h-8 w-1 shrink-0 rounded-full"
                        style={{ background: ev.calendarColor || '#a855f7' }}
                      />
                      <div className="w-[88px] shrink-0">
                        <p className="text-[12px] font-medium text-[#c4b5fd]">
                          {dayLabel}
                        </p>
                        <p className="text-[11px] text-[#6b6b70]">{timeLabel}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-primary">
                          {ev.title}
                        </p>
                        <p className="truncate text-[11px] text-[#6b6b70]">
                          {ev.calendarName}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </p>
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}

          {cubicAgenda.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b6b70]">
                EPM due dates
              </p>
              {cubicAgenda.slice(0, 5).map((t) => {
                const d = new Date(t.dueDate)
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => onOpenTask(t)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-raised"
                  >
                    <span className="w-[88px] shrink-0 text-[12px] font-medium text-[#3ecf8e]">
                      {isToday(d) ? 'Today' : format(d, 'MMM d')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-primary">
                      {t.title}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/* ─── Shared bits ─── */

function Card({
  title,
  children,
  action,
  info,
  accent,
  badge,
  badgeTone,
  titleIcon,
  tall,
  className,
}) {
  return (
    <section
      className={cn(
        'on-dark flex flex-col overflow-hidden rounded-2xl bg-[var(--panel-dark)] shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
        tall ? 'min-h-[420px]' : 'min-h-[280px]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[var(--panel-dark-raised)] px-4 py-3">
        {accent && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: accent }}
          />
        )}
        {titleIcon}
        <h2 className="text-[13px] font-semibold text-white">{title}</h2>
        {typeof badge === 'number' && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              badgeTone === 'danger'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-white/10 text-white/70',
            )}
          >
            {badge}
          </span>
        )}
        {info && (
          <span title={info} className="text-white/50">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="ml-auto">{action}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5 text-white/80">{children}</div>
    </section>
  )
}

function SeeAll({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-medium text-[#3ecf8e] hover:underline"
    >
      See all
    </button>
  )
}

function EmptyArt({ icon, text, action }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
        {icon}
      </div>
      <p className="max-w-[260px] text-[13px] leading-relaxed text-white/55">
        {text}
      </p>
      {action}
    </div>
  )
}

function TaskList({
  items,
  empty,
  onToggle,
  onOpenTask,
  showPriority,
  showProject = true,
  tone,
}) {
  if (!items.length) {
    return empty ? (
      <p className="py-8 text-center text-[13px] text-[#6b6b70]">{empty}</p>
    ) : null
  }
  return items.map((t) => (
    <TaskLine
      key={t._id}
      task={t}
      onToggle={() => onToggle(t._id)}
      onOpen={() => onOpenTask(t)}
      showPriority={showPriority}
      showProject={showProject}
      tone={tone}
    />
  ))
}

function TaskLine({
  task,
  onToggle,
  onOpen,
  showPriority,
  showProject = true,
  tone,
}) {
  const status = task.status || 'todo'
  const done = status === 'done'
  const nextLabel =
    status === 'todo'
      ? 'Working on it'
      : status === 'in_progress'
        ? 'Needs check'
        : status === 'review'
          ? 'Finished'
          : 'Not started'

  return (
    <div className="group flex items-center gap-2 rounded-lg px-1.5 py-2 transition-colors hover:bg-[#ecfdf5]">
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0"
        title={`Move to ${nextLabel}`}
        aria-label={`Move to ${nextLabel}`}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : status === 'in_progress' ? (
          <Circle
            className="h-4 w-4 fill-blue-500/25 text-blue-600"
            strokeWidth={2.5}
          />
        ) : status === 'review' ? (
          <Circle
            className="h-4 w-4 fill-amber-500/30 text-amber-600"
            strokeWidth={2.5}
          />
        ) : (
          <Circle className="h-4 w-4 text-[#6b6b70]" />
        )}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            'truncate text-[13px] text-primary',
            done && 'text-[#6b6b70] line-through',
            tone === 'danger' && !done && 'text-red-600',
          )}
        >
          {task.title}
        </p>
        {showProject && task.projectId?.name && (
          <p className="truncate text-[11px] text-[#6b6b70]">
            {task.projectId.name}
          </p>
        )}
      </button>
      {showPriority && <PriorityPill priority={task.priority} />}
      <DueChip dueDate={task.dueDate} danger={tone === 'danger'} />
    </div>
  )
}

function PriorityPill({ priority }) {
  if (!priority || priority === 'low' || priority === 'medium') return null
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color: meta.color, background: meta.bg }}
    >
      <Flag className="h-2.5 w-2.5" fill={meta.color} />
      {meta.label}
    </span>
  )
}

function DueChip({ dueDate, danger }) {
  if (!dueDate) return null
  const d = new Date(dueDate)
  const overdue = isBefore(d, startOfDay(new Date()))
  let label = format(d, 'MMM d')
  if (isToday(d)) label = 'Today'
  else if (isYesterday(d)) label = 'Yesterday'
  else if (isTomorrow(d)) label = 'Tomorrow'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[11px]',
        danger || overdue || isToday(d) ? 'text-red-600' : 'text-[#8b8b90]',
      )}
    >
      <Calendar className="h-3 w-3" />
      {label}
    </span>
  )
}
