/**
 * Short relative stamp for feed / comment rows ("just now", "6m ago", "3d ago").
 *
 * Comment and site-feed lists can reach back ~90 days, so this tops out at
 * weeks rather than printing "87d ago".
 */
export function timeAgo(date?: string) {
  if (!date) return ''
  const ts = new Date(date).getTime()
  if (!Number.isFinite(ts)) return ''

  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`

  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`

  return `${Math.floor(days / 7)}w ago`
}

export function formatTrackedSeconds(totalSeconds?: number) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function liveTrackedSeconds(timeSpent?: number, timeTrackingStartedAt?: string | null, now = Date.now()) {
  const base = Math.max(0, Number(timeSpent) || 0)
  if (!timeTrackingStartedAt) return base
  const started = new Date(timeTrackingStartedAt).getTime()
  if (!Number.isFinite(started)) return base
  return base + Math.max(0, Math.floor((now - started) / 1000))
}

/** True when a timestamp falls on the device's current calendar day. */
export function isToday(date?: string): boolean {
  if (!date) return false
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

/** "Today" / "Yesterday" / "Mon, 14 Apr" — day headers for grouped feeds. */
export function dayLabel(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** Group key for a timestamp's calendar day (local time). */
export function dayKey(date?: string): string {
  if (!date) return 'unknown'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
