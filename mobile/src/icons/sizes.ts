/**
 * Optical sizes for Ionicons. Pick by role, not by making every glyph the same.
 * The header back chevron (24 in a 42dp chip) is the visual reference.
 */
export const iconSize = {
  /** Dense table / chip actions sitting next to 12–13px labels. */
  inlineSm: 14,
  /** Page-header status row, beside the subtitle. */
  subtitle: 15,
  /** Inline with body copy, list chevrons, health tiles. */
  inline: 16,
  /** Search fields and compact wells. */
  search: 18,
  /** NavRow / list wells (18 in a 36 well). */
  well: 18,
  /** Filled IconButton on a CTA chip. */
  button: 20,
  /** Tab bar, drawer rows. */
  nav: 22,
  /** Header actions in the 42dp circular chip (matches back optically). */
  header: 22,
  /** PageHeader back chevron — do not change; other chrome keys off this. */
  back: 24,
  /** Large feature marks inside existing wells. */
  feature: 24,
  /** Empty / error wells. */
  empty: 26,
  /** Floating action button. */
  fab: 26,
  /** Hero / oversized feature. */
  featureLg: 28,
  /** Center tab-bar create control. */
  tabFab: 30,
} as const

export type IconSizeToken = keyof typeof iconSize
