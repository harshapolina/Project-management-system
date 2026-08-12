import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Receipt,
  Plus,
  Search,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Building2,
  Wallet,
  X,
} from 'lucide-react'
import { api, assetUrl } from '../lib/api'
import { formatInr } from '../lib/format'
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  SkeletonCard,
  toast,
} from '../components/ui'
import { cn } from '../lib/utils'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
]

const STATUS_META = {
  unpaid: {
    label: 'Unpaid',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    bar: 'from-amber-400 to-orange-500',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700 ring-red-200',
    bar: 'from-red-400 to-rose-600',
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    bar: 'from-emerald-400 to-teal-600',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    bar: 'from-slate-300 to-slate-500',
  },
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function isPdf(mime, name) {
  return (
    String(mime || '').includes('pdf') ||
    String(name || '').toLowerCase().endsWith('.pdf')
  )
}

function emptyForm() {
  return {
    invoiceNumber: '',
    vendorId: '',
    purchaseOrderId: '',
    amount: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
    status: 'unpaid',
  }
}

export function BillingPage() {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['billing-summary'],
    queryFn: () => api('/billing/summary'),
  })

  const { data: invoiceData, isLoading: listLoading } = useQuery({
    queryKey: ['billing-invoices', status, search, vendorFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (search.trim()) params.set('q', search.trim())
      if (vendorFilter !== 'all') params.set('vendorId', vendorFilter)
      return api(`/billing/invoices?${params}`)
    },
  })

  const { data: optionsData } = useQuery({
    queryKey: ['billing-options'],
    queryFn: () => api('/billing/options'),
  })

  const summary = summaryData?.summary || {
    total: 0,
    unpaidAmount: 0,
    paidThisMonth: 0,
    overdueCount: 0,
  }
  const invoices = invoiceData?.invoices || []
  const vendors = optionsData?.vendors || []
  const purchaseOrders = optionsData?.purchaseOrders || []

  const vendorPos = useMemo(() => {
    if (!form.vendorId) return purchaseOrders
    return purchaseOrders.filter(
      (po) => String(po.vendor?._id || po.vendor) === String(form.vendorId),
    )
  }, [purchaseOrders, form.vendorId])

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData()
      body.append('invoiceNumber', form.invoiceNumber)
      body.append('vendorId', form.vendorId)
      if (form.purchaseOrderId) body.append('purchaseOrderId', form.purchaseOrderId)
      body.append('amount', String(form.amount))
      if (form.invoiceDate) body.append('invoiceDate', form.invoiceDate)
      if (form.dueDate) body.append('dueDate', form.dueDate)
      if (form.notes) body.append('notes', form.notes)
      body.append('status', form.status)
      if (file) body.append('file', file)
      return api('/billing/invoices', { method: 'POST', body })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      setCreateOpen(false)
      setForm(emptyForm())
      setFile(null)
      toast('Invoice saved', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, ...body }) =>
      api(`/billing/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      toast('Invoice updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api(`/billing/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      toast('Invoice removed', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  if (summaryLoading && listLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard className="h-24" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            <Receipt className="h-3.5 w-3.5 text-blue-600" />
            Vendor billing
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-[#0f172a]">
            Billing
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[#64748b]">
            Store and track vendor invoices for material purchase orders — one
            place for every bill against your supplies.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm())
            setFile(null)
            setCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add invoice
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={FileText}
          tone="blue"
          label="Invoices stored"
          value={summary.total}
        />
        <Kpi
          icon={Clock3}
          tone="amber"
          label="Unpaid amount"
          value={formatInr(summary.unpaidAmount || 0)}
        />
        <Kpi
          icon={Wallet}
          tone="emerald"
          label="Paid this month"
          value={formatInr(summary.paidThisMonth || 0)}
        />
        <Kpi
          icon={AlertTriangle}
          tone="red"
          label="Overdue"
          value={summary.overdueCount || 0}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-5 py-4">
          <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#eef2f7] p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                  status === f.key
                    ? 'bg-white text-[#0f172a] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, vendor, PO…"
                className="h-9 w-56 rounded-xl border border-[#dce4ee] bg-white pl-8 pr-3 text-[12px] outline-none focus:border-[#93b4ec]"
              />
            </div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#dce4ee] bg-white px-3 text-[12px] font-medium text-[#475569] outline-none"
            >
              <option value="all">All vendors</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#edf1f6]">
          {listLoading && (
            <p className="px-5 py-12 text-center text-[12px] text-[#94a3b8]">
              Loading invoices…
            </p>
          )}
          {!listLoading && invoices.length === 0 && (
            <EmptyState
              className="!border-0 !bg-transparent !py-14"
              icon={Receipt}
              title="No invoices yet"
              description="Upload vendor bills for material orders so finance always has the paper trail."
              actionLabel="Add first invoice"
              onAction={() => setCreateOpen(true)}
            />
          )}
          {invoices.map((inv) => {
            const meta = STATUS_META[inv.status] || STATUS_META.unpaid
            const pdf = isPdf(inv.mimeType, inv.fileName)
            return (
              <article
                key={inv._id}
                className="group relative flex flex-col gap-4 px-5 py-4 transition hover:bg-[#fbfdff] sm:flex-row sm:items-center"
              >
                <span
                  className={cn(
                    'absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b opacity-80',
                    meta.bar,
                  )}
                />
                <button
                  type="button"
                  onClick={() => inv.fileUrl && setPreview(inv)}
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
                    inv.fileUrl
                      ? 'border-[#dce4ee] bg-[#f8fafc] hover:border-[#93b4ec]'
                      : 'border-dashed border-[#e2e8f0] bg-[#fafcfe]',
                  )}
                  title={inv.fileUrl ? 'Open invoice file' : 'No file attached'}
                >
                  {pdf ? (
                    <FileText className="h-5 w-5 text-red-500" />
                  ) : inv.fileUrl ? (
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Upload className="h-4 w-4 text-[#94a3b8]" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[#0f172a]">
                      {inv.invoiceNumber}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#64748b]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#334155]">
                      <Building2 className="h-3 w-3 text-[#94a3b8]" />
                      {inv.vendor?.name || 'Vendor'}
                    </span>
                    {inv.purchaseOrder?.poNumber && (
                      <span className="rounded-md bg-[#eff6ff] px-1.5 py-0.5 font-semibold text-[#2563eb]">
                        PO {inv.purchaseOrder.poNumber}
                      </span>
                    )}
                    {inv.projectId?.name && (
                      <span>{inv.projectId.name}</span>
                    )}
                    <span>Dated {formatDate(inv.invoiceDate)}</span>
                    {inv.dueDate && <span>Due {formatDate(inv.dueDate)}</span>}
                  </div>
                  {inv.notes && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-[#94a3b8]">
                      {inv.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                  <p className="text-[18px] font-semibold tabular-nums tracking-[-0.03em] text-[#0f172a]">
                    {formatInr(inv.amount)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          patchMutation.mutate({ id: inv._id, status: 'paid' })
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark paid
                      </button>
                    )}
                    {inv.fileUrl && (
                      <a
                        href={assetUrl(inv.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]"
                        title="Open file"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete invoice ${inv.invoiceNumber}?`,
                          )
                        ) {
                          deleteMutation.mutate(inv._id)
                        }
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#94a3b8] hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add vendor invoice"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.invoiceNumber.trim() || !form.vendorId || !form.amount) {
              toast('Invoice #, vendor, and amount are required', {
                type: 'error',
              })
              return
            }
            createMutation.mutate()
          }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) setFile(f)
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#c7d7ef] bg-gradient-to-b from-[#f5f9ff] to-white px-4 py-8 text-center transition hover:border-[#93b4ec]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Upload className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-[#0f172a]">
              {file ? file.name : 'Drop invoice PDF or photo'}
            </p>
            <p className="mt-1 text-[11px] text-[#94a3b8]">
              PDF, JPG, or PNG · up to 40 MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Invoice number"
              required
              value={form.invoiceNumber}
              onChange={(e) =>
                setForm((s) => ({ ...s, invoiceNumber: e.target.value }))
              }
              placeholder="INV-2041"
            />
            <Input
              label="Amount (₹)"
              type="number"
              required
              value={form.amount}
              onChange={(e) =>
                setForm((s) => ({ ...s, amount: e.target.value }))
              }
              placeholder="125000"
            />
          </div>

          <Select
            label="Vendor"
            value={form.vendorId}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                vendorId: e.target.value,
                purchaseOrderId: '',
              }))
            }
            options={[
              { value: '', label: 'Select vendor…' },
              ...vendors.map((v) => ({ value: v._id, label: v.name })),
            ]}
          />

          <Select
            label="Linked purchase order (optional)"
            value={form.purchaseOrderId}
            onChange={(e) => {
              const id = e.target.value
              const po = purchaseOrders.find((p) => String(p._id) === String(id))
              setForm((s) => ({
                ...s,
                purchaseOrderId: id,
                amount:
                  s.amount ||
                  (po?.value != null ? String(po.value) : s.amount),
              }))
            }}
            options={[
              { value: '', label: 'No linked PO' },
              ...vendorPos.map((po) => ({
                value: po._id,
                label: `${po.poNumber} · ${formatInr(po.value || 0)}`,
              })),
            ]}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Invoice date"
              type="date"
              value={form.invoiceDate}
              onChange={(e) =>
                setForm((s) => ({ ...s, invoiceDate: e.target.value }))
              }
            />
            <Input
              label="Due date"
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((s) => ({ ...s, dueDate: e.target.value }))
              }
            />
          </div>

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Payment terms, delivery batch, etc."
          />

          <Button
            type="submit"
            className="w-full"
            loading={createMutation.isPending}
          >
            Save invoice
          </Button>
        </form>
      </Modal>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[#0f172a]">
                  {preview.invoiceNumber}
                </p>
                <p className="truncate text-[11px] text-[#94a3b8]">
                  {preview.fileName || 'Invoice file'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f1f5f9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-[#0f172a]/[0.03] p-3">
              {isPdf(preview.mimeType, preview.fileName) ? (
                <iframe
                  title="Invoice PDF"
                  src={assetUrl(preview.fileUrl)}
                  className="h-[70vh] w-full rounded-xl bg-white"
                />
              ) : (
                <img
                  src={assetUrl(preview.fileUrl)}
                  alt={preview.invoiceNumber}
                  className="mx-auto max-h-[70vh] rounded-xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="rounded-2xl border border-[#e0e7f0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
            {label}
          </p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-[#0f172a]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            tones[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}
