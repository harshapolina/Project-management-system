import { cn } from '../../lib/utils'

export function DataTable({
  columns = [],
  data = [],
  onRowClick,
  className,
  emptyMessage = 'Nothing here yet.',
}) {
  if (!data.length) {
    return (
      <div
        className={cn(
          'rounded-[12px] border border-border bg-surface px-6 py-10 text-center text-sm text-secondary',
          className,
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-w-0 w-full max-w-full overflow-hidden rounded-[12px] border border-border bg-surface',
        className,
      )}
    >
      <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-[11px] font-semibold uppercase tracking-wide text-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 font-semibold sm:px-4',
                    col.align === 'right' && 'text-right',
                    col.className,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || row._id || i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface-raised',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-3 text-primary sm:px-4',
                      col.numeric && 'tabular-nums',
                      col.align === 'right' && 'text-right',
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
