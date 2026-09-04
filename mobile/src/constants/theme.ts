/**
 * Design tokens for the mobile app.
 *
 * Derived from the web client's emerald theme (client/src/index.css), with the
 * neutral and status ladders retuned so every text step clears WCAG AA against
 * the surface it sits on. The previous muted grey measured about 2.8:1, which
 * put every caption and secondary label below the legibility floor.
 */

export type ThemeMode = 'light' | 'dark'

const statusLight = {
  not_started: '#8c8c98',
  todo: '#8c8c98',
  in_progress: '#3ecf8e',
  review: '#e0a010',
  on_hold: '#e0a010',
  completed: '#17a06d',
  done: '#17a06d',
  delayed: '#e0483d',
} as Record<string, string>

const statusDark = {
  not_started: '#71717d',
  todo: '#71717d',
  in_progress: '#3ecf8e',
  review: '#eab308',
  on_hold: '#eab308',
  completed: '#34d399',
  done: '#34d399',
  delayed: '#f87171',
} as Record<string, string>

const priorityLight = {
  urgent: '#e0483d',
  high: '#e0a010',
  medium: '#3ecf8e',
  low: '#8c8c98',
} as Record<string, string>

const priorityDark = {
  urgent: '#f87171',
  high: '#eab308',
  medium: '#3ecf8e',
  low: '#71717d',
} as Record<string, string>

export const lightColors = {
  canvas: '#f6f6f8',
  surface: '#ffffff',
  surfaceRaised: '#f3f3f6',
  muted: '#f3f3f6',
  active: '#e8e8ee',
  rail: '#ffffff',
  railHover: '#f2f2f6',

  textPrimary: '#16161a',
  textSecondary: '#5c5c68',
  textMuted: '#6c6c78',
  textSoft: '#3c3c46',
  textOnRail: '#16161a',
  textOnRailMuted: '#5c5c68',
  /** CTA / primary button label on emerald */
  textOnAccent: '#0d1a14',
  /** Label on danger / solid red surfaces */
  textOnDanger: '#ffffff',

  accent: '#3ecf8e',
  accentHover: '#24b47e',
  accentSoft: '#e9faf2',
  /** Emerald set as type — the brand green is 2.0:1 on white */
  accentText: '#0d7a52',
  /** Filled CTA — login Sign in, Apple-style pill */
  cta: '#004838',
  ctaText: '#ffffff',

  border: '#e7e7ec',
  borderLight: '#d3d3dc',
  borderStrong: '#d3d3dc',

  danger: '#e0483d',
  dangerSoft: '#fdecea',
  dangerText: '#b3271d',
  success: '#17a06d',
  successSoft: '#e6f8ef',
  successText: '#0d7a52',
  warning: '#e0a010',
  warningSoft: '#fdf3dc',
  warningText: '#8a5d05',
  info: '#2b7fff',
  infoSoft: '#e9f1ff',
  infoText: '#1b5fc4',

  status: statusLight,
  priority: priorityLight,
}

export const darkColors = {
  canvas: '#0b0b0e',
  surface: '#141418',
  surfaceRaised: '#1c1c21',
  muted: '#131316',
  active: '#26262d',
  rail: '#0e0e11',
  railHover: 'rgba(255,255,255,0.06)',

  textPrimary: '#f3f3f5',
  textSecondary: '#a8a8b3',
  textMuted: '#8a8a95',
  textSoft: '#d0d0d7',
  textOnRail: '#f3f3f5',
  textOnRailMuted: '#a8a8b3',
  textOnAccent: '#0d1a14',
  textOnDanger: '#ffffff',

  accent: '#3ecf8e',
  accentHover: '#4ddb9c',
  accentSoft: 'rgba(62,207,142,0.13)',
  accentText: '#5fdca6',
  cta: '#004838',
  ctaText: '#ffffff',

  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(255,255,255,0.14)',

  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.15)',
  dangerText: '#fca5a5',
  success: '#34d399',
  successSoft: 'rgba(52,211,153,0.14)',
  successText: '#6ee7b7',
  warning: '#eab308',
  warningSoft: 'rgba(234,179,8,0.15)',
  warningText: '#fbbf24',
  info: '#60a5fa',
  infoSoft: 'rgba(96,165,250,0.15)',
  infoText: '#93c5fd',

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
  /** Matches the web ladder: control 8 · menu 10 · card 12 · sheet 16 */
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  /** Native form-sheet corner radius (options.ts formSheetOptions) */
  sheet: 22,
  full: 999,
}

/** Bottom clearance for scroll content above GlassyTabBar */
export const TAB_BAR_CLEARANCE = 96

/** Home hero palette — matched to AppNavBar NAV_HERO_BG and HomeScreen mock */
export const heroLight = {
  bg: '#004838',
  panel: '#0a5c48',
  lime: '#C5E966',
  limeText: '#0a2e24',
  limeMuted: 'rgba(197,233,102,0.15)',
  card: '#0a5c48',
  border: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.72)',
  /** @deprecated use text */
  white: '#ffffff',
  /** @deprecated use textMuted */
  mute: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.14)',
}

export const heroDark = heroLight

export function heroFor(_mode: ThemeMode) {
  return heroLight
}

/** Inbox / chat hub — matches home hero green + app canvas surfaces. */
export const chatLight = {
  headerFrom: '#004838',
  headerTo: '#0a5c48',
  headerText: '#ffffff',
  headerTextMuted: 'rgba(255,255,255,0.72)',
  headerSearchBg: 'rgba(255,255,255,0.14)',
  headerSearchBorder: 'rgba(255,255,255,0.14)',
  headerChipBg: 'rgba(255,255,255,0.12)',
  headerChipActive: 'rgba(255,255,255,0.22)',
  listBg: '#f4f4f5',
  rowPreview: '#71717a',
  online: '#3ecf8e',
}

export const chatDark = {
  headerFrom: '#003d30',
  headerTo: '#004838',
  headerText: '#ffffff',
  headerTextMuted: 'rgba(255,255,255,0.72)',
  headerSearchBg: 'rgba(255,255,255,0.12)',
  headerSearchBorder: 'rgba(255,255,255,0.10)',
  headerChipBg: 'rgba(255,255,255,0.10)',
  headerChipActive: 'rgba(255,255,255,0.18)',
  listBg: '#0f0f0f',
  rowPreview: '#a3a3a3',
  online: '#3ecf8e',
}

export type ChatColors = typeof chatLight

export function chatFor(mode: ThemeMode): ChatColors {
  return mode === 'dark' ? chatDark : chatLight
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
  /** iOS minimum to avoid zoom-on-focus */
  input: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.1 },
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
