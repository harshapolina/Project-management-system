import { cn, statusColorMap } from '../../lib/utils'

function formatLabel(status) {
  return String(status || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusChip({ status, label, className, accent }) {
  const key = String(status || '').toLowerCase()
  const bg =
    accent === 'neon' || key === 'unpaid'
      ? 'var(--accent)'
      : statusColorMap[key] || 'var(--status-not-started)'

  const isNeon = bg === 'var(--accent)'
  const isDarkPill = key === 'unsent' || key === 'draft'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        className,
      )}
      style={{
        backgroundColor: bg,
        color: isNeon || isDarkPill ? (isNeon ? '#0E0E10' : '#F5F5F4') : '#fff',
      }}
    >
      {label || formatLabel(status)}
    </span>
  )
}
