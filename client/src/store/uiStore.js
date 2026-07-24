import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  }
  return theme === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme) {
  const resolved = resolveTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved
}

export const useUiStore = create(
  persist(
    (set, get) => ({
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
      /** dark | light | system */
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      toggleTheme: () => {
        const next = resolveTheme(get().theme) === 'light' ? 'dark' : 'light'
        set({ theme: next })
        applyTheme(next)
      },
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
        globalNav: s.globalNav,
        sidebarCollapsed: s.sidebarCollapsed,
        spacesExpanded: s.spacesExpanded,
        favorites: s.favorites,
        theme: s.theme,
        sidebarSections: s.sidebarSections,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme)
      },
    },
  ),
)
