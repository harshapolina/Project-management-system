import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Select = forwardRef(function Select(
  { className, label, error, light = false, options = [], placeholder, ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1.5 w-full relative">
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
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'h-10 w-full appearance-none rounded-[11px] px-3 pr-9 text-sm outline-none transition-all duration-150',
            light
              ? 'bg-white border border-border-light text-on-light focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200'
              : 'bg-surface-raised border border-border text-primary focus:border-accent/50 focus:ring-2 focus:ring-accent/15',
            error && 'border-status-delayed',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4',
            light ? 'text-zinc-400' : 'text-secondary',
          )}
        />
      </div>
      {error && <span className="text-xs text-status-delayed">{error}</span>}
    </label>
  )
})
