import { cn } from '../../lib/utils'

/**
 * Standard page title block — one heading scale across the app.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}) {
  return (
    <header className={cn('mb-5 min-w-0', className)}>
      {breadcrumbs ? (
        <div className="mb-2 text-[12px] font-medium text-secondary">{breadcrumbs}</div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[length:var(--text-heading-md)] font-semibold tracking-tight text-primary">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[length:var(--text-body)] text-secondary">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
