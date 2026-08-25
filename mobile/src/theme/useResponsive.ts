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

  /**
   * Scroll content padding for any screen under the global tab bar.
   *
   * The glassy dock renders above every screen — nested stack screens
   * included — so both roots and pushed screens need the same bottom
   * clearance. `tabListContent` is kept as an alias so the two can't drift
   * apart silently; prefer `listContent` in new code.
   */
  const listContent = {
    paddingHorizontal: pagePadding,
    gap: spacing.md,
    paddingBottom: TAB_BAR_CLEARANCE + spacing.xl,
  }
  const tabListContent = listContent

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
