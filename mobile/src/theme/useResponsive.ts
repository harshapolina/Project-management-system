import { useWindowDimensions } from 'react-native'
import { spacing } from '../constants/theme'

/** Keep in sync with GlassyTabBar.TAB_BAR_CLEARANCE (avoid circular import). */
const TAB_BAR_CLEARANCE = 96

/** Breakpoints aligned to common phone widths (logical points). */
export const BREAKPOINTS = {
  compact: 360, // iPhone SE / small Android
  regular: 390,
  large: 428,
} as const

export function useResponsive() {
  const { width, height } = useWindowDimensions()
  const isCompact = width < BREAKPOINTS.compact
  const isTablet = width >= 768
  const contentMaxWidth = isTablet ? 720 : undefined
  const pagePadding = isCompact ? 12 : 16
  /** Matches Home greeting scale */
  const titleSize = isCompact ? 26 : 30
  const statsColumns = width < 340 ? 1 : 2

  /** Nested list / detail / form scroll — clears global tab bar. */
  const listContent = {
    paddingHorizontal: pagePadding,
    gap: spacing.md,
    paddingBottom: TAB_BAR_CLEARANCE + spacing.xl,
  }
  /** Tab-root scroll content that clears the glassy dock. */
  const tabListContent = {
    paddingHorizontal: pagePadding,
    gap: spacing.md,
    paddingBottom: TAB_BAR_CLEARANCE + spacing.xl,
  }

  return {
    width,
    height,
    isCompact,
    isTablet,
    contentMaxWidth,
    pagePadding,
    titleSize,
    statsColumns,
    listContent,
    tabListContent,
  }
}
