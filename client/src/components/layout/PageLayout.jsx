import { cn } from '../../lib/utils'
import { PagePad } from './PagePad'

/**
 * Standard page shell: PagePad + max content width + vertical rhythm.
 */
export function PageLayout({
  children,
  className,
  narrow,
  prose,
}) {
  const maxW = prose
    ? 'max-w-[var(--content-prose)]'
    : narrow
      ? 'max-w-[var(--content-narrow)]'
      : 'max-w-[var(--content-max)]'

  return (
    <PagePad>
      <div className={cn('mx-auto w-full min-w-0 space-y-5', maxW, className)}>{children}</div>
    </PagePad>
  )
}
