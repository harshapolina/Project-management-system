import { cn } from '../../lib/utils'

/** Attribute row: icon/label | value */
export function AttrRow({ label, icon: Icon, children, className }) {
  return (
    <div
      className={cn(
        'grid h-9 grid-cols-[120px_minmax(0,1fr)] items-center gap-x-2',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-[#64748b]">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> : null}
        <span className="truncate text-[13px]">{label}</span>
      </div>
      <div className="flex h-9 min-w-0 items-center">{children}</div>
    </div>
  )
}
