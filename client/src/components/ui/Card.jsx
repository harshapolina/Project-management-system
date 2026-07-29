import { cn } from '../../lib/utils'

export function Card({
  children,
  className,
  variant = 'dark',
  padding = true,
  hover = false,
  ...props
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] transition-all duration-150 ease-out',
        variant === 'dark' &&
          'bg-surface border border-border shadow-[0_1px_2px_rgba(11,27,43,0.06)]',
        variant === 'raised' &&
          'bg-surface-raised border border-border shadow-[0_1px_2px_rgba(11,27,43,0.06)]',
        variant === 'light' &&
          'bg-light-card text-on-light border border-border-light shadow-[0_6px_24px_rgba(11,27,43,0.08)]',
        padding && 'p-4 sm:p-5',
        hover && 'hover:border-accent/30 hover:bg-surface-raised cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
