import { cn } from '../../lib/utils'

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[12px] bg-surface-raised motion-safe:transition-opacity motion-safe:duration-200',
        className,
      )}
    />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-border bg-surface p-5',
        className,
      )}
    >
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="mb-6 h-8 w-40" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
