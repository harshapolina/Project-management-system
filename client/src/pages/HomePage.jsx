import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format,
  isToday,
  isYesterday,
  isBefore,
  startOfDay,
  formatDistanceToNow,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
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
  Sparkles,
  BookHeart,
  X,
  History,
} from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { Avatar, toast } from '../components/ui'
import { TaskDetailPanel } from './project/TaskDetailPanel'
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
    : 'all'

  useEffect(() => {
    if (!rawView || !VIEW_META[rawView]) {
      const next = new URLSearchParams(params)
      next.set('view', 'all')
      setParams(next, { replace: true })
    }
  }, [rawView, setParams, params])

  useEffect(() => {
    if (params.get('create') !== '1') return
    setCreatePersonal(true)
    const next = new URLSearchParams(params)
    next.delete('create')
    setParams(next, { replace: true })
  }, [params, setParams])

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
    if (!next.get('view')) next.set('view', 'all')
    setParams(next, { replace: true })
  }, [params, setParams, qc])

  const [selected, setSelected] = useState(null)
  const [createPersonal, setCreatePersonal] = useState(false)
  const [personalDraft, setPersonalDraft] = useState('')
  const [standup, setStandup] = useState('')
  const [standupBusy, setStandupBusy] = useState(false)
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
  })

  const { data: gcalStatus, isLoading: gcalStatusLoading } = useQuery({
    queryKey: ['gcal-status'],
    queryFn: () => api('/calendar/google/status'),
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
    if (gcalSession?.accessToken) {
      loadGoogleEvents(gcalSession.accessToken)
    } else {
      setGoogleEvents([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcalSession?.accessToken])

  const toggleTask = useMutation({
    mutationFn: (id) => api(`/tasks/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['home'] })
      const wasDone = (tasks.done || []).some((t) => t._id === id)
      toast(wasDone ? 'Reopened' : 'Marked done — see Done history', {
        type: 'success',
      })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
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

  const generateStandup = () => {
    setStandupBusy(true)
    const todayN = (tasks.today || []).length
    const overdueN = (tasks.overdue || []).length
    const nextN = (tasks.next || []).length
    const doneN = (tasks.done || []).length
    const pri = (tasks.priorities || []).slice(0, 3)
    const commentsN = (home?.assignedComments || []).length
    const lines = [
      `Stand-up for ${firstName} · ${format(new Date(), 'EEE, MMM d')}`,
      '',
      `Completed recently: ${doneN} in Done history.`,
      `Carry-over: ${overdueN} overdue.`,
      `Today: ${todayN} due.`,
      `Next: ${nextN} in the next two weeks.`,
      commentsN
        ? `Open assigned comments: ${commentsN}.`
        : 'No open assigned comments.',
      '',
      'Top priorities:',
      ...(pri.length
        ? pri.map(
            (t, i) =>
              `  ${i + 1}. [${(t.priority || 'medium').toUpperCase()}] ${t.title}`,
          )
        : ['  None flagged urgent/high right now.']),
    ]
    window.setTimeout(() => {
      setStandup(lines.join('\n'))
      setStandupBusy(false)
      toast('Daily summary ready', { type: 'success' })
    }, 450)
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
    standup,
    standupBusy,
    generateStandup,
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
      <div className="h-full space-y-4 overflow-y-auto p-3 sm:p-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#1c1c1e]" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[280px] animate-pulse rounded-xl bg-[#1c1c1e]"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#121214]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#2e2e32] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight text-white">
              My Tasks
            </h1>
            <span className="rounded-full bg-[#252528] px-2 py-0.5 text-[11px] text-[#8b8b90]">
              {meta.title}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#6b6b70]">{meta.hint}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[#2e2e32] bg-[#1c1c1e] p-0.5">
          {FILTER_PILLS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setParams({ view: f.id })}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                view === f.id
                  ? 'bg-[#2a2a2e] text-white shadow-sm'
                  : 'text-[#8b8b90] hover:text-white',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
        <motion.p
          key={view}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 text-[22px] font-semibold tracking-tight text-white"
        >
          {greeting}
        </motion.p>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {view === 'all' && <AllOverview {...shared} />}
            {view === 'assigned' && (
              <AssignedCard {...shared} focus tall />
            )}
            {view === 'today' && <TodayFocus {...shared} />}
            {view === 'personal' && (
              <PersonalCard {...shared} focus tall extras />
            )}
            {view === 'history' && <HistoryCard {...shared} focus tall />}
          </motion.div>
        </AnimatePresence>
      </div>

      <TaskDetailPanel
        open={!!selected && !selected.isPersonal && !!selected.projectId}
        mode="edit"
        taskId={selected?.taskId}
        projectId={selected?.projectId}
        projectName={selected?.projectName}
        onClose={() => setSelected(null)}
      />

      <AnimatePresence>
        {selected?.isPersonal && (
          <PersonalQuickSheet
            task={selected}
            onClose={() => setSelected(null)}
            onComplete={() => {
              toggleTask.mutate(selected.taskId)
              setSelected(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── ALL: every card related to me ─── */

function AllOverview(props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AssignedCard {...props} preview />
      <TodayPreview {...props} />
      <PersonalCard {...props} preview />
      <CommentsCard comments={props.home?.assignedComments || []} />
      <PrioritiesCard
        priorities={props.tasks.priorities || []}
        onToggle={props.onToggle}
        onOpenTask={props.onOpenTask}
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
      <StandupCard
        standup={props.standup}
        busy={props.standupBusy}
        onGenerate={props.generateStandup}
      />
      <HistoryCard {...props} preview />
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
        accent="#C6FF3D"
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
  const items = [...overdue, ...today].slice(0, 6)
  return (
    <Card
      title="Today & Overdue"
      accent="#f59e0b"
      badge={overdue.length + today.length}
      badgeTone={overdue.length ? 'danger' : undefined}
      action={<SeeAll onClick={() => props.go('today')} />}
    >
      <TaskList
        items={items}
        empty="Nothing due today or overdue."
        onToggle={props.onToggle}
        onOpenTask={props.onOpenTask}
        showPriority
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
  return (
    <Card
      title="Assigned to me"
      accent="#3b82f6"
      badge={total}
      tall={tall || focus}
      action={
        <div className="flex items-center gap-1.5">
          {!preview && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b6b70]" />
              <input
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                placeholder="Filter"
                className="h-7 w-[120px] rounded-md border border-[#2e2e32] bg-[#121214] pl-7 pr-2 text-[12px] outline-none focus:border-[#3a3a3e]"
              />
            </div>
          )}
          {preview && <SeeAll onClick={() => go('assigned')} />}
        </div>
      }
    >
      {total === 0 ? (
        <EmptyArt
          icon={<Circle className="h-7 w-7 text-[#8b8b90]" strokeWidth={1.4} />}
          text="No open tasks assigned to you."
        />
      ) : (
        STATUS_GROUPS.map((g) => {
          let items = assignedByStatus[g.key] || []
          if (preview) items = items.slice(0, 4)
          if (!items.length && (preview || assignedSearch)) return null
          if (preview && !items.length) return null
          const open = preview ? true : !collapsed[g.key]
          return (
            <div key={g.key} className="mb-1">
              {!preview && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))
                  }
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[#252528]/60"
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
              {preview && items.length > 0 && (
                <div className="mb-1 px-1 text-[10px] font-bold tracking-wide text-[#6b6b70]">
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
      className="mt-2 flex gap-2 border-t border-[#2e2e32] pt-3"
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
        className="h-9 flex-1 rounded-md border border-[#2e2e32] bg-[#121214] px-3 text-[13px] outline-none focus:border-[#3a3a3e]"
      />
      <button
        type="submit"
        disabled={creating || !personalDraft.trim()}
        className="h-9 rounded-md bg-white px-3 text-[12px] font-semibold text-[#0E0E10] disabled:opacity-40"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setCreatePersonal(false)
          setPersonalDraft('')
        }}
        className="h-9 rounded-md px-2 text-[#8b8b90] hover:bg-[#252528]"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setCreatePersonal(true)}
      className="mt-2 flex items-center gap-1.5 rounded-md px-1 py-2 text-[12px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
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
            className="mt-3 rounded-md bg-white px-3 py-2 text-[12px] font-semibold text-[#0E0E10]"
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
          accent="#C6FF3D"
          badge={personal.length}
          tall
          info="Private to you"
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
      accent="#C6FF3D"
      badge={personal.length}
      tall={tall || focus}
      info="Private to you"
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
                className="h-7 w-[140px] rounded-md border border-[#2e2e32] bg-[#121214] pl-7 pr-2 text-[12px] outline-none focus:border-[#3a3a3e]"
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
                className="mt-3 text-[12px] text-[#9b8cff] hover:underline"
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
              className="group flex items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-[#252528]/80"
            >
              <button
                type="button"
                onClick={() => onToggle(t._id)}
                className="shrink-0 text-emerald-400 hover:text-accent"
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
                <span className="rounded bg-[#252528] px-1.5 py-0.5 text-[10px] text-[#8b8b90]">
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
      accent="#7c9cff"
      badge={list.length}
      action={
        <Link
          to="/assigned-comments"
          className="text-[11px] text-[#9b8cff] hover:underline"
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
          text="You don’t have any assigned comments."
        />
      ) : (
        <ul className="space-y-1">
          {list.slice(0, 8).map((c) => {
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
                  className="block rounded-lg px-2 py-2 hover:bg-[#252528]"
                >
                  <div className="flex gap-2.5">
                    <Avatar
                      src={c.author?.avatar}
                      name={c.author?.name}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-[#8b8b90]">
                        <span className="font-medium text-[#e8e8ea]">
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

function PrioritiesCard({ priorities, onToggle, onOpenTask }) {
  return (
    <Card
      title="Priorities"
      accent="#ef4444"
      badge={priorities.length}
      info="Urgent & high"
    >
      <TaskList
        items={priorities}
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
      accent="#7B68EE"
      badge={connected ? events.length : undefined}
      className={cn('min-h-[320px]', className)}
      action={
        connected ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] text-[#8b8b90] hover:text-white"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-[11px] text-[#8b8b90] hover:text-white"
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
        <div className="flex flex-col items-center px-3 py-8 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
          <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#252528] sm:mb-0">
            <Calendar className="h-7 w-7 text-[#9b8cff]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-white">
              Connect your Google Calendar
            </p>
            <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-[#8b8b90]">
              Click Connect — Google asks you to sign in and allow calendar
              access. Your events then appear here.
            </p>

            {showSetup ? (
              <div className="mt-4 rounded-xl border border-[#2e2e32] bg-[#121214] p-4 text-left">
                <p className="text-[13px] font-medium text-white">
                  One-time workspace setup
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#8b8b90]">
                  Create an OAuth Client ID in Google Cloud (Web application),
                  add origin{' '}
                  <code className="text-[#c5c5c8]">http://localhost:5173</code>,
                  enable Calendar API, then paste the Client ID below. Teammates
                  never do this — they only click Connect.
                </p>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[12px] text-[#9b8cff] hover:underline"
                >
                  Open Google Cloud Credentials →
                </a>
                <input
                  value={clientDraft}
                  onChange={(e) => setClientDraft(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="mt-3 h-10 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-3 text-[13px] text-white outline-none focus:border-[#7B68EE]"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingClientId || connecting}
                    onClick={onSaveAndConnect}
                    className="rounded-md bg-[#7B68EE] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#6a58d9] disabled:opacity-50"
                  >
                    {savingClientId || connecting
                      ? 'Working…'
                      : 'Save & connect Google'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSetup(false)}
                    className="rounded-md px-3 py-2 text-[12px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={connecting}
                  onClick={() => onConnectGoogle()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2e2e32] bg-[#121214] px-3 py-2.5 text-[13px] text-[#e8e8ea] hover:bg-[#252528] disabled:opacity-50"
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
                  {connecting ? 'Opening Google…' : 'Google Calendar'}
                  <span className="rounded bg-[#7B68EE] px-2 py-0.5 text-[11px] font-semibold text-white">
                    Connect
                  </span>
                </button>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2e2e32] px-3 py-2.5 text-[13px] text-[#6b6b70] opacity-60"
                >
                  Microsoft Outlook
                  <span className="rounded bg-[#2a2a2e] px-2 py-0.5 text-[11px]">
                    Soon
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#2e2e32] bg-[#121214] px-3 py-2 text-[12px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[#c5c5c8]">
              Connected to{' '}
              <strong className="text-white">Google Calendar</strong>
              {email ? ` · ${email}` : ''}
            </span>
            <span className="text-[#6b6b70]">· next 30 days</span>
          </div>

          {eventsLoading ? (
            <p className="py-8 text-center text-[13px] text-[#6b6b70]">
              Loading events from Google…
            </p>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#6b6b70]">
              No upcoming events in your Google calendars for the next 30 days.
            </p>
          ) : (
            <ul className="max-h-[360px] space-y-0.5 overflow-y-auto">
              {events.map((ev) => {
                const d = new Date(ev.start)
                const timeLabel = ev.allDay ? 'All day' : format(d, 'h:mm a')
                const dayLabel = isToday(d)
                  ? 'Today'
                  : isYesterday(d)
                    ? 'Yesterday'
                    : format(d, 'EEE, MMM d')
                return (
                  <li key={`${ev.calendarId}-${ev.id}-${ev.start}`}>
                    <a
                      href={ev.htmlLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[#252528]"
                    >
                      <div
                        className="mt-1 h-8 w-1 shrink-0 rounded-full"
                        style={{ background: ev.calendarColor || '#7B68EE' }}
                      />
                      <div className="w-[88px] shrink-0">
                        <p className="text-[12px] font-medium text-[#9b8cff]">
                          {dayLabel}
                        </p>
                        <p className="text-[11px] text-[#6b6b70]">{timeLabel}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-[#e8e8ea]">
                          {ev.title}
                        </p>
                        <p className="truncate text-[11px] text-[#6b6b70]">
                          {ev.calendarName}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </p>
                        {ev.hangoutLink && (
                          <span className="mt-0.5 inline-block text-[11px] text-[#34A853]">
                            Meet link available
                          </span>
                        )}
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}

          {cubicAgenda.length > 0 && (
            <div className="mt-4 border-t border-[#2e2e32] pt-3">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b6b70]">
                Cubic due dates
              </p>
              {cubicAgenda.slice(0, 6).map((t) => {
                const d = new Date(t.dueDate)
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => onOpenTask(t)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#252528]"
                  >
                    <span className="w-[88px] shrink-0 text-[12px] text-[#C6FF3D]">
                      {isToday(d) ? 'Today' : format(d, 'MMM d')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#e8e8ea]">
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


function StandupCard({ standup, busy, onGenerate }) {
  return (
    <Card
      title="Daily summary"
      accent="#a78bfa"
      titleIcon={<Sparkles className="mr-1.5 h-3.5 w-3.5 text-[#a78bfa]" />}
    >
      {!standup ? (
        <EmptyArt
          icon={
            <Sparkles className="h-7 w-7 text-[#a78bfa]" strokeWidth={1.4} />
          }
          text="Generate a daily stand-up from your tasks & history."
          action={
            <button
              type="button"
              disabled={busy}
              onClick={onGenerate}
              className="mt-3 rounded-md bg-[#7B68EE] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Generating…' : 'Generate summary'}
            </button>
          }
        />
      ) : (
        <div>
          <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#121214] p-3 font-sans text-[12px] leading-relaxed text-[#d4d4d8]">
            {standup}
          </pre>
          <button
            type="button"
            onClick={onGenerate}
            className="mt-2 text-[12px] text-[#9b8cff] hover:underline"
          >
            Refresh
          </button>
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
        'flex flex-col overflow-hidden rounded-xl border border-[#2e2e32] bg-[#1c1c1e]',
        tall ? 'min-h-[420px]' : 'min-h-[260px]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[#2e2e32] px-3.5 py-2.5">
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
                ? 'bg-red-500/15 text-red-400'
                : 'bg-[#252528] text-[#8b8b90]',
            )}
          >
            {badge}
          </span>
        )}
        {info && (
          <span title={info} className="text-[#6b6b70]">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="ml-auto">{action}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
  )
}

function SeeAll({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-medium text-[#9b8cff] hover:underline"
    >
      See all
    </button>
  )
}

function EmptyArt({ icon, text, action }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#252528]">
        {icon}
      </div>
      <p className="max-w-[260px] text-[13px] leading-relaxed text-[#8b8b90]">
        {text}
      </p>
      {action}
    </div>
  )
}

function ConnectBtn({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-[#2e2e32] bg-[#121214] px-3 py-2 text-[12px] text-[#e8e8ea] hover:bg-[#252528]"
    >
      {label}
      <span className="rounded bg-[#7B68EE] px-2 py-0.5 text-[11px] font-semibold text-white">
        Connect
      </span>
    </button>
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
  const done = task.status === 'done'
  return (
    <div className="group flex items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-[#252528]/80">
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 text-[#6b6b70] hover:text-accent"
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-accent" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            'truncate text-[13px] text-[#e8e8ea]',
            done && 'text-[#6b6b70] line-through',
            tone === 'danger' && !done && 'text-[#fecaca]',
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
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[11px]',
        danger || overdue ? 'text-red-400' : 'text-[#8b8b90]',
      )}
    >
      <Calendar className="h-3 w-3" />
      {label}
    </span>
  )
}

function PersonalQuickSheet({ task, onClose, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#2e2e32] bg-[#1c1c1e] p-5 shadow-2xl"
      >
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#6b6b70]">
          Personal List
        </div>
        <h3 className="text-[16px] font-semibold text-white">{task.title}</h3>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onComplete}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-[13px] font-semibold text-[#0E0E10]"
          >
            <CheckCircle2 className="h-4 w-4" />
            {task.done ? 'Reopen' : 'Mark complete'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2e2e32] px-4 text-[13px] text-[#c5c5c8] hover:bg-[#252528]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
