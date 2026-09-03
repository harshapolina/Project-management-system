import { useMemo } from 'react'
import { chatFor, type ChatColors } from '../constants/theme'
import { useThemeMode } from './useColors'

export function useChatColors(): ChatColors {
  const theme = useThemeMode()
  return useMemo(() => chatFor(theme), [theme])
}
