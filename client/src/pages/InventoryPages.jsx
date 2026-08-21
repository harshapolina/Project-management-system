import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatInr } from '../lib/format'
import {
  Button,
  Card,
  EmptyState,
  Input,
  KpiCard,
  Modal,
  Select,
  toast,
} from '../components/ui'
import { cn } from '../lib/utils'

const emptyItemForm = {
  name: '',
  sku: '',
  category: 'General',
  unit: 'pcs',
  quantity: '0',
  reorderLevel: '5',
  location: '',
  unitCost: '0',
  notes: '',
}

function stockTone(item) {
  if (item.quantity <= 0) return 'text-red-600 bg-red-50'
  if (item.quantity <= (item.reorderLevel || 0)) return 'text-amber-700 bg-amber-50'
  return 'text-emerald-700 bg-emerald-50'
}

export function InventoryStockPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [moveItem, setMoveItem] = useState(null)
  const [form, setForm] = useState(emptyItemForm)
  const [moveForm, setMoveForm] = useState({
    type: 'in',
    quantity: '1',
    note: '',
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => api('/inventory/summary'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-items', q],
    queryFn: () =>
      api(`/inventory/items${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
  })

  const items = data?.items || []
  const totals = summary?.totals || {
    items: 0,
    lowStock: 0,
    units: 0,
    value: 0,
  }

  const createMut = useMutation({
    mutationFn: (body) =>
      api('/inventory/items', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast('Inventory item added', { type: 'success' })
      setCreateOpen(false)
      setForm(emptyItemForm)
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-summary'] })
    },
    onError: (e) => toast(e.message || 'Could not add item', { type: 'error' }),
  })

  const moveMut = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/inventory/items/${id}/move`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Stock updated', { type: 'success' })
      setMoveItem(null)
      setMoveForm({ type: 'in', quantity: '1', note: '' })
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-summary'] })
      qc.invalidateQueries({ queryKey: ['inventory-movements'] })
    },
    onError: (e) => toast(e.message || 'Could not update stock', { type: 'error' }),
  })

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-secondary">
            EPM · Owner & Admin only
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-primary md:text-[32px]">
            Inventory
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-secondary">
            Track materials and supplies across your studio warehouse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/inventory/movements"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-primary hover:bg-surface-raised"
          >
            Stock log
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active items"
          value={summaryLoading ? '—' : String(totals.items)}
        />
        <KpiCard
          label="Low stock"
          value={summaryLoading ? '—' : String(totals.lowStock)}
        />
        <KpiCard
          label="Total units"
          value={summaryLoading ? '—' : String(totals.units)}
        />
        <KpiCard
          label="Stock value"
          value={summaryLoading ? '—' : formatInr(totals.value)}
          accentValue
        />
      </div>

      <Card className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, category…"
            className="h-10 w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 text-[13px] outline-none focus:border-[#4ade80]"
          />
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-secondary">Loading inventory…</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory items yet"
            description="Add materials, finishes, or site supplies to start tracking stock."
            actionLabel="Add first item"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-border text-[11px] uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-2 py-2 font-semibold">Item</th>
                  <th className="px-2 py-2 font-semibold">Category</th>
                  <th className="px-2 py-2 font-semibold">Location</th>
                  <th className="px-2 py-2 font-semibold text-right">Qty</th>
                  <th className="px-2 py-2 font-semibold text-right">Reorder</th>
                  <th className="px-2 py-2 font-semibold text-right">Unit cost</th>
                  <th className="px-2 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-[#f1f5f9] last:border-0"
                  >
                    <td className="px-2 py-3">
                      <p className="font-semibold text-primary">{item.name}</p>
                      <p className="text-[11px] text-secondary">
                        {item.sku || 'No SKU'} · {item.unit}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-secondary">{item.category}</td>
                    <td className="px-2 py-3 text-secondary">
                      {item.location || '—'}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          stockTone(item),
                        )}
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-secondary">
                      {item.reorderLevel}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-secondary">
                      {formatInr(item.unitCost)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setMoveItem(item)
                          setMoveForm({ type: 'in', quantity: '1', note: '' })
                        }}
                        className="rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3ecf8e] hover:bg-[#ecfdf5]"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add inventory item"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate({
              ...form,
              quantity: Number(form.quantity) || 0,
              reorderLevel: Number(form.reorderLevel) || 0,
              unitCost: Number(form.unitCost) || 0,
            })
          }}
        >
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
            />
            <Input
              label="Category"
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({ ...s, category: e.target.value }))
              }
            />
            <Input
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) =>
                setForm((s) => ({ ...s, location: e.target.value }))
              }
            />
            <Input
              label="Opening qty"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) =>
                setForm((s) => ({ ...s, quantity: e.target.value }))
              }
            />
            <Input
              label="Reorder level"
              type="number"
              min="0"
              value={form.reorderLevel}
              onChange={(e) =>
                setForm((s) => ({ ...s, reorderLevel: e.target.value }))
              }
            />
            <Input
              label="Unit cost (INR)"
              type="number"
              min="0"
              value={form.unitCost}
              onChange={(e) =>
                setForm((s) => ({ ...s, unitCost: e.target.value }))
              }
            />
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Save item
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!moveItem}
        onClose={() => setMoveItem(null)}
        title={moveItem ? `Adjust · ${moveItem.name}` : 'Adjust stock'}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!moveItem) return
            moveMut.mutate({
              id: moveItem._id,
              body: {
                type: moveForm.type,
                quantity: Number(moveForm.quantity),
                note: moveForm.note,
              },
            })
          }}
        >
          <Select
            label="Type"
            value={moveForm.type}
            onChange={(e) =>
              setMoveForm((s) => ({ ...s, type: e.target.value }))
            }
            options={[
              { value: 'in', label: 'Receive (stock in)' },
              { value: 'out', label: 'Issue (stock out)' },
              { value: 'adjust', label: 'Set exact quantity' },
            ]}
          />
          <Input
            label={moveForm.type === 'adjust' ? 'New quantity' : 'Quantity'}
            type="number"
            min="0.01"
            step="any"
            value={moveForm.quantity}
            onChange={(e) =>
              setMoveForm((s) => ({ ...s, quantity: e.target.value }))
            }
            required
          />
          <Input
            label="Note"
            value={moveForm.note}
            onChange={(e) =>
              setMoveForm((s) => ({ ...s, note: e.target.value }))
            }
            placeholder="Vendor delivery, site issue…"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMoveItem(null)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={moveMut.isPending}>
              Update stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export function InventoryMovementsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => api('/inventory/movements?limit=120'),
  })
  const movements = data?.movements || []

  const typeMeta = useMemo(
    () => ({
      in: {
        label: 'In',
        icon: ArrowDownLeft,
        className: 'bg-emerald-50 text-emerald-700',
      },
      out: {
        label: 'Out',
        icon: ArrowUpRight,
        className: 'bg-red-50 text-red-700',
      },
      adjust: {
        label: 'Adjust',
        icon: SlidersHorizontal,
        className: 'bg-blue-50 text-blue-700',
      },
    }),
    [],
  )

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-secondary">
            EPM · Owner & Admin only
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-primary md:text-[32px]">
            Stock log
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-secondary">
            Every receive, issue, and adjustment across inventory.
          </p>
        </div>
        <Link
          to="/inventory"
          className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-primary hover:bg-surface-raised"
        >
          Back to inventory
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-secondary">
            Loading stock movements…
          </p>
        ) : movements.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No stock movements yet"
            description="Receive or issue stock from the Inventory page to build this log."
            actionLabel="Open inventory"
            onAction={() => navigate('/inventory')}
          />
        ) : (
          <div className="space-y-2">
            {movements.map((m) => {
              const meta = typeMeta[m.type] || typeMeta.adjust
              const Icon = meta.icon
              return (
                <div
                  key={m._id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[#fafbfc] px-3 py-3"
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      meta.className,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-primary">
                      {m.itemId?.name || 'Item'}
                    </p>
                    <p className="truncate text-[11px] text-secondary">
                      {m.note || 'No note'}
                      {m.createdBy?.name ? ` · ${m.createdBy.name}` : ''}
                      {m.projectId?.name ? ` · ${m.projectId.name}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-primary">
                      {m.type === 'out' ? '−' : m.type === 'in' ? '+' : '='}
                      {m.quantity} {m.itemId?.unit || ''}
                    </p>
                    <p className="text-[11px] text-secondary">
                      Bal {m.balanceAfter} ·{' '}
                      {new Date(m.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
