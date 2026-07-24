import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  CheckSquare,
  Folder,
  User as UserIcon,
  Copy,
  UserPlus,
  Send,
  Keyboard,
  MousePointerClick,
  CalendarDays,
  Sun,
  ListChecks,
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Modal, Drawer, toast } from '../ui'
import { cn } from '../../lib/utils'

/* ─────────────────────────── Global Search ─────────────────────────── */

export function GlobalSearchModal({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const { data: homeData } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
    enabled: open,
  })
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api('/projects'),
    enabled: open,
  })
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const q = query.trim().toLowerCase()

  const taskResults = useMemo(() => {
    if (!q) return []
    const buckets = homeData?.data?.tasks || {}
    const map = new Map()
    for (const list of Object.values(buckets)) {
      if (!Array.isArray(list)) continue
      for (const t of list) {
        if (t?.title?.toLowerCase().includes(q)) map.set(t._id, t)
      }
    }
    return [...map.values()].slice(0, 8)
  }, [homeData, q])

  const projectResults = useMemo(() => {
    if (!q) return []
    const projects = projectsData?.projects || []
    return projects
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [projectsData, q])

  const userResults = useMemo(() => {
    if (!q) return []
    const users = usersData?.users || []
    return users
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [usersData, q])

  const openTask = (task) => {
    const projectId =
      typeof task.projectId === 'object' ? task.projectId?._id : task.projectId
    onClose?.()
    if (task.isPersonal) {
      navigate('/?view=personal')
    } else if (projectId) {
      navigate(`/projects/${projectId}/tasks`, { state: { taskId: task._id } })
    } else {
      navigate('/?view=all')
    }
  }

  const openProject = (project) => {
    onClose?.()
    navigate(`/projects/${project._id}`)
  }

  const openUser = (user) => {
    onClose?.()
    toast(`${user.name} · ${user.email}`, { type: 'info' })
  }

  const flatResults = useMemo(
    () => [
      ...taskResults.map((item) => ({ type: 'task', item })),
      ...projectResults.map((item) => ({ type: 'project', item })),
      ...userResults.map((item) => ({ type: 'user', item })),
    ],
    [taskResults, projectResults, userResults],
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const activate = (entry) => {
    if (!entry) return
    if (entry.type === 'task') openTask(entry.item)
    else if (entry.type === 'project') openProject(entry.item)
    else if (entry.type === 'user') openUser(entry.item)
  }

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      activate(flatResults[activeIndex])
    }
  }

  let runningIndex = -1

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-[#2e2e32] bg-[#1c1c1e] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-[#2e2e32] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#8b8b90]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search tasks, projects, people…"
                className="h-6 w-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#6b6b70]"
              />
              <kbd className="shrink-0 rounded border border-[#2e2e32] bg-[#121214] px-1.5 py-0.5 text-[10px] text-[#6b6b70]">
                Esc
              </kbd>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!q && (
                <p className="px-3 py-8 text-center text-[13px] text-[#6b6b70]">
                  Search across tasks, projects and people.
                </p>
              )}

              {q && flatResults.length === 0 && (
                <p className="px-3 py-8 text-center text-[13px] text-[#6b6b70]">
                  No results for “{query}”.
                </p>
              )}

              {q && taskResults.length > 0 && (
                <ResultGroup label="Tasks">
                  {taskResults.map((t) => {
                    runningIndex += 1
                    const idx = runningIndex
                    return (
                      <ResultRow
                        key={t._id}
                        active={idx === activeIndex}
                        icon={CheckSquare}
                        title={t.title}
                        subtitle={
                          t.isPersonal
                            ? 'Personal'
                            : t.projectId?.name || 'Task'
                        }
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => openTask(t)}
                      />
                    )
                  })}
                </ResultGroup>
              )}

              {q && projectResults.length > 0 && (
                <ResultGroup label="Projects">
                  {projectResults.map((p) => {
                    runningIndex += 1
                    const idx = runningIndex
                    return (
                      <ResultRow
                        key={p._id}
                        active={idx === activeIndex}
                        icon={Folder}
                        title={p.name}
                        subtitle={p.clientName || p.status || 'Project'}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => openProject(p)}
                      />
                    )
                  })}
                </ResultGroup>
              )}

              {q && userResults.length > 0 && (
                <ResultGroup label="People">
                  {userResults.map((u) => {
                    runningIndex += 1
                    const idx = runningIndex
                    return (
                      <ResultRow
                        key={u._id}
                        active={idx === activeIndex}
                        icon={UserIcon}
                        title={u.name}
                        subtitle={u.email}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => openUser(u)}
                      />
                    )
                  })}
                </ResultGroup>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ResultGroup({ label, children }) {
  return (
    <div className="mb-1.5">
      <p className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#6b6b70]">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function ResultRow({ icon: Icon, title, subtitle, active, onClick, onMouseEnter }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        active ? 'bg-[#2a2a2e] text-white' : 'text-[#c5c5c8] hover:bg-[#252528]',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-[#8b8b90]" />
      <span className="min-w-0 flex-1 truncate text-[13px]">{title}</span>
      {subtitle && (
        <span className="shrink-0 truncate text-[11px] text-[#6b6b70]">
          {subtitle}
        </span>
      )}
    </button>
  )
}

/* ─────────────────────────── Invite Modal ─────────────────────────── */

export function InviteModal({ open, onClose }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
    enabled: open,
  })
  const users = usersData?.users || []

  useEffect(() => {
    if (open) {
      setEmail('')
      setMessage('')
    }
  }, [open])

  const inviteLink = `${window.location.origin}/register`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast('Invite link copied', { type: 'success' })
    } catch {
      toast('Could not copy link', { type: 'error' })
    }
  }

  const sendInvite = () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast('Enter an email address', { type: 'error' })
      return
    }
    const existing = users.find((u) => u.email?.toLowerCase() === trimmed)
    if (existing) {
      toast(`Already on Cubic: ${existing.name}`, { type: 'info' })
      return
    }
    const subject = encodeURIComponent('Join me on Cubic')
    const bodyLines = [
      message.trim() || "I'm using Cubic to manage projects — join me here:",
      '',
      inviteLink,
    ]
    const body = encodeURIComponent(bodyLines.join('\n'))
    window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${body}`
    toast('Invite email opened', { type: 'success' })
    setEmail('')
    setMessage('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite people" size="sm">
      <div className="space-y-4">
        <div className="space-y-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[#8b8b90]">
              Email address
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
              placeholder="teammate@company.com"
              type="email"
              className="h-9 w-full rounded-lg border border-[#2e2e32] bg-[#121214] px-3 text-[13px] text-white outline-none placeholder:text-[#6b6b70] focus:border-[#3a3a3e]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[#8b8b90]">
              Message (optional)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Add a personal note…"
              className="w-full resize-none rounded-lg border border-[#2e2e32] bg-[#121214] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#6b6b70] focus:border-[#3a3a3e]"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#2e2e32] text-[12.5px] font-medium text-[#c5c5c8] hover:bg-[#252528] hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy invite link
          </button>
          <button
            type="button"
            onClick={sendInvite}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7B68EE] text-[12.5px] font-semibold text-white hover:bg-[#6a58d9]"
          >
            <Send className="h-3.5 w-3.5" />
            Send invite
          </button>
        </div>

        <div className="border-t border-[#2e2e32] pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[#8b8b90]">
            <UserPlus className="h-3.5 w-3.5" />
            Workspace members · {users.length}
          </p>
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#252528]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2a2e] text-[11px] font-semibold text-white">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-white">
                    {u.name}
                  </p>
                  <p className="truncate text-[11px] text-[#8b8b90]">{u.email}</p>
                </div>
                {u.role && (
                  <span className="shrink-0 rounded-full bg-[#252528] px-2 py-0.5 text-[10px] capitalize text-[#8b8b90]">
                    {u.role.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <p className="px-2 py-3 text-[12px] text-[#6b6b70]">
                No members found.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Help Drawer ─────────────────────────── */

const SHORTCUTS = [
  { keys: ['Ctrl/⌘', 'K'], label: 'Open global search' },
  { keys: ['Esc'], label: 'Close dialogs & modals' },
]

const TIPS = [
  {
    icon: MousePointerClick,
    title: 'Planner: drag to create',
    body: 'Click and drag on the calendar grid to schedule a new task or event at that time.',
  },
  {
    icon: CalendarDays,
    title: 'Planner: drag tasks to schedule',
    body: 'Drag a task from the sidebar or the unscheduled tray onto a time slot to schedule it.',
  },
  {
    icon: Sun,
    title: 'Theme toggle',
    body: 'Use the sun/moon icon in the top bar to switch between light and dark mode any time.',
  },
  {
    icon: ListChecks,
    title: 'My Tasks views',
    body: 'Switch between Everything, Assigned to me, Today & Overdue, Personal List and Done history from the Home sidebar.',
  },
]

export function HelpDrawer({ open, onClose }) {
  return (
    <Drawer open={open} onClose={onClose} title="Help & shortcuts" width="max-w-sm">
      <div className="space-y-6">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8b8b90]">
            <Keyboard className="h-3.5 w-3.5" />
            Keyboard shortcuts
          </p>
          <div className="space-y-1.5">
            {SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between rounded-lg border border-[#2e2e32] bg-[#121214] px-3 py-2"
              >
                <span className="text-[13px] text-[#c5c5c8]">{s.label}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded border border-[#2e2e32] bg-[#1c1c1e] px-1.5 py-0.5 text-[11px] text-[#e8e8ea]"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8b8b90]">
            Tips
          </p>
          <div className="space-y-2">
            {TIPS.map((tip) => (
              <div
                key={tip.title}
                className="flex gap-3 rounded-lg border border-[#2e2e32] bg-[#121214] p-3"
              >
                <tip.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#7B68EE]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white">{tip.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#8b8b90]">
                    {tip.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

/* ─────────────────────────── Customize Sidebar ─────────────────────────── */

const SIDEBAR_SECTION_OPTIONS = [
  { key: 'aiChats', label: 'AI Chats' },
  { key: 'superAgents', label: 'Super Agents' },
  { key: 'channels', label: 'Channels' },
  { key: 'spaces', label: 'Spaces' },
]

export function CustomizeSidebarModal({ open, onClose, sidebarSections, onToggle }) {
  return (
    <Modal open={open} onClose={onClose} title="Customize sidebar" size="sm">
      <div className="space-y-1">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] text-[#8b8b90]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Choose which sections appear in your Home sidebar.
        </p>
        {SIDEBAR_SECTION_OPTIONS.map((opt) => {
          const checked = !!sidebarSections?.[opt.key]
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onToggle(opt.key)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-[#252528]"
            >
              <span className="text-[13px] text-[#e8e8ea]">{opt.label}</span>
              <span
                className={cn(
                  'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                  checked ? 'bg-[#7B68EE]' : 'bg-[#3a3a3e]',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
