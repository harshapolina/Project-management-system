/** Production design tokens — calm, high-contrast, studio-grade. */
export const colors = {
  canvas: '#F6F7F9',
  surface: '#ffffff',
  surfaceRaised: '#F1F3F6',
  muted: '#EEF1F5',
  active: '#E8ECF1',
  rail: '#0B1220',
  railHover: '#151D2E',

  textPrimary: '#0F172A',
  textSecondary: '#5B6577',
  textMuted: '#8B95A7',
  textSoft: '#334155',
  textOnRail: '#E8EDF3',
  textOnRailMuted: '#8FA1B8',

  accent: '#2563EB',
  accentHover: '#1D4ED8',
  accentSoft: '#EFF4FF',

  border: '#E6EAF0',
  borderLight: '#D7DEE8',

  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',

  status: {
    not_started: '#94A3B8',
    todo: '#94A3B8',
    in_progress: '#2563EB',
    review: '#D97706',
    on_hold: '#D97706',
    completed: '#059669',
    done: '#059669',
    delayed: '#E11D48',
  } as Record<string, string>,

  priority: {
    urgent: '#E11D48',
    high: '#D97706',
    medium: '#2563EB',
    low: '#94A3B8',
  } as Record<string, string>,
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
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
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

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
}

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
  won: 'Won',
  lost: 'Lost',
}

export function stageLabel(key?: string): string {
  if (!key) return ''
  return STAGE_LABELS[key] || key.replace(/_/g, ' ')
}

export function formatInr(n?: number): string {
  const value = Number(n) || 0
  return `₹${value.toLocaleString('en-IN')}`
}
