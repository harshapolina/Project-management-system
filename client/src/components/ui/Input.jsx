import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef(function Input(
  { className, label, error, hint, light = false, ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1.5 w-full">
      {label && (
        <span
          className={cn(
            'text-xs font-medium',
            light ? 'text-zinc-500' : 'text-secondary',
          )}
        >
          {label}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[11px] px-3 text-sm outline-none transition-all duration-150',
          'placeholder:text-secondary/70',
          light
            ? 'bg-white border border-border-light text-on-light focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200'
            : 'bg-surface-raised border border-border text-primary focus:border-accent/50 focus:ring-2 focus:ring-accent/15',
          error && 'border-status-delayed focus:border-status-delayed focus:ring-status-delayed/20',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-status-delayed">{error}</span>}
      {hint && !error && (
        <span className={cn('text-xs', light ? 'text-zinc-400' : 'text-secondary')}>
          {hint}
        </span>
      )}
    </label>
  )
})
