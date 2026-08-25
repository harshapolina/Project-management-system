export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

export const statusColorMap = {
  'not-started': 'var(--status-not-started)',
  'not_started': 'var(--status-not-started)',
  todo: 'var(--status-not-started)',
  'in-progress': 'var(--status-in-progress)',
  'in_progress': 'var(--status-in-progress)',
  review: 'var(--status-on-hold)',
  'on-hold': 'var(--status-on-hold)',
  'on_hold': 'var(--status-on-hold)',
  completed: 'var(--status-completed)',
  done: 'var(--status-completed)',
  delayed: 'var(--status-delayed)',
  overdue: 'var(--status-delayed)',
  unpaid: 'var(--accent)',
  unsent: '#2A2A2E',
  viewed: 'var(--status-in-progress)',
  approved: 'var(--status-completed)',
  rejected: 'var(--status-delayed)',
  draft: 'var(--status-not-started)',
  sent: 'var(--status-in-progress)',
  /* Snags: open is a live defect, fixed awaits sign-off, verified is closed */
  open: 'var(--status-delayed)',
  fixed: 'var(--status-in-progress)',
  verified: 'var(--status-completed)',
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0)
}

/**
 * White wins only below this luminance — the point where contrast against
 * white overtakes contrast against black.
 */
const WHITE_WINS_BELOW = 0.179

/** `#abc` / `#aabbcc` / `#aabbccdd` → `[r, g, b]`, else null. */
function parseHex(color) {
  if (!color || typeof color !== 'string') return null
  let hex = color.trim().replace(/^#/, '').toLowerCase()
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.slice(0, 3).split('').map((c) => c + c).join('')
  }
  if (hex.length === 8) hex = hex.slice(0, 6)
  if (hex.length !== 6 || /[^0-9a-f]/.test(hex)) return null
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ]
}

/**
 * Readable foreground for an arbitrary background.
 *
 * Mirrors mobile's `isDarkColor` so a brand colour picks the same text colour
 * on both platforms. Decided by WCAG contrast ratio rather than the usual
 * "luminance < 0.5", which gets mid-tones wrong — on a mid green a naive split
 * asks for white where near-black actually reads better.
 *
 * Anything unparseable returns the dark neutral, which is readable on the
 * light surfaces this falls back to.
 */
export function onColor(background) {
  const rgb = parseHex(background)
  if (!rgb) return '#18181b'

  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance < WHITE_WINS_BELOW ? '#ffffff' : '#18181b'
}
