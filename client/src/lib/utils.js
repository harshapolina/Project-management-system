export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

export const statusColorMap = {
  'not-started': 'var(--status-not-started)',
  'not_started': 'var(--status-not-started)',
  todo: 'var(--status-not-started)',
  'in-progress': 'var(--status-in-progress)',
  'in_progress': 'var(--status-in-progress)',
  review: 'var(--status-in-progress)',
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
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0)
}
