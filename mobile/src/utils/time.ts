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
