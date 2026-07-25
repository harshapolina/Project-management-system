/** Single source of truth for task status + priority visuals */

export const TASK_STATUSES = [
  {
    value: 'todo',
    label: 'TO DO',
    shortLabel: 'To do',
    dot: '#d4d4d8',
    bg: '#3f3f46',
    text: '#f4f4f5',
  },
  {
    value: 'in_progress',
    label: 'IN PROGRESS',
    shortLabel: 'In progress',
    dot: '#60a5fa',
    bg: '#1e3a5f',
    text: '#bfdbfe',
  },
  {
    value: 'review',
    label: 'REVIEW',
    shortLabel: 'Review',
    dot: '#fbbf24',
    bg: '#422006',
    text: '#fde68a',
  },
  {
    value: 'done',
    label: 'DONE',
    shortLabel: 'Done',
    dot: '#34d399',
    bg: '#064e3b',
    text: '#a7f3d0',
  },
]

export const TASK_PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'medium', label: 'Normal', color: '#3b82f6' },
  { value: 'low', label: 'Low', color: '#6b6b70' },
]

export function getTaskStatus(value) {
  return (
    TASK_STATUSES.find((s) => s.value === value) || TASK_STATUSES[0]
  )
}

export function getTaskPriority(value) {
  return (
    TASK_PRIORITIES.find((p) => p.value === value) || TASK_PRIORITIES[2]
  )
}

/** Parse "2h", "30m", "2h 30m", "1.5h", or plain minutes into minutes */
export function parseTimeEstimate(input) {
  if (input == null || input === '') return null
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.max(0, Math.round(input))
  }
  const s = String(input).trim().toLowerCase()
  if (!s) return null
  if (/^\d+$/.test(s)) return parseInt(s, 10)

  let total = 0
  const h = s.match(/(\d+(?:\.\d+)?)\s*h/)
  const m = s.match(/(\d+)\s*m/)
  if (h) total += Math.round(parseFloat(h[1]) * 60)
  if (m) total += parseInt(m[1], 10)
  if (!h && !m) {
    const n = Number(s)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  return total
}

export function formatTimeEstimate(minutes) {
  if (minutes == null || minutes === '' || Number(minutes) <= 0) return ''
  const n = Math.round(Number(minutes))
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/** Format tracked seconds as H:MM:SS */
export function formatTrackedSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Live total when a timer may be running */
export function liveTrackedSeconds(timeSpent, timeTrackingStartedAt, now = Date.now()) {
  const base = Math.max(0, Number(timeSpent) || 0)
  if (!timeTrackingStartedAt) return base
  const started = new Date(timeTrackingStartedAt).getTime()
  if (!Number.isFinite(started)) return base
  return base + Math.max(0, Math.floor((now - started) / 1000))
}
