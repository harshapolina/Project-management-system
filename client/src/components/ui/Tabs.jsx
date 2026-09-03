import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function Tabs({ tabs = [], value, onChange, className, variant = 'pill' }) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-1 border-b border-border', className)}>
        {tabs.map((tab) => {
          const active = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange?.(tab.value)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                active ? 'text-primary' : 'text-secondary hover:text-primary',
              )}
            >
              {tab.label}
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-[8px] border border-border bg-surface-raised p-1',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange?.(tab.value)}
            className={cn(
              'relative rounded-[6px] px-4 py-1.5 text-sm font-medium transition-colors duration-150',
              active ? 'text-primary' : 'text-secondary hover:text-primary',
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-[6px] bg-surface"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
