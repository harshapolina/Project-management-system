import { useMemo } from 'react'
import { colorsFor, shadowsFor, type AppColors, type ThemeMode } from '../constants/theme'
import { useUiStore } from '../store/uiStore'

export function useThemeMode(): ThemeMode {
  return useUiStore((s) => s.theme)
}

export function useColors(): AppColors {
  const theme = useThemeMode()
  return useMemo(() => colorsFor(theme), [theme])
}

export function useShadows() {
  const theme = useThemeMode()
  return useMemo(() => shadowsFor(theme), [theme])
}
