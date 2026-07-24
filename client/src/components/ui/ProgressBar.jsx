import { cn } from '../../lib/utils'

export function ProgressBar({
  value = 0,
  max = 100,
  className,
  trackClassName,
  barClassName,
  showLabel = false,
  color = 'var(--accent)',
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex justify-between text-xs text-secondary">
          <span>Progress</span>
          <span className="tabular-nums text-primary">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className={cn(
          'h-1.5 w-full overflow-hidden rounded-full bg-border',
          trackClassName,
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-200 ease-out', barClassName)}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
