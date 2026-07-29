import { Flag } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getTaskPriority, TASK_PRIORITIES } from '../../lib/taskStatus'

export function PrioritySelect({ value, onChange, className, hideIcon }) {
  const meta = getTaskPriority(value)

  return (
    <div className={cn('relative flex min-w-0 items-center gap-1.5', className)}>
      {!hideIcon && (
        <Flag
          className="pointer-events-none absolute left-0 z-10 h-3.5 w-3.5"
          style={{ color: meta.color }}
          fill={meta.color}
        />
      )}
      {hideIcon && (
        <Flag
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: meta.color }}
          fill={meta.color}
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'cursor-pointer appearance-none bg-transparent py-1 pr-2 text-[13px] outline-none',
          !hideIcon && 'pl-5',
        )}
        style={{ color: meta.color }}
      >
        {TASK_PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
