import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  FileWarning,
  Gauge,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Receipt,
  Send,
  Store,
  Truck,
  Wallet,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatInr } from '../../lib/format'
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusChip,
  toast,
} from '../ui'
import { cn } from '../../lib/utils'

export const PROCUREMENT_TABS = [
  { key: 'dashboard', label: 'Overview', icon: Gauge },
  { key: 'boq', label: 'BOQ control', icon: FileSpreadsheet },
  { key: 'rfqs', label: 'RFQs', icon: Send },
  { key: 'orders', label: 'Purchase orders', icon: Package },
  { key: 'grn', label: 'GRN', icon: PackagePlus },
  { key: 'qc', label: 'QC', icon: ClipboardCheck },
  { key: 'debit', label: 'Debit notes', icon: FileWarning },
  { key: 'inventory', label: 'Inventory', icon: PackageCheck },
  { key: 'requests', label: 'Material requests', icon: ClipboardList },
  { key: 'issues', label: 'Issues', icon: PackageMinus },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'vendors', label: 'Vendors', icon: Store },
]

/** Five stages + masters — replaces the 13-tab strip */
export const PROCUREMENT_STAGES = [
  {
    id: 'home',
    step: null,
    label: 'Home',
    title: 'Where things stand',
    tabs: ['dashboard'],
  },
  {
    id: 'plan',
    step: 1,
    label: 'Plan',
    title: 'What still needs buying',
    hint: 'After BOQ is approved',
    tabs: ['boq'],
  },
  {
    id: 'buy',
    step: 2,
    label: 'Buy',
    title: 'RFQ → compare → purchase order',
    hint: 'Get prices, then raise PO',
    tabs: ['rfqs', 'orders'],
  },
  {
    id: 'receive',
    step: 3,
    label: 'Receive',
    title: 'GRN → QC → debit if needed',
    hint: 'Goods arrive at site',
    tabs: ['grn', 'qc', 'debit'],
  },
  {
    id: 'store',
    step: 4,
    label: 'Store',
    title: 'Stock & site issues',
    hint: 'Inventory and material out',
    tabs: ['inventory', 'requests', 'issues'],
  },
  {
    id: 'pay',
    step: 5,
    label: 'Pay',
    title: 'Invoice → match → payment',
    hint: 'Settle the vendor',
    tabs: ['invoices', 'payments'],
  },
  {
    id: 'vendors',
    step: null,
    label: 'Vendors',
    title: 'Vendor master',
    hint: 'Directory & ratings',
    tabs: ['vendors'],
  },
]

export function stageForTab(tab) {
  return (
    PROCUREMENT_STAGES.find((s) => s.tabs.includes(tab)) || PROCUREMENT_STAGES[0]
  )
}

export function nextTabInFlow(tab) {
  const order = [
    'dashboard',
    'boq',
    'rfqs',
    'orders',
    'grn',
    'qc',
    'debit',
    'inventory',
    'requests',
    'issues',
    'invoices',
    'payments',
  ]
  const i = order.indexOf(tab)
  if (i < 0 || i >= order.length - 1) return null
  return order[i + 1]
}

const TAB_META = Object.fromEntries(
  PROCUREMENT_TABS.map((t) => [t.key, t]),
)

const AGING = {
  not_due: { label: 'Not due', className: 'bg-emerald-50 text-emerald-700' },
  near_due: { label: 'Near due', className: 'bg-amber-50 text-amber-800' },
  due_today: { label: 'Due today', className: 'bg-orange-50 text-orange-800' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700' },
}

function fmtDate(v) {
  if (!v) return '—'
  try {
    return format(new Date(v), 'd MMM yyyy')
  } catch {
    return '—'
  }
}

/* ── Dashboard ─────────────────────────────────────────────── */

export function ProcurementDashboard({ onGo }) {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-dashboard'],
    queryFn: () => api('/procurement/dashboard'),
  })
  const p = data?.data?.pending || {}

  const guide = [
    {
      n: 1,
      title: 'BOQ approved?',
      body: 'Check what’s still available to buy.',
      tab: 'boq',
      cta: 'Open BOQ control',
      count: null,
    },
    {
      n: 2,
      title: 'Get prices & raise PO',
      body: 'RFQ → compare L1 → award → purchase order → send.',
      tab: 'rfqs',
      cta: 'Open RFQs',
      alt: { tab: 'orders', label: 'Purchase orders' },
      count: (p.rfqs || 0) + (p.draftPos || 0),
    },
    {
      n: 3,
      title: 'Receive & check',
      body: 'GRN when goods arrive, then QC. Damage creates a debit note.',
      tab: 'grn',
      cta: 'Open GRN',
      count: p.grnQc,
    },
    {
      n: 4,
      title: 'Stock & site',
      body: 'Accepted QC fills inventory. Site raises requests; you issue stock.',
      tab: 'inventory',
      cta: 'Open inventory',
      count: p.materialRequests,
    },
    {
      n: 5,
      title: 'Invoice & pay',
      body: 'Match PO + GRN + invoice, then approve and pay.',
      tab: 'payments',
      cta: 'Open payments',
      count: (p.unpaidInvoices || 0) + (p.overduePayments || 0),
    },
  ]

  if (isLoading) {
    return <p className="text-sm text-secondary">Loading pipeline…</p>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[16px] border border-border bg-gradient-to-br from-[#f8fafc] to-surface p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          How to use this page
        </p>
        <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-primary">
          Follow the numbered stages — one job at a time
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] text-secondary">
          Start at step 1 after a BOQ is approved. Use the stage bar above to
          jump; you never need all 13 screens at once.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {guide.map((g) => (
          <button
            key={g.n}
            type="button"
            onClick={() => onGo?.(g.tab)}
            className="group flex flex-col rounded-[14px] border border-border bg-surface p-4 text-left transition hover:border-accent/50 hover:shadow-[0_8px_24px_-16px_rgba(11,18,32,0.35)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b1220] text-[12px] font-bold text-white">
              {g.n}
            </span>
            <p className="mt-3 text-[13.5px] font-semibold text-primary">
              {g.title}
            </p>
            <p className="mt-1 flex-1 text-[12px] leading-relaxed text-secondary">
              {g.body}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-accent group-hover:underline">
                {g.cta}
              </span>
              {g.count > 0 ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">
                  {g.count} waiting
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open RFQs', value: p.rfqs, tab: 'rfqs' },
          { label: 'Draft POs', value: p.draftPos, tab: 'orders' },
          { label: 'Awaiting QC', value: p.grnQc, tab: 'qc' },
          { label: 'Overdue pay', value: p.overduePayments, tab: 'payments' },
        ].map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onGo?.(c.tab)}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-left transition hover:border-accent/40"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">
              {c.label}
            </p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-primary">
              {c.value ?? 0}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── BOQ Control ───────────────────────────────────────────── */

export function BoqControlTab() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects-boq'],
    queryFn: () => api('/projects'),
  })
  const projects = projectsData?.projects || []
  const [projectId, setProjectId] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['boq-control', projectId],
    queryFn: () => api(`/procurement/boq-control?projectId=${projectId}`),
    enabled: !!projectId,
  })

  const lines = data?.data?.lines || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[240px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Project
          </span>
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[
              { value: '', label: 'Select project…' },
              ...projects.map((p) => ({ value: p._id, label: p.name })),
            ]}
          />
        </label>
        {projectId ? (
          <Link
            to={`/boq/${projectId}`}
            className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-[12.5px] font-semibold text-primary hover:border-accent"
          >
            Open BOQ sheets
          </Link>
        ) : null}
      </div>

      {!projectId ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Pick a project"
          description="Available balance = BOQ qty − purchased − ordered."
        />
      ) : isLoading ? (
        <p className="text-sm text-secondary">Loading control sheet…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-[12px] text-secondary">
            <span>
              Lines{' '}
              <strong className="tabular-nums text-primary">
                {summary.lineCount || 0}
              </strong>
            </span>
            <span>
              Still open{' '}
              <strong className="tabular-nums text-accent">
                {summary.openLines || 0}
              </strong>
            </span>
            <span>
              Fully covered{' '}
              <strong className="tabular-nums text-primary">
                {summary.shortLines || 0}
              </strong>
            </span>
            {isFetching ? <span>Refreshing…</span> : null}
          </div>
          <div className="overflow-x-auto rounded-[12px] border border-border bg-surface">
            <table className="w-full min-w-[900px] text-left text-[12.5px]">
              <thead className="border-b border-border bg-canvas text-[10px] uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 font-medium">Sheet</th>
                  <th className="px-3 py-2.5 text-right font-medium">BOQ</th>
                  <th className="px-3 py-2.5 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2.5 text-right font-medium">Purchased</th>
                  <th className="px-3 py-2.5 text-right font-medium">Available</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr
                    key={`${l.quotationId}-${l.boqItemId}`}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-primary">{l.description}</p>
                      <p className="text-[11px] text-secondary">
                        {[l.room, l.unit].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-secondary">
                      {l.quotationTitle}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {l.boqQty}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {l.orderedQty}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {l.purchasedQty}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right font-semibold tabular-nums',
                        l.availableQty > 0 ? 'text-accent' : 'text-secondary',
                      )}
                    >
                      {l.availableQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lines.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-secondary">
                No approved BOQ lines for this project yet.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

/* ── GRN ───────────────────────────────────────────────────── */

export function GrnTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [poId, setPoId] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [challanNo, setChallanNo] = useState('')

  const { data: posData } = useQuery({
    queryKey: ['all-pos'],
    queryFn: () => api('/purchase-orders'),
  })
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['procurement-grns'],
    queryFn: () => api('/procurement/grns'),
  })

  const pos = (posData?.purchaseOrders || []).filter((p) =>
    ['approved', 'ordered', 'in_transit'].includes(p.status),
  )
  const grns = data?.grns || []
  const selectedPo = pos.find((p) => String(p._id) === String(poId))

  const create = useMutation({
    mutationFn: (body) =>
      api('/procurement/grns', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-grns'] })
      qc.invalidateQueries({ queryKey: ['all-pos'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
      setOpen(false)
      setPoId('')
      toast('GRN recorded — ready for QC', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-primary">Goods receipt</h2>
          <p className="text-[12px] text-secondary">
            Partial GRNs allowed — balance qty stays on the PO.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          <Truck className="h-3.5 w-3.5" />
          New GRN
        </Button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-secondary">Loading…</p>
        ) : grns.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="No GRNs yet"
            description="Receive materials against an approved or ordered PO."
            actionLabel="New GRN"
            onAction={() => setOpen(true)}
          />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-border bg-canvas text-[10px] uppercase text-secondary">
              <tr>
                <th className="px-3 py-2.5">GRN</th>
                <th className="px-3 py-2.5">PO</th>
                <th className="px-3 py-2.5">Vendor</th>
                <th className="px-3 py-2.5">Received</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((g) => (
                <tr key={g._id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-semibold text-primary">
                    {g.grnNumber}
                    <p className="text-[11px] font-normal text-secondary">
                      {g.projectId?.name || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">{g.purchaseOrder?.poNumber || '—'}</td>
                  <td className="px-3 py-2.5">{g.vendor?.name || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums text-secondary">
                    {fmtDate(g.receivedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={g.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New GRN" size="md">
        <div className="space-y-3">
          <Select
            label="Purchase order"
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
            options={[
              { value: '', label: 'Select PO…' },
              ...pos.map((p) => ({
                value: p._id,
                label: `${p.poNumber} · ${p.vendor?.name || 'Vendor'} · ${formatInr(p.value || 0)}`,
              })),
            ]}
          />
          {selectedPo ? (
            <div className="rounded-xl border border-border bg-canvas p-3 text-[12px] text-secondary">
              {(selectedPo.items || []).length} lines · warehouse receipt will
              mark PO in transit and queue QC.
            </div>
          ) : null}
          <Input
            label="Invoice / bill no."
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
          <Input
            label="Challan no."
            value={challanNo}
            onChange={(e) => setChallanNo(e.target.value)}
          />
          <Input
            label="Warehouse / location"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            placeholder="Site store / Godown A"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={create.isPending}
              disabled={!poId}
              onClick={() =>
                create.mutate({
                  purchaseOrder: poId,
                  invoiceNo,
                  challanNo,
                  warehouse,
                  items: (selectedPo?.items || []).map((it) => ({
                    description: it.description,
                    orderedQty: it.qty,
                    receivedQty: it.qty,
                    rate: it.rate,
                    boqItemId: it.boqItemId,
                  })),
                })
              }
            >
              Receive goods
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ── QC ────────────────────────────────────────────────────── */

export function QcTab() {
  const qcClient = useQueryClient()
  const { data: grnData } = useQuery({
    queryKey: ['procurement-grns'],
    queryFn: () => api('/procurement/grns'),
  })
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-qc'],
    queryFn: () => api('/procurement/qc'),
  })
  const pending = (grnData?.grns || []).filter((g) =>
    ['received', 'qc_pending'].includes(g.status),
  )
  const inspections = data?.inspections || []

  const runQc = useMutation({
    mutationFn: (grn) =>
      api('/procurement/qc', {
        method: 'POST',
        body: JSON.stringify({
          grn: grn._id,
          items: (grn.items || []).map((it) => ({
            description: it.description,
            receivedQty: it.receivedQty,
            acceptedQty: it.receivedQty,
            rejectedQty: 0,
            shortageQty: it.shortageQty || 0,
            damagedQty: 0,
          })),
          siteRemarks: 'Accepted on site',
        }),
      }),
    onSuccess: (res) => {
      qcClient.invalidateQueries({ queryKey: ['procurement-qc'] })
      qcClient.invalidateQueries({ queryKey: ['procurement-grns'] })
      qcClient.invalidateQueries({ queryKey: ['procurement-debit-notes'] })
      qcClient.invalidateQueries({ queryKey: ['inventory-items'] })
      qcClient.invalidateQueries({ queryKey: ['all-pos'] })
      toast(
        res?.debitNote
          ? 'QC done — debit note drafted for shortage/damage'
          : 'QC accepted — stock updated',
        { type: 'success' },
      )
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-primary">Quality check</h2>
        <p className="text-[12px] text-secondary">
          Accept / reject / damage / shortage. Accepted qty goes to inventory;
          damage or shortage drafts a debit note.
        </p>
      </div>

      {pending.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
            Awaiting QC
          </p>
          {pending.map((g) => (
            <div
              key={g._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-amber-200 bg-amber-50/60 px-4 py-3"
            >
              <div>
                <p className="text-[13px] font-semibold text-primary">
                  {g.grnNumber}
                </p>
                <p className="text-[11.5px] text-secondary">
                  {g.purchaseOrder?.poNumber} · {g.vendor?.name}
                </p>
              </div>
              <Button
                type="button"
                loading={runQc.isPending}
                onClick={() => runQc.mutate(g)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accept all
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-secondary">Loading…</p>
        ) : inspections.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No QC records"
            description="Complete a GRN first, then run quality check."
          />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-border bg-canvas text-[10px] uppercase text-secondary">
              <tr>
                <th className="px-3 py-2.5">GRN</th>
                <th className="px-3 py-2.5">Result</th>
                <th className="px-3 py-2.5">Checked</th>
                <th className="px-3 py-2.5">By</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((q) => (
                <tr key={q._id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-medium">{q.grn?.grnNumber}</td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={q.overallStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-secondary">
                    {fmtDate(q.checkedAt)}
                  </td>
                  <td className="px-3 py-2.5">{q.checkedBy?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── Debit notes ───────────────────────────────────────────── */

export function DebitNotesTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-debit-notes'],
    queryFn: () => api('/procurement/debit-notes'),
  })
  const notes = data?.debitNotes || []

  const patch = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/procurement/debit-notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-debit-notes'] })
      toast('Debit note updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-primary">Debit notes</h2>
        <p className="text-[12px] text-secondary">
          Shortage / damage deductions sent to the vendor.
        </p>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-secondary">Loading…</p>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={FileWarning}
            title="No debit notes"
            description="Created automatically when QC records damage or shortage."
          />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-border bg-canvas text-[10px] uppercase text-secondary">
              <tr>
                <th className="px-3 py-2.5">Note</th>
                <th className="px-3 py-2.5">Vendor</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n._id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-semibold">
                    {n.debitNumber}
                    <p className="text-[11px] font-normal text-secondary">
                      {n.purchaseOrder?.poNumber} · {n.grn?.grnNumber}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">{n.vendor?.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                    {formatInr(n.debitAmount || 0)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={n.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {n.status === 'draft' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8"
                        onClick={() =>
                          patch.mutate({ id: n._id, body: { status: 'sent' } })
                        }
                      >
                        Send to vendor
                      </Button>
                    ) : n.status === 'sent' ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            patch.mutate({
                              id: n._id,
                              body: { status: 'accepted' },
                            })
                          }
                        >
                          Accepted
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 text-red-600"
                          onClick={() =>
                            patch.mutate({
                              id: n._id,
                              body: { status: 'disputed' },
                            })
                          }
                        >
                          Disputed
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── Material requests + issues ────────────────────────────── */

export function MaterialRequestsTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('1')

  const { data: projectsData } = useQuery({
    queryKey: ['projects-boq'],
    queryFn: () => api('/projects'),
  })
  const { data, isLoading } = useQuery({
    queryKey: ['material-requests'],
    queryFn: () => api('/procurement/material-requests'),
  })
  const requests = data?.requests || []
  const projects = projectsData?.projects || []

  const create = useMutation({
    mutationFn: (body) =>
      api('/procurement/material-requests', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-requests'] })
      setOpen(false)
      toast('Material request submitted', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const patch = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/procurement/material-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-requests'] })
      toast('Request updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-primary">
            Material requests
          </h2>
          <p className="text-[12px] text-secondary">Site asks store for stock.</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          New request
        </Button>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-secondary">Loading…</p>
        ) : requests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No requests yet" />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-border bg-canvas text-[10px] uppercase text-secondary">
              <tr>
                <th className="px-3 py-2.5">Request</th>
                <th className="px-3 py-2.5">Project</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-semibold">{r.requestNumber}</td>
                  <td className="px-3 py-2.5">{r.projectId?.name}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {(r.items || []).length}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {r.status === 'submitted' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8"
                        onClick={() =>
                          patch.mutate({ id: r._id, body: { status: 'approved' } })
                        }
                      >
                        Approve
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Material request">
        <div className="space-y-3">
          <Select
            label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[
              { value: '', label: 'Select…' },
              ...projects.map((p) => ({ value: p._id, label: p.name })),
            ]}
          />
          <Input
            label="Material"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Qty"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={create.isPending}
              disabled={!projectId || !description.trim()}
              onClick={() =>
                create.mutate({
                  projectId,
                  items: [
                    {
                      description: description.trim(),
                      qty: Number(qty) || 1,
                      unit: 'nos',
                    },
                  ],
                })
              }
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function MaterialIssuesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['material-issues'],
    queryFn: () => api('/procurement/material-issues'),
  })
  const issues = data?.issues || []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-primary">
          Material issues
        </h2>
        <p className="text-[12px] text-secondary">
          Stock issued to site after request approval.
        </p>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-secondary">Loading…</p>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={PackageMinus}
            title="No issues yet"
            description="Issue stock from Inventory after approving a material request."
            actionLabel="Open inventory"
            onAction={() => {
              window.location.href = '/inventory'
            }}
          />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-border bg-canvas text-[10px] uppercase text-secondary">
              <tr>
                <th className="px-3 py-2.5">Issue</th>
                <th className="px-3 py-2.5">Project</th>
                <th className="px-3 py-2.5">Request</th>
                <th className="px-3 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i._id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-semibold">{i.issueNumber}</td>
                  <td className="px-3 py-2.5">{i.projectId?.name}</td>
                  <td className="px-3 py-2.5">
                    {i.materialRequest?.requestNumber || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-secondary">
                    {fmtDate(i.issuedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── Payments ──────────────────────────────────────────────── */

export function PaymentsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-payments'],
    queryFn: () => api('/procurement/payments'),
  })
  const payments = data?.payments || []

  const patch = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/procurement/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-payments'] })
      toast('Payment updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-primary">
            Payment gate
          </h2>
          <p className="text-[12px] text-secondary">
            Net payable = Invoice − Debit − TDS − other. Credit aging is
            colour-coded.
          </p>
        </div>
        <Link
          to="/billing"
          className="text-[12.5px] font-semibold text-accent hover:underline"
        >
          Vendor invoices →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        {Object.entries(AGING).map(([k, v]) => (
          <span
            key={k}
            className={cn('rounded-full px-2.5 py-1 font-semibold', v.className)}
          >
            {v.label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-secondary">Loading…</p>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payment records"
            description="Create a payment against a vendor invoice from Billing, or raise one here after 3-way match."
            actionLabel="Open billing"
            onAction={() => {
              window.location.href = '/billing'
            }}
          />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-border bg-canvas text-[10px] uppercase text-secondary">
              <tr>
                <th className="px-3 py-2.5">Payment</th>
                <th className="px-3 py-2.5">Vendor</th>
                <th className="px-3 py-2.5">Match</th>
                <th className="px-3 py-2.5 text-right">Net</th>
                <th className="px-3 py-2.5">Aging</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const age = AGING[p.agingBucket] || AGING.not_due
                return (
                  <tr key={p._id} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2.5 font-semibold">
                      {p.paymentNumber}
                      <p className="text-[11px] font-normal text-secondary">
                        Due {fmtDate(p.dueDate)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">{p.vendor?.name}</td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={p.matchStatus} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatInr(p.netPayable || 0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          age.className,
                        )}
                      >
                        {age.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={p.status} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {p.status === 'pending_accounts' ? (
                        <Button
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            patch.mutate({
                              id: p._id,
                              body: { status: 'pending_management' },
                            })
                          }
                        >
                          Accounts OK
                        </Button>
                      ) : null}
                      {p.status === 'pending_management' ? (
                        <Button
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            patch.mutate({
                              id: p._id,
                              body: { status: 'approved' },
                            })
                          }
                        >
                          Manage OK
                        </Button>
                      ) : null}
                      {p.status === 'approved' ? (
                        <Button
                          className="h-8"
                          onClick={() =>
                            patch.mutate({
                              id: p._id,
                              body: {
                                status: 'paid',
                                mode: 'NEFT',
                                paidAmount: p.netPayable,
                              },
                            })
                          }
                        >
                          Mark paid
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export function InventoryEmbedTab() {
  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-border bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-primary">
          Material inventory
        </h2>
        <p className="mt-1 text-[12.5px] text-secondary">
          Opening + GRN − issues ± adjustments. Full stock ledger lives on the
          Inventory page (linked to QC accepts).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/inventory"
            className="inline-flex h-9 items-center rounded-xl bg-accent px-4 text-[12.5px] font-semibold text-[#171717]"
          >
            Open stock ledger
          </Link>
          <Link
            to="/inventory?tab=log"
            className="inline-flex h-9 items-center rounded-xl border border-border px-4 text-[12.5px] font-semibold text-primary"
          >
            Movement activity
          </Link>
        </div>
      </div>
    </div>
  )
}

export function InvoicesEmbedTab() {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-primary">Vendor invoices</h2>
      <p className="mt-1 text-[12.5px] text-secondary">
        Capture invoice → link PO → feed 3-way match into the payment gate.
      </p>
      <Link
        to="/billing"
        className="mt-4 inline-flex h-9 items-center rounded-xl bg-accent px-4 text-[12.5px] font-semibold text-[#171717]"
      >
        Open billing
      </Link>
    </div>
  )
}

export function useProcurementTab() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'dashboard'
  const setTab = (key) => {
    const next = new URLSearchParams(params)
    next.set('tab', key)
    setParams(next, { replace: true })
  }
  return [tab, setTab]
}

export function ProcurementTabBar({ tab, setTab }) {
  const stage = stageForTab(tab)
  const next = nextTabInFlow(tab)
  const nextMeta = next ? TAB_META[next] : null

  return (
    <div className="space-y-3">
      {/* Stage stepper — only 6 choices instead of 13 */}
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-stretch gap-1.5 sm:min-w-0 sm:flex-wrap">
          {PROCUREMENT_STAGES.map((s, idx) => {
            const active = s.id === stage.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.tabs[0])}
                className={cn(
                  'flex min-w-[104px] flex-1 flex-col rounded-[12px] border px-3 py-2.5 text-left transition',
                  active
                    ? 'border-accent bg-[var(--nav-active-bg)] shadow-[0_1px_2px_rgba(36,180,126,0.12)]'
                    : 'border-border bg-surface hover:border-accent/35',
                )}
              >
                <span className="flex items-center gap-1.5">
                  {s.step != null ? (
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                        active
                          ? 'bg-accent text-[#171717]'
                          : 'bg-active text-secondary',
                      )}
                    >
                      {s.step}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        active ? 'bg-accent' : 'bg-[#cbd5e1]',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'text-[12.5px] font-semibold',
                      active ? 'text-primary' : 'text-secondary',
                    )}
                  >
                    {s.label}
                  </span>
                </span>
                <span className="mt-1 truncate text-[10.5px] text-secondary">
                  {s.hint || s.title}
                </span>
                {idx < PROCUREMENT_STAGES.length - 1 ? null : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-screens for this stage only */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
            {stage.step != null ? `Step ${stage.step}` : 'Section'} · {stage.label}
          </p>
          <p className="truncate text-[13px] font-semibold text-primary">
            {stage.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {stage.tabs.map((key) => {
            const meta = TAB_META[key]
            if (!meta) return null
            const Icon = meta.icon
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition',
                  active
                    ? 'bg-accent text-[#171717] shadow-sm'
                    : 'bg-active text-secondary hover:bg-[#e8eef5] hover:text-primary',
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    active ? 'text-[#171717]' : 'text-secondary',
                  )}
                />
                <span className={active ? 'text-[#171717]' : undefined}>
                  {meta.label}
                </span>
              </button>
            )
          })}
          {nextMeta ? (
            <button
              type="button"
              onClick={() => setTab(next)}
              className="ml-1 inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[12px] font-semibold text-secondary transition hover:border-accent hover:text-primary"
            >
              Next: {nextMeta.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
