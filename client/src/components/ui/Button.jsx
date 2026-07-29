import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const variants = {
  primary:
    'bg-accent text-white hover:bg-accent-hover shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
  secondary:
    'bg-transparent text-primary border border-border hover:bg-surface-raised',
  ghost: 'bg-transparent text-secondary hover:text-primary hover:bg-surface-raised',
  danger: 'bg-status-delayed/15 text-status-delayed border border-status-delayed/30 hover:bg-status-delayed/25',
  light: 'bg-white text-on-light hover:bg-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
}

export const Button = forwardRef(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[11px] font-semibold transition-all duration-150 ease-out',
        // A greyed-out button reads as "not ready yet"; a faded accent reads as broken.
        'disabled:pointer-events-none disabled:border-transparent disabled:bg-[#eef2f7] disabled:text-[#94a3b8] disabled:shadow-none',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-16 rounded-md bg-black/10 animate-pulse" />
      ) : (
        children
      )}
    </button>
  )
})
