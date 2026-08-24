import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ThemeMode } from '../constants/theme'

const THEME_KEY = 'epm-theme'

export type { ThemeMode }

interface UiState {
  theme: ThemeMode
  hasHydrated: boolean
  setTheme: (theme: ThemeMode | string) => void
  toggleTheme: () => void
  setHasHydrated: (v: boolean) => void
}

async function persistThemeKey(theme: ThemeMode) {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      hasHydrated: false,
      setTheme: (theme) => {
        const next: ThemeMode = theme === 'dark' ? 'dark' : 'light'
        void persistThemeKey(next)
        set({ theme: next })
      },
      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
        void persistThemeKey(next)
        set({ theme: next })
      },
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'cubic-ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
