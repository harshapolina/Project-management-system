import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Standard toolbar/search input — h-9, token borders, optional icon.
 */
export const SearchField = forwardRef(function SearchField(
  { className, containerClassName, value, onChange, placeholder = 'Search…', ...props },
  ref,
) {
  return (
    <div className={cn('relative min-w-0', containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-surface-raised pl-9 pr-3',
          'text-[length:var(--text-body)] text-primary placeholder:text-muted',
          'outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20',
          className,
        )}
        {...props}
      />
    </div>
  )
})
