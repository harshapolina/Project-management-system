import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Camera,
  BarChart3,
  Users,
  Plus,
  Search,
  Bell,
  Settings,
  LogOut,
  Truck,
  Wallet,
  Network,
  Inbox,
  UserPlus,
  Square,
  Clock,
  Menu,
  X,
  Building2,
  Gauge,
  Smartphone,
  FileSpreadsheet,
  Trophy,
  Package,
  History,
  Receipt,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import { toast } from '../ui'
import { cn } from '../../lib/utils'
import { capabilitiesForUser, canInviteUsers } from '../../lib/roles'
import {
  formatTrackedSeconds,
  liveTrackedSeconds,
} from '../../lib/taskStatus'
import {
  GlobalSearchModal,
  InviteModal,
} from './GlobalChrome'
import {
  CreateSpaceModal,
  CreateProjectModal,
} from '../CreateModals'
import { LiveNotificationCenter } from '../notifications/LiveNotificationCenter'
import { getSocket } from '../../lib/socket'

const ALL_PRIMARY_NAV = [
  {
    to: '/company-admin',
    label: 'Company',
    icon: Gauge,
    capability: 'companyAdmin',
  },
  {
    to: '/portfolio',
    label: 'Dashboard',
    icon: LayoutDashboard,
    capability: 'portfolio',
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: FolderKanban,
    capability: 'projects',
  },
  {
    to: '/leads',
    label: 'New enquiries',
    icon: Building2,
    capability: 'leads',
  },
  {
    to: '/?view=assigned',
    label: 'My work',
    icon: CheckSquare,
    capability: 'myWork',
  },
  {
    to: '/boq',
    label: 'BOQ / Quotes',
    icon: FileSpreadsheet,
    capability: 'boq',
  },
  {
    to: '/procurement',
    label: 'Materials',
    icon: Truck,
    capability: 'procurement',
  },
  {
    to: '/finance',
    label: 'Money',
    icon: Wallet,
    capability: 'finance',
  },
  {
    to: '/billing',
    label: 'Billing',
    icon: Receipt,
    capability: 'finance',
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: Package,
    capability: 'inventory',
  },
  {
    to: '/inventory/movements',
    label: 'Stock log',
    icon: History,
    capability: 'inventory',
  },
  {
    to: '/site-feed',
    label: 'Site updates',
    icon: Camera,
    capability: 'siteFeed',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    capability: 'reports',
  },
  {
    to: '/impact',
    label: 'Impact Points',
    icon: Trophy,
    capability: 'impact',
  },
]

function navActive(pathname, search, to) {
  if (to.startsWith('/?')) return pathname === '/'
  if (to === '/projects') {
    return pathname === '/projects' || pathname.startsWith('/projects/')
  }
  if (to === '/portfolio') return pathname.startsWith('/portfolio')
  if (to === '/company-admin') return pathname.startsWith('/company-admin')
  if (to === '/inventory') {
    return pathname === '/inventory'
  }
  if (to === '/inventory/movements') {
    return pathname.startsWith('/inventory/movements')
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, setUser } = useAuthStore()
  const {
    searchOpen,
    setSearchOpen,
    openSearch,
    inviteOpen,
    setInviteOpen,
  } = useUiStore()

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [spaceModalOpen, setSpaceModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [timerTick, setTimerTick] = useState(() => Date.now())
  const qc = useQueryClient()
  const caps = capabilitiesForUser(user)
  const primaryNav = ALL_PRIMARY_NAV.filter((item) => caps[item.capability])
  const showPeople = caps.people
  const isSupervisor = caps.mobile
  const canCreate = caps.createProject

  const { data: activeTimerData } = useQuery({
    queryKey: ['active-timer'],
    queryFn: () => api('/tasks/active-timer'),
    refetchInterval: 15_000,
  })
  const activeTimer = activeTimerData?.task || null

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api('/notifications'),
    refetchInterval: 10_000,
  })
  const unreadCount = (notifData?.notifications || []).filter((n) => !n.read)
    .length

  useEffect(() => {
    if (!activeTimer?.timeTrackingStartedAt) return undefined
    const id = window.setInterval(() => setTimerTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [activeTimer?.timeTrackingStartedAt])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const refreshAccess = () => {
      api('/auth/me')
        .then((result) => {
          if (!result?.user) return
          setUser(result.user)
        })
        .catch(() => {})
    }

    refreshAccess()
    const id = window.setInterval(refreshAccess, 8_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAccess()
    }
    window.addEventListener('focus', refreshAccess)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', refreshAccess)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [setUser])

  useEffect(() => {
    const userId = user?.id || user?._id
    if (!userId) return undefined

    const socket = getSocket()
    const join = () => socket.emit('join:user', String(userId))
    const onPermissions = (payload) => {
      const current = useAuthStore.getState().user
      if (current) {
        setUser({
          ...current,
          permissions: payload?.permissions || {},
        })
      }
      api('/auth/me')
        .then((result) => result?.user && setUser(result.user))
        .catch(() => {})
    }

    if (socket.connected) join()
    else socket.connect()
    socket.on('connect', join)
    socket.on('permissions:updated', onPermissions)

    return () => {
      socket.off('connect', join)
      socket.off('permissions:updated', onPermissions)
    }
  }, [user?.id, user?._id, setUser])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  useEffect(() => {
    const onSpace = () => setSpaceModalOpen(true)
    const onProject = () => setProjectModalOpen(true)
    window.addEventListener('cubic:new-space', onSpace)
    window.addEventListener('cubic:new-project', onProject)
    return () => {
      window.removeEventListener('cubic:new-space', onSpace)
      window.removeEventListener('cubic:new-project', onProject)
    }
  }, [])

  const stopActiveTimer = async () => {
    if (!activeTimer?._id) return
    try {
      const spent = liveTrackedSeconds(
        activeTimer.timeSpent,
        activeTimer.timeTrackingStartedAt,
      )
      await api(`/tasks/${activeTimer._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          timeSpent: spent,
          timeTrackingStartedAt: null,
          timeTrackingUserId: null,
        }),
      })
      qc.invalidateQueries({ queryKey: ['active-timer'] })
      toast('Timer stopped', { type: 'success' })
    } catch (e) {
      toast(e.message || 'Could not stop timer', { type: 'error' })
    }
  }

  const openActiveTimerTask = () => {
    if (!activeTimer) return
    const projectId =
      typeof activeTimer.projectId === 'object'
        ? activeTimer.projectId?._id
        : activeTimer.projectId
    if (activeTimer.isPersonal || !projectId) {
      navigate('/?view=assigned')
      return
    }
    navigate(`/projects/${projectId}/tasks?task=${activeTimer._id}`)
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const SidebarNav = ({ onNavigate }) => (
    <>
      <div className="mb-6 px-3 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e3a5f] text-[13px] font-bold text-white">
            E
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold tracking-wide text-white">
              EPM
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.1em] text-[#8ba3bc]">
              Editco Project Mgmt
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {primaryNav.map((item) => {
          const active = navActive(
            location.pathname,
            location.search,
            item.to,
          )
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition',
                active
                  ? 'bg-[#1e4a7a] text-white shadow-sm'
                  : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          )
        })}

        {showPeople && (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition',
                isActive
                  ? 'bg-[#1e4a7a] text-white shadow-sm'
                  : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Users className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            People
          </NavLink>
        )}

        <div className="mt-auto space-y-0.5 border-t border-white/10 pt-3">
          <NavLink
            to="/inbox?tab=primary"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium',
                isActive
                  ? 'bg-[#1e4a7a] text-white'
                  : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Inbox className="h-4 w-4" />
            Notifications
          </NavLink>
          {isSupervisor && (
            <NavLink
              to="/mobile"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium',
                  isActive
                    ? 'bg-[#1e4a7a] text-white'
                    : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Smartphone className="h-4 w-4" />
              Phone site mode
            </NavLink>
          )}
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium',
                isActive
                  ? 'bg-[#1e4a7a] text-white'
                  : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          {caps.platform && (
            <NavLink
              to="/platform"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium',
                  isActive
                    ? 'bg-[#1e4a7a] text-white'
                    : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Network className="h-4 w-4" />
              Platform
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#a8bdd4] hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </nav>
    </>
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F0F4F8] text-[#0f172a] print:h-auto print:overflow-visible">
      {/* Desktop sidebar */}
      <aside className="z-40 hidden w-[240px] shrink-0 flex-col bg-[#0B1B2B] print:hidden lg:flex">
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,280px)] flex-col bg-[#0B1B2B] shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-[#a8bdd4] hover:bg-white/10"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#dce4ee] bg-white/90 px-3 backdrop-blur print:hidden sm:px-5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f0f4f8] lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => setProjectModalOpen(true)}
              className="hidden h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 text-[13px] font-semibold text-white hover:bg-[#1d4ed8] sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              New project
            </button>
          )}

          <div className="relative mx-auto min-w-0 flex-1 max-w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
            <input
              readOnly
              onFocus={openSearch}
              onClick={openSearch}
              placeholder="Search projects, tasks…"
              className="h-9 w-full cursor-pointer rounded-full border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 text-[13px] outline-none placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white"
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {activeTimer?.timeTrackingStartedAt ? (
              <div className="mr-1 flex items-center gap-1 rounded-full border border-red-200 bg-red-50 py-0.5 pl-2 pr-1">
                <button
                  type="button"
                  onClick={openActiveTimerTask}
                  className="flex max-w-[140px] items-center gap-1.5"
                >
                  <Clock className="h-3 w-3 text-red-500" />
                  <span className="truncate text-[11px] font-medium text-red-700">
                    {formatTrackedSeconds(
                      liveTrackedSeconds(
                        activeTimer.timeSpent,
                        activeTimer.timeTrackingStartedAt,
                        timerTick,
                      ),
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={stopActiveTimer}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-red-500 hover:bg-red-100"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                </button>
              </div>
            ) : null}

            {canInviteUsers(user) && (
              <IconBtn title="Invite" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" />
              </IconBtn>
            )}
            <IconBtn title="Notifications" onClick={() => navigate('/inbox?tab=primary')}>
              <span className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            </IconBtn>
            <button
              type="button"
              title={user?.name}
              onClick={() => navigate('/settings')}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-bold text-white"
            >
              {initials}
            </button>
          </div>
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-[calc(3.75rem+env(safe-area-inset-bottom))] print:overflow-visible print:pb-0 lg:pb-0">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dce4ee] bg-white/95 backdrop-blur print:hidden lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 px-1 py-1">
            <BottomTab
              label="Home"
              active={
                caps.portfolio
                  ? location.pathname.startsWith('/portfolio')
                  : location.pathname === '/'
              }
              onClick={() => navigate(caps.portfolio ? '/portfolio' : '/')}
              icon={LayoutDashboard}
            />
            <BottomTab
              label="Projects"
              active={location.pathname.startsWith('/projects')}
              onClick={() => navigate('/projects')}
              icon={FolderKanban}
            />
            {canCreate ? (
              <button
                type="button"
                onClick={() => setProjectModalOpen(true)}
                className="-mt-3 flex flex-col items-center"
                aria-label="Create"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-blue-500/30">
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </span>
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <BottomTab
              label="My work"
              active={location.pathname === '/'}
              onClick={() => navigate('/?view=assigned')}
              icon={CheckSquare}
            />
            <BottomTab
              label="Menu"
              active={false}
              onClick={() => setMobileNavOpen(true)}
              icon={Menu}
            />
          </div>
        </nav>
      </div>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <CreateSpaceModal
        open={spaceModalOpen}
        onClose={() => setSpaceModalOpen(false)}
      />
      <CreateProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
      <LiveNotificationCenter />
    </div>
  )
}

function IconBtn({ children, title, onClick, className }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f0f4f8] hover:text-[#0f172a]',
        className,
      )}
    >
      {children}
    </button>
  )
}

function BottomTab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium',
        active ? 'text-[#2563eb]' : 'text-[#94a3b8]',
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
      {label}
    </button>
  )
}
