import { cn } from '../../lib/utils'
import { Button } from './Button'
import { FadeIn } from '../motion/FadeIn'

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <FadeIn
      className={cn(
        'flex flex-col items-center justify-center rounded-[18px] border border-dashed border-border bg-surface/50 px-8 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-accent">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-primary">
        {title || 'Nothing here yet'}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-secondary">
        {description || 'When something lands here, you’ll see it right away.'}
      </p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </FadeIn>
  )
}
