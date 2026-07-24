import { cn } from '../../lib/utils'

export function ProgressRing({
  value = 0,
  size = 56,
  stroke = 4,
  className,
  color = 'var(--accent)',
  trackColor = 'var(--border-subtle)',
  showValue = true,
}) {
  const pct = Math.min(100, Math.max(0, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-200 ease-out"
        />
      </svg>
      {showValue && (
        <span className="absolute text-[11px] font-semibold tabular-nums text-primary">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}
