import { cn } from '../../lib/utils'

export function DataTable({
  columns = [],
  data = [],
  onRowClick,
  className,
  light = false,
  emptyMessage = 'Nothing here yet.',
}) {
  if (!data.length) {
    return (
      <div
        className={cn(
          'rounded-[18px] border px-6 py-10 text-center text-sm',
          light
            ? 'border-border-light bg-white text-zinc-500'
            : 'border-border bg-surface text-secondary',
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[18px] border',
        light ? 'border-border-light bg-white' : 'border-border bg-surface',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className={cn(
                'border-b text-xs font-medium',
                light
                  ? 'border-border-light text-zinc-500'
                  : 'border-border text-secondary',
              )}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-medium',
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
                  'border-b last:border-0 transition-colors duration-150',
                  light
                    ? 'border-border-light hover:bg-zinc-50'
                    : 'border-border hover:bg-surface-raised',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3',
                      light ? 'text-on-light' : 'text-primary',
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
