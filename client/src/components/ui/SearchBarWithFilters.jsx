import { Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Select } from './Select'
import { DatePicker } from './DatePicker'

export function SearchBarWithFilters({
  value,
  onChange,
  placeholder = 'Search…',
  filters = [],
  filterValues = {},
  onFilterChange,
  dateRange,
  onDateRangeChange,
  className,
  light = false,
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-[16px] border p-2',
        light
          ? 'border-border-light bg-surface'
          : 'border-border bg-surface',
        className,
      )}
    >
      <div className="relative min-w-[200px] flex-1">
        <Search
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
            light ? 'text-secondary' : 'text-secondary',
          )}
        />
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'h-10 w-full rounded-[8px] border-0 bg-transparent pl-9 pr-3 text-sm outline-none',
            'text-primary placeholder:text-secondary',
          )}
        />
      </div>

      {filters.map((f) => (
        <div key={f.key} className="w-[140px]">
          <Select
            light={light}
            value={filterValues[f.key] || ''}
            onChange={(e) => onFilterChange?.(f.key, e.target.value)}
            options={f.options}
            placeholder={f.label}
          />
        </div>
      ))}

      {dateRange && (
        <>
          <div className="w-[140px]">
            <DatePicker
              light={light}
              value={dateRange.from || ''}
              onChange={(e) =>
                onDateRangeChange?.({ ...dateRange, from: e.target.value })
              }
            />
          </div>
          <div className="w-[140px]">
            <DatePicker
              light={light}
              value={dateRange.to || ''}
              onChange={(e) =>
                onDateRangeChange?.({ ...dateRange, to: e.target.value })
              }
            />
          </div>
        </>
      )}

      <button
        type="button"
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-[8px] px-3 text-sm transition-colors duration-150',
          'text-secondary hover:bg-surface-raised hover:text-primary',
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>
    </div>
  )
}
