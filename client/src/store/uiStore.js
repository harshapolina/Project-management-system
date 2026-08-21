import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const THEME_KEY = 'epm-theme'

export function getStoredTheme() {
  try {
    const fromStore = localStorage.getItem(THEME_KEY)
    if (fromStore === 'dark' || fromStore === 'light') return fromStore
    const ui = JSON.parse(localStorage.getItem('cubic-ui') || '{}')
    if (ui?.state?.theme === 'dark' || ui?.state?.theme === 'light') {
      return ui.state.theme
    }
  } catch {
    /* ignore */
  }
  return 'light'
}

export function applyTheme(theme = getStoredTheme()) {
  const next = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', next)
  document.documentElement.style.colorScheme = next
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'dark' ? '#0f0f0f' : '#fafafa')
}

export const useUiStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        const next = theme === 'dark' ? 'dark' : 'light'
        applyTheme(next)
        set({ theme: next })
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },

      /** ClickUp-style: home | inbox | spaces | dashboards | hubs */
      globalNav: 'home',
      setGlobalNav: (globalNav) => set({ globalNav }),
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      spacesExpanded: true,
      setSpacesExpanded: (spacesExpanded) => set({ spacesExpanded }),
      toggleSpacesExpanded: () =>
        set((s) => ({ spacesExpanded: !s.spacesExpanded })),
      favorites: [],
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),
      /** Bump to open Planner create modal (not persisted) */
      plannerCreateTick: 0,
      requestPlannerCreate: () =>
        set((s) => ({ plannerCreateTick: s.plannerCreateTick + 1 })),
      /** Prefill data consumed by PlannerPage the next time the composer opens */
      plannerPrefill: { participantIds: [] },
      setPlannerPrefill: (plannerPrefill) => set({ plannerPrefill }),

      /** Global chrome overlays */
      searchOpen: false,
      inviteOpen: false,
      helpOpen: false,
      customizeOpen: false,
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setInviteOpen: (inviteOpen) => set({ inviteOpen }),
      setHelpOpen: (helpOpen) => set({ helpOpen }),
      setCustomizeOpen: (customizeOpen) => set({ customizeOpen }),
      openSearch: () => set({ searchOpen: true }),

      /** Which optional sidebar sections are visible */
      sidebarSections: {
        aiChats: true,
        superAgents: false,
        channels: true,
        spaces: true,
      },
      toggleSidebarSection: (key) =>
        set((s) => ({
          sidebarSections: {
            ...s.sidebarSections,
            [key]: !s.sidebarSections[key],
          },
        })),
    }),
    {
      name: 'cubic-ui',
      partialize: (s) => ({
        theme: s.theme,
        globalNav: s.globalNav,
        sidebarCollapsed: s.sidebarCollapsed,
        spacesExpanded: s.spacesExpanded,
        favorites: s.favorites,
        sidebarSections: s.sidebarSections,
      }),
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme || getStoredTheme())
      },
    },
  ),
)
