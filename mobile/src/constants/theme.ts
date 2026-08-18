/** Ported from client/src/index.css design tokens so the mobile app reads as
 * the same product, not a reskin. */
export const colors = {
  canvas: '#f0f4f8',
  surface: '#ffffff',
  surfaceRaised: '#e8eef4',
  muted: '#e8eef4',
  active: '#e2e8f0',
  rail: '#0b1b2b',
  railHover: '#132840',

  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textSoft: '#334155',
  textOnRail: '#e8edf3',
  textOnRailMuted: '#8fa1b8',

  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentSoft: '#dbeafe',

  border: '#dce4ee',
  borderLight: '#cbd5e1',

  danger: '#ef4444',
  dangerSoft: '#fee2e2',
  success: '#10b981',
  successSoft: '#d1fae5',
  warning: '#f59e0b',
  warningSoft: '#fef3c7',

  status: {
    not_started: '#94a3b8',
    todo: '#94a3b8',
    in_progress: '#3b82f6',
    review: '#f59e0b',
    on_hold: '#f59e0b',
    completed: '#10b981',
    done: '#10b981',
    delayed: '#ef4444',
  } as Record<string, string>,

  priority: {
    urgent: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#94a3b8',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
}

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, fontWeight: '600' as const },
  micro: { fontSize: 11, fontWeight: '600' as const },
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'Not started',
  in_progress: 'Working on it',
  review: 'Needs check',
  done: 'Finished',
}

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Normal',
  low: 'Low',
}

/** Ported from client/src/lib/format.js `stageLabel` — covers both project
 * stages and lead pipeline stages, which share this one lookup on web. */
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
