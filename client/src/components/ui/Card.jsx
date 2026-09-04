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
        'rounded-[12px] transition-all duration-150 ease-out border border-border',
        variant === 'dark' && 'bg-surface',
        variant === 'raised' && 'bg-surface-raised',
        variant === 'light' && 'bg-light-card text-on-light',
        variant === 'night' && 'bg-surface-raised text-primary',
        padding && 'p-4 sm:p-5',
        hover && 'cursor-pointer hover:bg-surface-raised active:scale-[0.995]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
