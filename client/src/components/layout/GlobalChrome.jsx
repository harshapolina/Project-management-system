import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { api, getTenantSlug, useAuthStore, companyLoginUrl } from '../../lib/api'
import { canInviteUsers, inviteRoleOptions, NEW_CUSTOM_ROLE_VALUE, customRoleBaseOptions } from '../../lib/roles'
import { Modal, Drawer, toast, Button, Input, Select } from '../ui'
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

/* ─────────────────────────── Invite details popup ─────────────────────────── */

export function InviteDetailsModal({ open, onClose, details }) {
  if (!details) return null

  const portalLabel =
    details.portal === 'admin' ? 'Admin / Owner portal' : 'Staff portal'

  const text = [
    details.companyName && `Company: ${details.companyName}`,
    details.workspace && `Workspace: ${details.workspace}`,
    details.role && `Role: ${details.role}`,
    details.email && `Email: ${details.email}`,
    details.tempPassword && `Password: ${details.tempPassword}`,
    details.loginUrl && `Login: ${details.loginUrl}`,
    details.portal && `Sign in via: ${portalLabel}`,
  ]
    .filter(Boolean)
    .join('\n')

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Invite details copied', { type: 'success' })
    } catch {
      toast('Could not copy', { type: 'error' })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share these login details" size="sm">
      <div className="space-y-3 text-sm">
        <p className="text-xs text-secondary">
          Send this to the company (WhatsApp / email). They use the company login
          page — not the Editco platform portal. Open the live site URL below
          (not localhost) if they are signing in on production.
        </p>
        <div className="space-y-2 rounded-xl border border-border bg-surface-raised px-3 py-3 font-mono text-[12px]">
          {details.companyName && (
            <p>
              Company:{' '}
              <span className="text-primary">{details.companyName}</span>
            </p>
          )}
          {details.workspace && (
            <p>
              Workspace:{' '}
              <span className="text-primary">{details.workspace}</span>
            </p>
          )}
          {details.role && (
            <p>
              Role: <span className="text-primary">{details.role}</span>
            </p>
          )}
          {details.email && (
            <p>
              Email: <span className="text-primary">{details.email}</span>
            </p>
          )}
          {details.tempPassword && (
            <p>
              Password:{' '}
              <span className="text-accent">{details.tempPassword}</span>
            </p>
          )}
          {details.loginUrl && (
            <p className="break-all text-[11px] text-secondary">
              {details.loginUrl}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={copyAll}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy all
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Invite Modal ─────────────────────────── */

export function InviteModal({ open, onClose }) {
  const tenant = useAuthStore((s) => s.tenant)
  const setTenant = useAuthStore((s) => s.setTenant)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('project_manager')
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState(null)
  const [customRoleOpen, setCustomRoleOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customBasedOn, setCustomBasedOn] = useState('designer')
  const [creatingRole, setCreatingRole] = useState(false)

  const canInvite = canInviteUsers(user)
  const canCreateCustomRoles =
    !!user?.isPlatformAdmin || ['admin', 'owner'].includes(user?.role)
  const roleOptions = inviteRoleOptions(tenant?.customRoles || [], {
    allowCreate: canCreateCustomRoles,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
    enabled: open,
  })
  const users = usersData?.users || []

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setRole('project_manager')
      setDetails(null)
      setCustomRoleOpen(false)
    }
  }, [open])

  const sendInvite = async () => {
    if (!canInvite) {
      toast('Only admins or PMs can invite', { type: 'error' })
      return
    }
    const trimmed = email.trim().toLowerCase()
    const inviteName = name.trim() || trimmed.split('@')[0]
    if (!trimmed) {
      toast('Enter an email address', { type: 'error' })
      return
    }
    setLoading(true)
    try {
      const data = await api('/auth/invite', {
        method: 'POST',
        body: JSON.stringify({
          name: inviteName,
          email: trimmed,
          role,
        }),
      })
      setDetails({
        workspace: tenant?.slug || getTenantSlug(),
        email: data.user.email,
        tempPassword: data.tempPassword,
        loginUrl: companyLoginUrl(
          tenant?.slug || getTenantSlug(),
          ['admin', 'owner', 'hr'].includes(role) ? 'admin' : 'staff',
        ),
      })
      qc.invalidateQueries({ queryKey: ['admin-team-summary'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('Invite created', { type: 'success' })
    } catch (e) {
      toast(e.message || 'Invite failed', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const createCustomRole = async () => {
    if (!customLabel.trim()) {
      toast('Enter a role name', { type: 'error' })
      return
    }
    setCreatingRole(true)
    try {
      const res = await api('/admin/custom-roles', {
        method: 'POST',
        body: JSON.stringify({
          label: customLabel.trim(),
          basedOn: customBasedOn,
        }),
      })
      if (tenant) {
        setTenant({
          ...tenant,
          customRoles: res.customRoles || tenant.customRoles,
        })
      }
      if (res.role?.key) setRole(res.role.key)
      setCustomRoleOpen(false)
      setCustomLabel('')
      toast(`Role “${res.role?.label}” created`, { type: 'success' })
    } catch (e) {
      toast(e.message || 'Could not create role', { type: 'error' })
    } finally {
      setCreatingRole(false)
    }
  }

  return (
    <>
      <Modal
        open={open && !details}
        onClose={onClose}
        title="Invite people"
        size="sm"
      >
        <div className="space-y-4">
          {!canInvite && (
            <p className="text-xs text-secondary">
              Ask a workspace admin or project manager to invite teammates.
            </p>
          )}
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teammate name"
            disabled={!canInvite}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            disabled={!canInvite}
          />
          <Select
            label="Role"
            value={role}
            onChange={(e) => {
              const next = e.target.value
              if (next === NEW_CUSTOM_ROLE_VALUE) {
                setCustomLabel('')
                setCustomBasedOn('designer')
                setCustomRoleOpen(true)
                return
              }
              setRole(next)
            }}
            disabled={!canInvite}
            options={roleOptions}
          />

          <Button
            type="button"
            className="w-full"
            loading={loading}
            disabled={!canInvite || !email.trim()}
            onClick={sendInvite}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Create invite
          </Button>

          <div className="border-t border-[#2e2e32] pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[#8b8b90]">
              <UserPlus className="h-3.5 w-3.5" />
              Workspace members · {users.length}
            </p>
            <div className="max-h-52 space-y-0.5 overflow-y-auto">
              {users.map((u) => (
                <div
                  key={u.id || u._id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#252528]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3a3a3e] text-[10px] font-semibold">
                    {(u.name || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-white">
                      {u.name}
                    </p>
                    <p className="truncate text-[11px] text-[#8b8b90]">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={customRoleOpen}
        onClose={() => setCustomRoleOpen(false)}
        title="New custom role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-secondary">
            Name the role and pick a base — built-in role, department, or an
            existing custom role.
          </p>
          <Input
            label="Role name"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Quantity surveyor"
            autoFocus
          />
          <Select
            label="Based on"
            value={customBasedOn}
            onChange={(e) => setCustomBasedOn(e.target.value)}
            options={customRoleBaseOptions(tenant?.customRoles || [])}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCustomRoleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={creatingRole}
              onClick={createCustomRole}
            >
              Create role
            </Button>
          </div>
        </div>
      </Modal>

      <InviteDetailsModal
        open={!!details}
        details={details}
        onClose={() => {
          setDetails(null)
          onClose()
        }}
      />
    </>
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
                    'absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-transform',
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
