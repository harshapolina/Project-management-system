import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Card } from './Card'
import { AvatarStack } from './Avatar'

export function KpiCard({
  label,
  value,
  trend,
  trendUp,
  chart,
  avatars,
  accentValue = false,
  action,
  className,
}) {
  return (
    <Card className={cn('flex flex-col gap-4 min-h-[140px]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-secondary mb-2 truncate">{label}</p>
          <p
            className={cn(
              'text-[28px] leading-none font-semibold tracking-tight tabular-nums',
              accentValue ? 'text-accent' : 'text-primary',
            )}
          >
            {value}
          </p>
        </div>
        {trend != null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
              trendUp ? 'text-status-completed' : 'text-status-delayed',
            )}
          >
            {trendUp ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend}
          </span>
        )}
      </div>

      {(chart || avatars) && (
        <div className="mt-auto flex items-end justify-between gap-3">
          {chart && <div className="flex-1 min-w-0">{chart}</div>}
          {avatars && <AvatarStack users={avatars} max={4} size="sm" />}
        </div>
      )}

      {action && <div className="mt-auto pt-1">{action}</div>}
    </Card>
  )
}
