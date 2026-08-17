import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ToggleLeft,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '../../lib/api'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/platform', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/platform/companies', label: 'Companies', icon: Building2 },
  { to: '/platform/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/platform/users', label: 'All users', icon: Users },
  { to: '/platform/features', label: 'Feature plans', icon: ToggleLeft },
  { to: '/platform/settings', label: 'Settings', icon: Settings },
]

export function PlatformShell({ children }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'EP'

  const Sidebar = ({ onNavigate }) => (
    <>
      <div className="mb-6 px-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-[13px] font-bold text-white">
            E
          </span>
          <div>
            <p className="text-[14px] font-semibold leading-tight text-white">Editco Platform</p>
            <p className="text-[11px] text-[#94a3b8]">EPM administration</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-[#1e4a7a] text-white'
                  : 'text-[#a8bdd4] hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/10 px-2 pt-4">
        <a
          href="/login"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#a8bdd4] hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Company login
        </a>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/platform/login')
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#a8bdd4] hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
        {user?.name && (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-white">{user.name}</p>
              <p className="truncate text-[10px] text-[#64748b]">Platform admin</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F0F4F8] text-[#0f172a]">
      <aside className="hidden w-[240px] shrink-0 flex-col bg-[#0B1B2B] lg:flex">
        <div className="flex h-full flex-col py-4">
          <Sidebar />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,280px)] flex-col bg-[#0B1B2B] py-4 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-[#a8bdd4] hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#dce4ee] bg-white px-4 sm:px-6">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f0f4f8] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-[13px] font-medium text-[#64748b] lg:hidden">Editco Platform</p>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
