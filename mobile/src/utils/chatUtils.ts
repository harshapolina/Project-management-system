/** Lightweight message time formatting (no date-fns dependency). */

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(d: Date) {
  return sameDay(d, new Date())
}

function isYesterday(d: Date) {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return sameDay(d, y)
}

function formatClock(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatMsgTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (isToday(d)) return formatClock(d)
  if (isYesterday(d)) return `Yesterday ${formatClock(d)}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function sameMessageDay(a: string, b: string) {
  return sameDay(new Date(a), new Date(b))
}

export function timeAgoShort(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatThreadTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (isToday(d)) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (isYesterday(d)) return 'Yesterday'
  const days = Math.floor(mins / 60 / 24)
  if (days < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Normalize mail user refs (`_id`, `id`, or raw string). */
export function mailUserId(user: { _id?: string; id?: string } | string | null | undefined): string {
  if (!user) return ''
  if (typeof user === 'string') return user
  return String(user._id ?? user.id ?? '')
}

export function isCurrentUser(
  user: { _id?: string; id?: string } | string | null | undefined,
  meId: string | null | undefined,
): boolean {
  if (!meId) return false
  return mailUserId(user) === String(meId)
}
