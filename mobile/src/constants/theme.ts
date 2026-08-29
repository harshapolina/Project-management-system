/** Design tokens matched to client/src/index.css (Supabase-inspired emerald theme). */

export type ThemeMode = 'light' | 'dark'

const statusLight = {
  not_started: '#a1a1aa',
  todo: '#a1a1aa',
  in_progress: '#3ecf8e',
  review: '#eab308',
  on_hold: '#eab308',
  completed: '#24b47e',
  done: '#24b47e',
  delayed: '#ef4444',
} as Record<string, string>

const statusDark = {
  not_started: '#737373',
  todo: '#737373',
  in_progress: '#3ecf8e',
  review: '#eab308',
  on_hold: '#eab308',
  completed: '#34d399',
  done: '#34d399',
  delayed: '#f87171',
} as Record<string, string>

const priorityLight = {
  urgent: '#ef4444',
  high: '#eab308',
  medium: '#3ecf8e',
  low: '#a1a1aa',
} as Record<string, string>

const priorityDark = {
  urgent: '#f87171',
  high: '#eab308',
  medium: '#3ecf8e',
  low: '#737373',
} as Record<string, string>

export const lightColors = {
  canvas: '#f4f4f5',
  surface: '#ffffff',
  surfaceRaised: '#f4f4f5',
  muted: '#f4f4f5',
  active: '#e4e4e7',
  rail: '#ffffff',
  railHover: '#f4f4f5',

  textPrimary: '#18181b',
  textSecondary: '#71717a',
  textMuted: '#a1a1aa',
  textSoft: '#3f3f46',
  textOnRail: '#18181b',
  textOnRailMuted: '#71717a',
  /** CTA / primary button label on emerald */
  textOnAccent: '#171717',
  /** Label on danger / solid red surfaces */
  textOnDanger: '#ffffff',

  accent: '#3ecf8e',
  accentHover: '#24b47e',
  accentSoft: '#ecfdf5',

  border: '#e4e4e7',
  borderLight: '#d4d4d8',

  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  success: '#24b47e',
  successSoft: '#ecfdf5',
  warning: '#eab308',
  warningSoft: '#fefce8',

  status: statusLight,
  priority: priorityLight,
}

export const darkColors = {
  canvas: '#0f0f0f',
  surface: '#181818',
  surfaceRaised: '#1f1f1f',
  muted: '#151515',
  active: '#262626',
  rail: '#0c0c0c',
  railHover: 'rgba(255,255,255,0.06)',

  textPrimary: '#f5f5f5',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  textSoft: '#d4d4d4',
  textOnRail: '#f5f5f5',
  textOnRailMuted: '#a3a3a3',
  textOnAccent: '#171717',
  textOnDanger: '#ffffff',

  accent: '#3ecf8e',
  accentHover: '#34d399',
  accentSoft: 'rgba(62,207,142,0.12)',

  border: 'rgba(255,255,255,0.055)',
  borderLight: 'rgba(255,255,255,0.08)',

  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.12)',
  success: '#34d399',
  successSoft: 'rgba(52,211,153,0.12)',
  warning: '#eab308',
  warningSoft: 'rgba(234,179,8,0.12)',

  status: statusDark,
  priority: priorityDark,
}

export type AppColors = typeof lightColors

/** @deprecated Prefer useColors() — static light fallback for non-React helpers */
export const colors = lightColors

export function colorsFor(mode: ThemeMode): AppColors {
  return mode === 'dark' ? darkColors : lightColors
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
}

export const typography = {
  h1: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.1 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.1 },
  caption: { fontSize: 13, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, fontWeight: '600' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.2 },
}

export function shadowsFor(mode: ThemeMode) {
  if (mode === 'dark') {
    return {
      card: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 2,
      },
      floating: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 8,
      },
    }
  }
  return {
    card: {
      shadowColor: '#18181b',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: '#18181b',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  }
}

/** @deprecated Prefer shadowsFor(mode) via useTheme() */
export const shadows = shadowsFor('light')

export const STATUS_LABELS: Record<string, string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  review: 'Needs check',
  done: 'Done',
}

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Normal',
  low: 'Low',
}

export const STAGE_LABELS: Record<string, string> = {
  design: 'Design',
  planning: 'Planning / BOQ',
  procurement: 'Procurement',
  execution: 'Execution',
  handover: 'QC / Handover',
  new_enquiry: 'New Enquiry',
  site_visit: 'Site Visit',
  quotation_sent: 'Quotation Sent',
  negotiation: 'Negotiation',
  mood_board: 'Mood Board',
  hot: 'Hot',
  dead: 'Dead',
  won: 'Hot',
  lost: 'Dead',
}

export function stageLabel(key?: string): string {
  if (!key) return ''
  return STAGE_LABELS[key] || key.replace(/_/g, ' ')
}

export function formatInr(n?: number): string {
  const value = Number(n) || 0
  return `₹${value.toLocaleString('en-IN')}`
}
