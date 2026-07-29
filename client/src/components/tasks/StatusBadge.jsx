import { cn } from '../../lib/utils'
import { getTaskStatus, TASK_STATUSES } from '../../lib/taskStatus'

/** Colored status pill with leading dot */
export function StatusBadge({
  status,
  className,
  showLabel = true,
  size = 'md',
}) {
  const meta = getTaskStatus(status)
  const sm = size === 'sm'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded font-bold tracking-wide',
        sm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        className,
      )}
      style={{ background: meta.bg, color: meta.text }}
    >
      <span
        className={cn(
          'shrink-0 rounded-full',
          sm ? 'h-1.5 w-1.5' : 'h-2 w-2',
        )}
        style={{ background: meta.dot }}
      />
      {showLabel ? meta.label : null}
    </span>
  )
}

/** Outlined status control */
export function StatusSelect({ value, onChange, className }) {
  const meta = getTaskStatus(value)

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <span
        className="pointer-events-none absolute left-2 z-10 h-2 w-2 rounded-full"
        style={{ background: meta.dot }}
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="cursor-pointer appearance-none rounded border border-[#e2e8f0] bg-white py-1 pl-6 pr-6 text-[11px] font-semibold tracking-wide text-[#0f172a] outline-none hover:border-[#cbd5e1]"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.shortLabel}
          </option>
        ))}
      </select>
    </div>
  )
}

export function StatusDot({ status, className }) {
  const meta = getTaskStatus(status)
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)}
      style={{ background: meta.dot }}
      title={meta.label}
    />
  )
}

/** Inline status chip used inside activity sentences */
export function StatusInline({ status }) {
  const meta = getTaskStatus(status)
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: meta.dot }}
      />
      <span className="font-medium text-[#0f172a]">{meta.shortLabel}</span>
    </span>
  )
}
