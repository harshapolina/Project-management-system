import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

export const BOQ_TYPE_META = {
  residential: {
    label: 'Residential',
    hint: 'BWR – IS 303 plywood master',
    section: 'BWR – IS 303 GRADE',
  },
  commercial: {
    label: 'Commercial',
    hint: 'BWP 710 Grade plywood master',
    section: 'BWP – 710 GRADE',
  },
}

export function roomSuggestionsForType(boqType) {
  if (boqType === 'commercial') {
    return ['General', 'Lobby', 'Office', 'Corridor', 'Reception', 'Conference', 'Pantry']
  }
  if (boqType === 'residential') {
    return ['General', 'Living', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining', 'Balcony']
  }
  return ['General', 'Living', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining', 'Lobby', 'Office']
}

export function isMaterialSpecSheet(boqType, items = []) {
  if (boqType === 'residential' || boqType === 'commercial') return true
  return items.some((it) => it.materialFamily || it.grade || it.brand)
}

export function normalizeMaterialFields(it = {}) {
  return {
    materialFamily: it.materialFamily || '',
    materialName: it.materialName || '',
    grade: it.grade || '',
    thickness: it.thickness || '',
    brand: it.brand || '',
    dimensions: it.dimensions || '',
  }
}

export function MaterialCatalogPicker({ open, onClose, boqType, onAdd, onLoadTemplate }) {
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('')
  const [thickness, setThickness] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['material-catalog', boqType, q, brand, thickness, page],
    queryFn: () =>
      api(
        `/material-catalog?boqType=${boqType}&page=${page}&limit=40${q ? `&q=${encodeURIComponent(q)}` : ''}${brand ? `&brand=${encodeURIComponent(brand)}` : ''}${thickness ? `&thickness=${encodeURIComponent(thickness)}` : ''}`,
      ),
    enabled: open && !!boqType,
  })

  const items = data?.items || []
  const total = data?.total || 0
  const brands = data?.brands || []
  const thicknesses = data?.thicknesses || []
  const pages = Math.max(1, Math.ceil(total / (data?.limit || 40)))

  const meta = BOQ_TYPE_META[boqType]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Material catalog
            </p>
            <h3 className="text-[17px] font-semibold text-primary">
              {meta?.label || 'Materials'} · {meta?.section}
            </h3>
            <p className="mt-0.5 text-[12px] text-secondary">
              {total} items · pick rows to add, or load the full template
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-secondary hover:bg-canvas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search brand, thickness, size…"
              className="h-9 w-full rounded-xl border border-border bg-canvas pl-9 pr-3 text-[12px] outline-none focus:border-accent/40"
            />
          </div>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value)
              setPage(1)
            }}
            className="h-9 rounded-xl border border-border bg-canvas px-2 text-[12px]"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={thickness}
            onChange={(e) => {
              setThickness(e.target.value)
              setPage(1)
            }}
            className="h-9 rounded-xl border border-border bg-canvas px-2 text-[12px]"
          >
            <option value="">All thickness</option>
            {thicknesses.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onLoadTemplate?.()}
            className="h-9 rounded-xl bg-accent px-3 text-[12px] font-semibold text-white hover:bg-accent-hover"
          >
            Load full template ({total || 308})
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[880px] text-[12px]">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-secondary">
                <th className="px-3 py-2">S.no</th>
                <th className="px-2 py-2">Family</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Grade</th>
                <th className="px-2 py-2">Thickness</th>
                <th className="px-2 py-2">Brand</th>
                <th className="px-2 py-2">Size</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-secondary">
                    Loading catalog…
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={`${row.sno}-${row.brand}-${row.dimensions}`} className="border-b border-border/60 hover:bg-canvas">
                    <td className="px-3 py-2 tabular-nums text-secondary">{row.sno}</td>
                    <td className="px-2 py-2">{row.materialFamily}</td>
                    <td className="px-2 py-2">{row.materialName}</td>
                    <td className="px-2 py-2">{row.grade}</td>
                    <td className="px-2 py-2">{row.thickness}</td>
                    <td className="px-2 py-2 font-medium">{row.brand}</td>
                    <td className="px-2 py-2">{row.dimensions}</td>
                    <td className="px-2 py-2">{row.unit}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onAdd?.(row)}
                        className="rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-hover hover:bg-accent/20"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[12px]">
          <span className="text-secondary">
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                'rounded-lg border border-border px-3 py-1.5 font-semibold',
                page <= 1 ? 'opacity-40' : 'hover:bg-canvas',
              )}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className={cn(
                'rounded-lg border border-border px-3 py-1.5 font-semibold',
                page >= pages ? 'opacity-40' : 'hover:bg-canvas',
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NewBoqTypeModal({ open, onClose, onPick, projectType }) {
  if (!open) return null

  const suggested =
    projectType === 'commercial' ? 'commercial' : 'residential'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-semibold text-primary">New BOQ sheet</h3>
        <p className="mt-1 text-[13px] text-secondary">
          Choose the plywood material template. Residential uses BWR IS 303; commercial uses BWP 710.
        </p>
        <div className="mt-5 grid gap-3">
          {(['residential', 'commercial']).map((type) => {
            const meta = BOQ_TYPE_META[type]
            const active = type === suggested
            return (
              <button
                key={type}
                type="button"
                onClick={() => onPick(type)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition hover:border-accent/40 hover:bg-accent/5',
                  active ? 'border-accent/50 bg-accent/5 ring-2 ring-accent/15' : 'border-border',
                )}
              >
                <p className="text-[14px] font-semibold text-primary">{meta.label}</p>
                <p className="mt-0.5 text-[12px] text-secondary">{meta.hint}</p>
                {active && (
                  <p className="mt-1 text-[11px] font-semibold text-accent-hover">
                    Matches this project type
                  </p>
                )}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-border py-2.5 text-[13px] font-semibold text-secondary hover:bg-canvas"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function catalogRowToBoqLine(row, room = 'Materials') {
  return {
    description: row.description,
    ...normalizeMaterialFields(row),
    unit: 'sheet',
    qty: 0,
    rate: 0,
    amount: 0,
    room,
    image: '',
  }
}
