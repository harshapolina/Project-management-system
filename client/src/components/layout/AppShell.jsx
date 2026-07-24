import { useEffect, useState } from 'react'
import {
  NavLink,
  useLocation,
  useNavigate,
  Link,
} from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Home,
  CalendarDays,
  Sparkles,
  Users,
  MoreHorizontal,
  Inbox,
  MessageSquare,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  Folder,
  FileText,
  UserPlus,
  SlidersHorizontal,
  FileSpreadsheet,
  Truck,
  Wallet,
  BarChart3,
  Smartphone,
  Network,
  Hash,
  Filter,
  PanelLeftClose,
  Bot,
  Diamond,
  Sun,
  Moon,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react'
import { api, useAuthStore } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import { Avatar, toast } from '../ui'
import { cn } from '../../lib/utils'
import {
  GlobalSearchModal,
  InviteModal,
  HelpDrawer,
  CustomizeSidebarModal,
} from './GlobalChrome'
import {
  CreateSpaceModal,
  CreateProjectModal,
  CreateChannelModal,
} from '../CreateModals'

function navFromPath(pathname) {
  if (pathname.startsWith('/planner')) return 'planner'
  if (pathname.startsWith('/projects')) return 'spaces'
  if (pathname.startsWith('/portfolio')) return 'dashboards'
  return 'home'
}

export function AppShell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    globalNav,
    setGlobalNav,
    spacesExpanded,
    toggleSpacesExpanded,
    setSpacesExpanded,
    theme,
    toggleTheme,
    searchOpen,
    setSearchOpen,
    openSearch,
    inviteOpen,
    setInviteOpen,
    helpOpen,
    setHelpOpen,
    customizeOpen,
    setCustomizeOpen,
    sidebarSections,
    toggleSidebarSection,
  } = useUiStore()
  const resolvedTheme =
    theme === 'system'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme
  const [teamOpen, setTeamOpen] = useState(true)
  const [projectsFolderOpen, setProjectsFolderOpen] = useState(true)
  const [myTasksOpen, setMyTasksOpen] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [spaceModalOpen, setSpaceModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [projectSpaceId, setProjectSpaceId] = useState('')

  useEffect(() => {
    const onSpace = () => setSpaceModalOpen(true)
    const onProject = () => {
      setProjectSpaceId('')
      setProjectModalOpen(true)
    }
    window.addEventListener('cubic:new-space', onSpace)
    window.addEventListener('cubic:new-project', onProject)
    return () => {
      window.removeEventListener('cubic:new-space', onSpace)
      window.removeEventListener('cubic:new-project', onProject)
    }
  }, [])

  useEffect(() => {
    setGlobalNav(navFromPath(location.pathname))
    setMobileNavOpen(false)
  }, [location.pathname, location.search, setGlobalNav])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => {
      if (mq.matches) setSidebarCollapsed(true)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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

  // Keep My Tasks / More expanded when those routes are active
  useEffect(() => {
    if (location.pathname === '/') setMyTasksOpen(true)
    if (
      [
        '/leads',
        '/quotations',
        '/procurement',
        '/finance',
        '/portfolio',
        '/mobile',
        '/settings',
      ].some((p) => location.pathname.startsWith(p))
    ) {
      setMoreOpen(true)
    }
    if (location.pathname.startsWith('/projects')) {
      setSpacesExpanded(true)
      setTeamOpen(true)
      setProjectsFolderOpen(true)
    }
  }, [location.pathname, setSpacesExpanded])

  const { data: projectsData } = useQuery({
    queryKey: ['projects-nav'],
    queryFn: () => api('/projects'),
    staleTime: 60_000,
  })
  const projects = projectsData?.projects || []

  const { data: spacesData } = useQuery({
    queryKey: ['spaces'],
    queryFn: () => api('/spaces'),
    staleTime: 60_000,
  })
  const spaces = spacesData?.spaces || []

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api('/channels'),
    staleTime: 30_000,
  })
  const channels = channelsData?.channels || []

  const isPlanner = location.pathname.startsWith('/planner')

  const openNewProject = (spaceId = '') => {
    setProjectSpaceId(spaceId || '')
    setProjectModalOpen(true)
  }

  const goHome = () => {
    setGlobalNav('home')
    navigate('/?view=all')
  }

  const goPlanner = () => {
    setGlobalNav('planner')
    navigate('/planner')
  }

  const openCreate = () => {
    if (isPlanner) {
      useUiStore.getState().requestPlannerCreate()
    } else {
      navigate('/?view=personal&create=1')
    }
    setMobileNavOpen(false)
  }

  const sidebarBody = isPlanner ? (
    <PlannerSidebar />
  ) : (
    <HomeSidebar
      user={user}
      projects={projects}
      spaces={spaces}
      channels={channels}
      myTasksOpen={myTasksOpen}
      setMyTasksOpen={setMyTasksOpen}
      moreOpen={moreOpen}
      setMoreOpen={setMoreOpen}
      spacesExpanded={spacesExpanded}
      toggleSpacesExpanded={toggleSpacesExpanded}
      teamOpen={teamOpen}
      setTeamOpen={setTeamOpen}
      projectsFolderOpen={projectsFolderOpen}
      setProjectsFolderOpen={setProjectsFolderOpen}
      channelsOpen={channelsOpen}
      setChannelsOpen={setChannelsOpen}
      navigate={navigate}
      sidebarSections={sidebarSections}
      onNewSpace={() => setSpaceModalOpen(true)}
      onNewProject={openNewProject}
      onNewChannel={() => setChannelModalOpen(true)}
    />
  )

  const rail = (
    <>
      <button
        type="button"
        onClick={goHome}
        className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-[12px] font-bold text-[#0E0E10] shadow-[0_0_0_1px_rgba(198,255,61,0.25)]"
        title="Cubic"
      >
        C
      </button>

      <RailIcon active={globalNav === 'home'} title="Home" onClick={goHome}>
        <Home className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </RailIcon>
      <RailIcon
        active={isPlanner || globalNav === 'planner'}
        title="Planner"
        onClick={goPlanner}
      >
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span className="absolute -bottom-0.5 text-[7px] font-bold leading-none">
            {new Date().getDate()}
          </span>
        </span>
      </RailIcon>
      <RailIcon title="Insights" onClick={() => navigate('/reports')}>
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </RailIcon>
      <RailIcon
        active={globalNav === 'spaces'}
        title="Teams"
        onClick={() => navigate('/projects')}
      >
        <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </RailIcon>
      <RailIcon
        title="More"
        onClick={() => {
          setMoreOpen(true)
          navigate('/?view=all')
        }}
      >
        <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </RailIcon>

      <div className="mt-auto flex flex-col items-center gap-1.5 pb-1">
        <button
          type="button"
          title={user?.name}
          onClick={() => navigate('/settings')}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a3a3e] text-[10px] font-semibold"
        >
          {(user?.name || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </button>
        <button
          type="button"
          title="Invite"
          onClick={() => setInviteOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8b8b90] hover:bg-[#252528] hover:text-white"
        >
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#121214] text-white">
      {/* Desktop far-left rail */}
      <aside className="z-50 hidden w-[52px] shrink-0 flex-col items-center border-r border-[#2e2e32] bg-[#0f0f10] py-2.5 lg:flex">
        {rail}
      </aside>

      {/* Desktop secondary sidebar */}
      {!sidebarCollapsed && (
        <aside className="z-40 hidden w-[260px] shrink-0 flex-col border-r border-[#2e2e32] bg-[#1c1c1e] lg:flex">
          <div className="flex h-12 items-center gap-1 border-b border-[#2e2e32]/60 px-2">
            <span className="flex-1 truncate px-1 text-[14px] font-semibold tracking-tight">
              {isPlanner ? 'Planner' : 'Home'}
            </span>
            <IconBtn title="Search" onClick={openSearch}>
              <Search className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              title="Collapse sidebar"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </IconBtn>
          </div>

          <div className="px-2 pt-2">
            <button
              type="button"
              onClick={openCreate}
              className="flex h-9 w-full items-center justify-center gap-1 rounded-xl bg-white text-[13px] font-semibold text-[#0E0E10] transition hover:bg-[#e8e8ea]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Create
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
            {sidebarBody}
          </div>

          <div className="space-y-1 border-t border-[#2e2e32] p-2">
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#2e2e32] bg-[#252528]/50 py-2 text-[12px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Customize Sidebar
            </button>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
            >
              <LogOut className="h-3 w-3" />
              Log out
            </button>
          </div>
        </aside>
      )}

      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-[60px] top-3 z-40 hidden rounded-lg border border-[#2e2e32] bg-[#1c1c1e] p-1.5 text-[#8b8b90] hover:text-white lg:block"
          title="Show sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}

      {/* Mobile slide-over nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(92vw,340px)] animate-[slideIn_.22s_ease-out] shadow-2xl">
            <aside className="flex w-[52px] shrink-0 flex-col items-center border-r border-[#2e2e32] bg-[#0f0f10] py-2.5">
              {rail}
            </aside>
            <aside className="flex min-w-0 flex-1 flex-col bg-[#1c1c1e]">
              <div className="flex h-12 items-center gap-2 border-b border-[#2e2e32] px-3">
                <span className="flex-1 truncate text-[14px] font-semibold">
                  {isPlanner ? 'Planner' : 'Home'}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-1.5 text-[#8b8b90] hover:bg-[#252528] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-2 pt-2">
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex h-9 w-full items-center justify-center gap-1 rounded-xl bg-white text-[13px] font-semibold text-[#0E0E10]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Create
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                {sidebarBody}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[#121214]">
        <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-[#2e2e32] px-2 sm:px-4">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#c5c5c8] hover:bg-[#1c1c1e] lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden text-[12px] text-[#8b8b90] md:block">
            Cubic Studio
          </div>

          <div className="relative mx-auto min-w-0 flex-1 max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b8b90]" />
            <input
              readOnly
              onFocus={openSearch}
              onClick={openSearch}
              placeholder="Search Cubic"
              className="h-9 w-full cursor-pointer rounded-full border border-[#2e2e32] bg-[#1c1c1e] pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-[#6b6b70] focus:border-[#3a3a3e]"
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <TopIcon
              title={resolvedTheme === 'light' ? 'Dark mode' : 'Light mode'}
              onClick={() => toggleTheme()}
            >
              {resolvedTheme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </TopIcon>
            <TopIcon
              className="hidden sm:flex"
              onClick={() => navigate('/inbox')}
            >
              <Bell className="h-4 w-4" />
            </TopIcon>
            <TopIcon
              className="hidden sm:flex"
              title="Help"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </TopIcon>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="ml-0.5"
            >
              <Avatar src={user?.avatar} name={user?.name} size="xs" />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[#2e2e32] bg-[#0f0f10]/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
            <BottomTab
              label="Home"
              active={globalNav === 'home' && !isPlanner}
              onClick={goHome}
              icon={Home}
            />
            <BottomTab
              label="Planner"
              active={isPlanner}
              onClick={goPlanner}
              icon={CalendarDays}
            />
            <button
              type="button"
              onClick={openCreate}
              className="-mt-3 flex flex-col items-center"
              aria-label="Create"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-[#0E0E10] shadow-[0_8px_24px_rgba(198,255,61,0.28)]">
                <Plus className="h-6 w-6" strokeWidth={2.5} />
              </span>
            </button>
            <BottomTab
              label="Inbox"
              active={location.pathname.startsWith('/inbox')}
              onClick={() => navigate('/inbox')}
              icon={Inbox}
            />
            <BottomTab
              label="Spaces"
              active={location.pathname.startsWith('/projects')}
              onClick={() => navigate('/projects')}
              icon={Folder}
            />
          </div>
        </nav>
      </div>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CustomizeSidebarModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        sidebarSections={sidebarSections}
        onToggle={toggleSidebarSection}
      />
      <CreateSpaceModal
        open={spaceModalOpen}
        onClose={() => setSpaceModalOpen(false)}
      />
      <CreateProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        defaultSpaceId={projectSpaceId}
      />
      <CreateChannelModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
      />
    </div>
  )
}

function BottomTab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition',
        active ? 'text-accent' : 'text-[#8b8b90]',
      )}
    >
      <Icon
        className={cn('h-5 w-5', active && 'drop-shadow-[0_0_8px_rgba(198,255,61,0.45)]')}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {label}
    </button>
  )
}

/* ─── Planner sidebar ─── */

function PlannerSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const filter = new URLSearchParams(location.search).get('filter') || 'all'
  const [assignedOpen, setAssignedOpen] = useState(true)
  const [todayOpen, setTodayOpen] = useState(true)
  const [meetQuery, setMeetQuery] = useState('')
  const [addingPriority, setAddingPriority] = useState(false)
  const [priorityTitle, setPriorityTitle] = useState('')
  const [priorityLevel, setPriorityLevel] = useState('high')
  const [pickQuery, setPickQuery] = useState('')

  const { data } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
  })
  const tasks = data?.data?.tasks || {}
  const assigned = tasks.assigned || []
  const today = [...(tasks.today || []), ...(tasks.overdue || [])]
  const priorities = tasks.priorities || []
  const priorityIds = new Set(priorities.map((t) => String(t._id)))

  const candidates = [
    ...(tasks.assigned || []),
    ...(tasks.today || []),
    ...(tasks.overdue || []),
    ...(tasks.unscheduled || []),
    ...(tasks.personal || []),
    ...(tasks.next || []),
  ].filter((t, i, arr) => {
    if (!t?._id || priorityIds.has(String(t._id))) return false
    if (t.priority === 'urgent' || t.priority === 'high') return false
    return arr.findIndex((x) => String(x._id) === String(t._id)) === i
  })

  const filteredCandidates = pickQuery.trim()
    ? candidates.filter((t) =>
        t.title?.toLowerCase().includes(pickQuery.trim().toLowerCase()),
      )
    : candidates

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
  })
  const allUsers = usersData?.users || []
  const meetResults = meetQuery.trim()
    ? allUsers.filter(
        (u) =>
          u.name?.toLowerCase().includes(meetQuery.trim().toLowerCase()) ||
          u.email?.toLowerCase().includes(meetQuery.trim().toLowerCase()),
      )
    : []

  const meetWithPerson = (u) => {
    useUiStore.getState().setPlannerPrefill({ participantIds: [u._id] })
    useUiStore.getState().requestPlannerCreate()
    setMeetQuery('')
    navigate('/planner')
  }

  const setFilter = (f) => {
    navigate(f === 'all' ? '/planner' : `/planner?filter=${f}`)
  }

  const refreshHome = () => {
    qc.invalidateQueries({ queryKey: ['home'] })
  }

  const createPriority = useMutation({
    mutationFn: () =>
      api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: priorityTitle.trim(),
          priority: priorityLevel,
          status: 'todo',
          isPersonal: true,
        }),
      }),
    onSuccess: () => {
      toast('Priority added', { type: 'success' })
      setPriorityTitle('')
      setAddingPriority(false)
      setPickQuery('')
      refreshHome()
      setFilter('priority')
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const promotePriority = useMutation({
    mutationFn: ({ taskId, priority }) =>
      api(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ priority }),
      }),
    onSuccess: () => {
      toast('Marked as priority', { type: 'success' })
      setAddingPriority(false)
      setPickQuery('')
      refreshHome()
      setFilter('priority')
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="space-y-3">
      {/* Priorities */}
      <div className="rounded-xl border border-dashed border-[#3a3a3e] bg-[#161618] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-[#c5c5c8]">Priorities</p>
          {priorities.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('priority')}
              className="text-[10px] text-[#6b6b70] hover:text-white"
            >
              Show on calendar
            </button>
          )}
        </div>
        {priorities.length === 0 && !addingPriority ? (
          <p className="mt-2 text-[12px] leading-relaxed text-[#6b6b70]">
            Add a high-priority task to see it here.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {priorities.slice(0, 8).map((t) => (
              <li key={t._id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/task-id', t._id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="flex w-full cursor-grab items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-[12px] text-[#e8e8ea] hover:bg-[#252528] active:cursor-grabbing"
                  title="Drag onto calendar"
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      t.priority === 'urgent' ? 'bg-red-500' : 'bg-amber-400',
                    )}
                  />
                  <span className="truncate">{t.title}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {addingPriority ? (
          <div className="mt-2 space-y-2 rounded-lg border border-[#2e2e32] bg-[#121214] p-2">
            <input
              autoFocus
              value={priorityTitle}
              onChange={(e) => setPriorityTitle(e.target.value)}
              placeholder="New priority task…"
              className="h-8 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 text-[12px] outline-none placeholder:text-[#6b6b70] focus:border-[#3a3a3e]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && priorityTitle.trim()) {
                  createPriority.mutate()
                }
                if (e.key === 'Escape') {
                  setAddingPriority(false)
                  setPriorityTitle('')
                }
              }}
            />
            <div className="flex items-center gap-1">
              {['high', 'urgent'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriorityLevel(level)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium capitalize',
                    priorityLevel === level
                      ? level === 'urgent'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                      : 'text-[#8b8b90] hover:bg-[#252528]',
                  )}
                >
                  {level}
                </button>
              ))}
              <button
                type="button"
                disabled={!priorityTitle.trim() || createPriority.isPending}
                onClick={() => createPriority.mutate()}
                className="ml-auto rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-[#0E0E10] disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingPriority(false)
                  setPriorityTitle('')
                  setPickQuery('')
                }}
                className="rounded-md px-2 py-1 text-[11px] text-[#8b8b90] hover:text-white"
              >
                Cancel
              </button>
            </div>

            {filteredCandidates.length > 0 && (
              <div className="border-t border-[#2e2e32] pt-2">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#6b6b70]">
                  Or promote existing
                </p>
                <input
                  value={pickQuery}
                  onChange={(e) => setPickQuery(e.target.value)}
                  placeholder="Search your tasks…"
                  className="mb-1 h-7 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 text-[11px] outline-none placeholder:text-[#6b6b70]"
                />
                <div className="max-h-36 space-y-0.5 overflow-y-auto">
                  {filteredCandidates.slice(0, 8).map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      disabled={promotePriority.isPending}
                      onClick={() =>
                        promotePriority.mutate({
                          taskId: t._id,
                          priority: priorityLevel,
                        })
                      }
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[11px] text-[#c5c5c8] hover:bg-[#252528] hover:text-white"
                    >
                      <Plus className="h-3 w-3 shrink-0 text-accent" />
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingPriority(true)}
            className="mt-2 flex items-center gap-1 text-[12px] text-[#8b8b90] hover:text-white"
          >
            <Plus className="h-3 w-3" />
            Add priority
          </button>
        )}
      </div>

      {/* Meet with */}
      <div>
        <p className="mb-1.5 px-1 text-[11px] font-medium text-[#8b8b90]">
          Meet with
        </p>
        <div className="relative">
          <Users className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b6b70]" />
          <input
            value={meetQuery}
            onChange={(e) => setMeetQuery(e.target.value)}
            placeholder="Search for people…"
            className="h-8 w-full rounded-lg border border-[#2e2e32] bg-[#121214] pl-8 pr-2 text-[12px] outline-none placeholder:text-[#6b6b70] focus:border-[#3a3a3e]"
          />
        </div>
        {meetQuery.trim() && (
          <div className="mt-1 space-y-0.5 rounded-lg border border-[#2e2e32] bg-[#121214] p-1">
            {meetResults.length === 0 && (
              <p className="px-2 py-1.5 text-[12px] text-[#6b6b70]">
                No people found
              </p>
            )}
            {meetResults.slice(0, 6).map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => meetWithPerson(u)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[#c5c5c8] hover:bg-[#252528] hover:text-white"
                title={`Schedule a meeting with ${u.name}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2a2a2e] text-[9px] font-semibold text-white">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assigned to me */}
      <div>
        <button
          type="button"
          onClick={() => setAssignedOpen((v) => !v)}
          className="flex w-full items-center gap-1 px-1 py-1 text-[12px] font-medium text-[#c5c5c8] hover:text-white"
        >
          {assignedOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Assigned to me
          <span className="ml-auto text-[11px] text-[#6b6b70]">
            {assigned.length}
          </span>
        </button>
        {assignedOpen && (
          <div className="mt-0.5 space-y-0.5">
            <button
              type="button"
              onClick={() => setFilter('assigned')}
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left text-[12px]',
                filter === 'assigned'
                  ? 'bg-[#2a2a2e] text-white'
                  : 'text-[#8b8b90] hover:bg-[#252528] hover:text-white',
              )}
            >
              Show on calendar
            </button>
            {assigned.slice(0, 6).map((t) => (
              <div
                key={t._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/task-id', t._id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => setFilter('assigned')}
                className="flex w-full cursor-grab items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#252528] active:cursor-grabbing"
              >
                <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-[#6b6b70]" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#c5c5c8]">
                  {t.title}
                </span>
              </div>
            ))}
            {assigned.length === 0 && (
              <p className="px-2 py-2 text-[12px] text-[#6b6b70]">
                No tasks match these filters.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Today & overdue */}
      <div>
        <button
          type="button"
          onClick={() => setTodayOpen((v) => !v)}
          className="flex w-full items-center gap-1 px-1 py-1 text-[12px] font-medium text-[#c5c5c8] hover:text-white"
        >
          {todayOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Today & overdue
          <span className="ml-auto text-[11px] text-[#6b6b70]">
            {today.length}
          </span>
        </button>
        {todayOpen && (
          <div className="mt-0.5 space-y-0.5">
            <button
              type="button"
              onClick={() => setFilter('today')}
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left text-[12px]',
                filter === 'today'
                  ? 'bg-[#2a2a2e] text-white'
                  : 'text-[#8b8b90] hover:bg-[#252528] hover:text-white',
              )}
            >
              Show on calendar
            </button>
            {today.slice(0, 6).map((t) => (
              <div
                key={t._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/task-id', t._id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => setFilter('today')}
                className="flex w-full cursor-grab items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#252528] active:cursor-grabbing"
              >
                <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-[#ef4444]" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#c5c5c8]">
                  {t.title}
                </span>
              </div>
            ))}
            {today.length === 0 && (
              <p className="px-2 py-2 text-[12px] text-[#6b6b70]">
                No tasks match these filters.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Backlog — drag onto calendar */}
      <div className="border-t border-[#2e2e32] pt-3">
        <p className="mb-1 px-1 text-[11px] font-medium text-[#8b8b90]">
          Backlog
        </p>
        {(tasks.unscheduled || []).length === 0 ? (
          <p className="px-2 py-2 text-[12px] text-[#6b6b70]">
            No tasks match these filters.
          </p>
        ) : (
          <div className="space-y-0.5">
            {(tasks.unscheduled || []).slice(0, 8).map((t) => (
              <div
                key={t._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/task-id', t._id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="flex cursor-grab items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[#252528] active:cursor-grabbing"
                title="Drag onto a calendar time"
              >
                <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-[#6b6b70]" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#c5c5c8]">
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link
          to="/?view=all"
          className="mt-1 block rounded-md px-2 py-2 text-[12px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
        >
          Open My Tasks →
        </Link>
      </div>
    </div>
  )
}

/* ─── Home sidebar (ClickUp-style) ─── */

function HomeSidebar({
  user,
  projects,
  spaces = [],
  channels = [],
  myTasksOpen,
  setMyTasksOpen,
  moreOpen,
  setMoreOpen,
  spacesExpanded,
  toggleSpacesExpanded,
  teamOpen,
  setTeamOpen,
  projectsFolderOpen,
  setProjectsFolderOpen,
  channelsOpen,
  setChannelsOpen,
  navigate,
  sidebarSections,
  onNewSpace,
  onNewProject,
  onNewChannel,
}) {
  const location = useLocation()
  const onMyTasks = location.pathname === '/'
  const sections = sidebarSections || {
    aiChats: true,
    superAgents: false,
    channels: true,
    spaces: true,
  }

  return (
    <>
      <SideItem to="/inbox?tab=mail" icon={Inbox} label="Inbox" />
      <SideItem
        to="/assigned-comments"
        icon={MessageSquare}
        label="Assigned Comments"
      />
      <SideItem to="/reports" icon={Diamond} label="Insights" />

      {/* My Tasks — expand in place */}
      <button
        type="button"
        onClick={() => {
          setMyTasksOpen(true)
          navigate('/?view=all')
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-[6px] text-[13px] transition-colors',
          onMyTasks && !myTasksOpen
            ? 'bg-[#2a2a2e] text-white'
            : onMyTasks
              ? 'text-white'
              : 'text-[#c5c5c8] hover:bg-[#252528] hover:text-white',
        )}
      >
        <CheckSquare className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate text-left">My Tasks</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMyTasksOpen((v) => !v)
          }}
          className="rounded p-0.5 text-[#6b6b70] hover:bg-[#3a3a3e] hover:text-white"
        >
          {myTasksOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      </button>
      {myTasksOpen && (
        <div className="mb-1 ml-2 mt-1 space-y-0.5 border-l border-[#2e2e32] pl-2 pt-0.5">
          <SubSideItem view="all" label="Everything" />
          <SubSideItem view="assigned" label="Assigned to me" />
          <SubSideItem view="today" label="Today & Overdue" />
          <SubSideItem view="personal" label="Personal List" />
          <SubSideItem view="history" label="Done history" />
        </div>
      )}

      {/* More — expand in place (does NOT leave Home) */}
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-[6px] text-[13px] transition-colors',
          moreOpen
            ? 'bg-[#2a2a2e] text-white'
            : 'text-[#c5c5c8] hover:bg-[#252528] hover:text-white',
        )}
      >
        <MoreHorizontal className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate text-left">More</span>
        {moreOpen ? (
          <ChevronDown className="h-3 w-3 text-[#6b6b70]" />
        ) : (
          <ChevronRight className="h-3 w-3 text-[#6b6b70]" />
        )}
      </button>
      {moreOpen && (
        <div className="mb-1 ml-2 mt-1 space-y-0.5 border-l border-[#2e2e32] pl-2 pt-0.5">
          <SideItem to="/leads" icon={Users} label="Leads / CRM" dense />
          <SideItem to="/quotations" icon={FileSpreadsheet} label="Quotations & BOQ" dense />
          <SideItem to="/procurement" icon={Truck} label="Procurement" dense />
          <SideItem to="/finance" icon={Wallet} label="Finance" dense />
          <SideItem to="/portfolio" icon={BarChart3} label="Dashboards" dense />
          <SideItem to="/mobile" icon={Smartphone} label="Site mode" dense />
          <SideItem to="/settings" icon={Settings} label="Settings" dense />
        </div>
      )}

      {/* AI Chats */}
      {sections.aiChats && (
        <>
          <SectionLabel>AI Chats</SectionLabel>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Ask, Build, Create
          </button>
        </>
      )}

      {/* Super Agents */}
      {sections.superAgents && (
        <>
          <SectionLabel>Super Agents</SectionLabel>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#c5c5c8] hover:bg-[#252528] hover:text-white"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#7B68EE] to-[#C6FF3D]">
              <Bot className="h-3 w-3 text-white" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left">Onboarding Assistant</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New Super Agent
          </button>
        </>
      )}

      {/* Spaces */}
      {sections.spaces && (
        <>
          <div className="mt-3 mb-1 flex items-center justify-between px-2">
            <button
              type="button"
              onClick={toggleSpacesExpanded}
              className="flex items-center gap-1 text-[11px] font-medium text-[#8b8b90] hover:text-white"
            >
              {spacesExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Spaces
            </button>
            <button
              type="button"
              onClick={onNewSpace}
              className="rounded p-0.5 text-[#6b6b70] hover:bg-[#252528] hover:text-white"
              title="New Space"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {spacesExpanded && (
            <>
              <SpacesTree
                projects={projects}
                spaces={spaces}
                teamOpen={teamOpen}
                setTeamOpen={setTeamOpen}
                projectsFolderOpen={projectsFolderOpen}
                setProjectsFolderOpen={setProjectsFolderOpen}
                onNewProject={onNewProject}
              />
              <button
                type="button"
                onClick={onNewSpace}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New Space
              </button>
              <button
                type="button"
                onClick={() => onNewProject()}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New Project
              </button>
            </>
          )}
        </>
      )}

      {/* Channels */}
      {sections.channels && (
        <>
          <div className="mt-3 mb-1 flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => setChannelsOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-medium text-[#8b8b90] hover:text-white"
            >
              {channelsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Channels
            </button>
            <button
              type="button"
              onClick={onNewChannel}
              className="rounded p-0.5 text-[#6b6b70] hover:bg-[#252528] hover:text-white"
              title="New channel"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {channelsOpen && (
            <div className="space-y-0.5">
              {channels.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => navigate(`/channels/${c._id}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
                >
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              {channels.length === 0 && (
                <p className="px-2 py-1 text-[12px] text-[#6b6b70]">
                  No channels yet
                </p>
              )}
              <button
                type="button"
                onClick={onNewChannel}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add channel
              </button>
            </div>
          )}
        </>
      )}

      {/* Direct Messages */}
      <SectionLabel>Direct Messages</SectionLabel>
      <button
        type="button"
        onClick={() => navigate('/inbox?tab=mail')}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#c5c5c8] hover:bg-[#252528] hover:text-white"
      >
        <div className="relative">
          <Avatar src={user?.avatar} name={user?.name} size="xs" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#1c1c1e]" />
        </div>
        <span className="min-w-0 flex-1 truncate text-left">
          {user?.name || 'You'} — You
        </span>
      </button>
      <button
        type="button"
        onClick={() => navigate('/inbox?tab=mail&compose=1')}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        New message
      </button>
    </>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="mt-3 mb-1 px-2 text-[11px] font-medium text-[#8b8b90]">
      {children}
    </div>
  )
}

function IconBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#252528] hover:text-white"
    >
      {children}
    </button>
  )
}

function RailIcon({ children, active, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'mb-0.5 flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors',
        active
          ? 'bg-[#2a2a2e] text-white'
          : 'text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

function TopIcon({ children, onClick, title, className }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

function SideItem({ to, icon: Icon, label, end, activeWhen, dense }) {
  const location = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const active = activeWhen ? activeWhen(location) : isActive
        return cn(
          'flex items-center gap-2 rounded-md px-2 text-[13px] transition-colors',
          dense ? 'py-1' : 'py-[6px]',
          active
            ? 'bg-[#2a2a2e] text-white'
            : 'text-[#c5c5c8] hover:bg-[#252528] hover:text-white',
        )
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function SubSideItem({ view, label }) {
  const location = useLocation()
  const navigate = useNavigate()
  const current = new URLSearchParams(location.search).get('view') || 'all'
  const onMyTasks = location.pathname === '/'
  const active = onMyTasks && current === view

  return (
    <button
      type="button"
      onClick={() => navigate(`/?view=${view}`)}
      className={cn(
        'block w-full truncate rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
        active
          ? 'bg-[#2a2a2e] font-medium text-white'
          : 'text-[#8b8b90] hover:bg-[#252528] hover:text-white',
      )}
    >
      {label}
    </button>
  )
}

function SpacesTree({
  projects,
  spaces = [],
  teamOpen,
  setTeamOpen,
  projectsFolderOpen,
  setProjectsFolderOpen,
  onNewProject,
}) {
  const location = useLocation()

  return (
    <div className="mt-0.5 space-y-0.5">
      {spaces.map((space) => {
        const spaceProjects = projects.filter(
          (p) => String(p.spaceId?._id || p.spaceId || '') === String(space._id),
        )
        return (
          <div key={space._id}>
            <div className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[13px] text-[#c5c5c8] hover:bg-[#252528]">
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
                style={{ background: space.color || '#7B68EE' }}
              >
                {space.name?.charAt(0)?.toUpperCase() || 'S'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {space.name}
              </span>
              <button
                type="button"
                title="New project in this space"
                onClick={() => onNewProject?.(space._id)}
                className="rounded p-0.5 text-[#6b6b70] hover:bg-[#3a3a3e] hover:text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="ml-3 border-l border-[#2e2e32] pl-1">
              {spaceProjects.map((p) => {
                const active = location.pathname.includes(p._id)
                return (
                  <NavLink
                    key={p._id}
                    to={`/projects/${p._id}/tasks`}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-[5px] text-[13px] transition-colors',
                      active
                        ? 'bg-[#2a2a2e] text-white'
                        : 'text-[#c5c5c8] hover:bg-[#252528]',
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{p.name}</span>
                  </NavLink>
                )
              })}
              {spaceProjects.length === 0 && (
                <button
                  type="button"
                  onClick={() => onNewProject?.(space._id)}
                  className="w-full px-2 py-1 text-left text-[12px] text-[#6b6b70] hover:text-white"
                >
                  + Add project
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-0.5 rounded-md hover:bg-[#252528]">
        <button
          type="button"
          onClick={() => setTeamOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1 px-2 py-1 text-[13px] text-[#c5c5c8]"
        >
          {teamOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <span className="flex h-4 w-4 items-center justify-center rounded bg-[#3b82f6]/30 text-[#93c5fd]">
            <Network className="h-2.5 w-2.5" />
          </span>
          <span className="truncate font-medium">All projects</span>
        </button>
        <NavLink
          to="/projects"
          end
          title="Open all projects"
          className="mr-1 rounded p-0.5 text-[#6b6b70] hover:bg-[#3a3a3e] hover:text-white"
        >
          <ExternalLink className="h-3 w-3" />
        </NavLink>
      </div>

      {teamOpen && (
        <div className="ml-2 border-l border-[#2e2e32] pl-1">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setProjectsFolderOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1 text-[13px] text-[#c5c5c8] hover:bg-[#252528]"
            >
              {projectsFolderOpen ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              <Folder className="h-3.5 w-3.5 shrink-0 text-[#8b8b90]" />
              <span className="truncate">Projects</span>
              {projects.length > 0 && (
                <span className="ml-auto text-[11px] text-[#6b6b70]">
                  {projects.length}
                </span>
              )}
            </button>
            <button
              type="button"
              title="New project"
              onClick={() => onNewProject?.()}
              className="mr-1 rounded p-0.5 text-[#6b6b70] hover:bg-[#3a3a3e] hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {projectsFolderOpen && (
            <div className="ml-3">
              {projects.map((p, i) => {
                const active = location.pathname.includes(p._id)
                return (
                  <NavLink
                    key={p._id}
                    to={`/projects/${p._id}/tasks`}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-[5px] text-[13px] transition-colors',
                      active
                        ? 'bg-[#2a2a2e] text-white'
                        : 'text-[#c5c5c8] hover:bg-[#252528]',
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">
                      {p.name || `Project ${i + 1}`}
                    </span>
                  </NavLink>
                )
              })}
              {projects.length === 0 && (
                <button
                  type="button"
                  onClick={() => onNewProject?.()}
                  className="w-full px-2 py-1 text-left text-[12px] text-[#6b6b70] hover:text-white"
                >
                  No projects yet — create one
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
