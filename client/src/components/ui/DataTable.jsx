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
          'rounded-[18px] border border-[#e8eef4] bg-white px-6 py-10 text-center text-sm text-[#94a3b8]',
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
        'min-w-0 w-full max-w-full overflow-hidden rounded-[18px] border border-[#e8eef4] bg-white',
        className,
      )}
    >
      <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e8eef4] bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
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
                  'border-b border-[#eef2f7] transition-colors duration-150 last:border-0 hover:bg-[#f8fafc]',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-3 text-[#0f172a] sm:px-4',
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
