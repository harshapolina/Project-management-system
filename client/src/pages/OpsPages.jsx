import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatInr } from '../lib/format'
import {
  Button,
  Card,
  DataTable,
  StatusChip,
  toast,
} from '../components/ui'

export function QuotationsPage() {
  const { data } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api('/quotations'),
  })
  const quotations = data?.quotations || []

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div>
        <p className="mb-1 text-sm text-secondary">Quotes & budgets</p>
        <h1 className="text-[24px] font-semibold leading-none tracking-tight sm:text-[32px]">
          Quotations & BOQ
        </h1>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {quotations.length === 0 ? (
          <Card className="py-8 text-center text-sm text-secondary">
            No quotations yet — convert a lead or open a project BOQ.
          </Card>
        ) : (
          quotations.map((q) => (
            <Card key={q._id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.title}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {q.versionLabel} ·{' '}
                    {q.projectId ? (
                      <Link
                        to={`/projects/${q.projectId._id || q.projectId}/boq`}
                        className="text-accent"
                      >
                        Open BOQ
                      </Link>
                    ) : (
                      q.leadId?.clientName || 'Lead quote'
                    )}
                  </p>
                </div>
                <StatusChip status={q.status} />
              </div>
              <p className="mt-3 text-right text-sm font-semibold tabular-nums">
                {formatInr(q.grandTotal)}
              </p>
            </Card>
          ))
        )}
      </div>

      <Card
        variant="light"
        padding={false}
        className="hidden min-w-0 overflow-hidden md:block"
      >
        <DataTable
          light
          columns={[
            {
              key: 'title',
              label: 'Quotation',
              render: (v, row) => (
                <div>
                  <p className="font-medium">{v}</p>
                  <p className="text-xs text-zinc-500">
                    {row.versionLabel} ·{' '}
                    {row.projectId ? (
                      <Link
                        to={`/projects/${row.projectId._id || row.projectId}/boq`}
                        className="text-emerald-600"
                      >
                        Open BOQ
                      </Link>
                    ) : (
                      row.leadId?.clientName || 'Lead quote'
                    )}
                  </p>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <StatusChip status={v} />,
            },
            {
              key: 'grandTotal',
              label: 'Total',
              numeric: true,
              align: 'right',
              render: (v) => formatInr(v),
            },
          ]}
          data={quotations}
          emptyMessage="No quotations yet — convert a lead or open a project BOQ."
        />
      </Card>
    </div>
  )
}

export function ProcurementPage() {
  const { data: pos } = useQuery({
    queryKey: ['all-pos'],
    queryFn: () => api('/purchase-orders'),
  })
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api('/vendors'),
  })
  const purchaseOrders = pos?.purchaseOrders || []
  const vendorList = vendors?.vendors || []

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div>
        <p className="mb-1 text-sm text-secondary">Supply chain</p>
        <h1 className="text-[24px] font-semibold leading-none tracking-tight sm:text-[32px]">
          Procurement & Vendors
        </h1>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden lg:col-span-2" padding={false}>
          <div className="border-b border-border px-4 py-3 text-sm font-semibold sm:px-5 sm:py-4">
            All purchase orders
          </div>

          {/* Mobile: stacked rows */}
          <div className="divide-y divide-border md:hidden">
            {purchaseOrders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-secondary">
                No purchase orders yet.
              </p>
            ) : (
              purchaseOrders.map((po) => (
                <div key={po._id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {po.poNumber}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-secondary">
                        {po.projectId?.name || '—'} · {po.vendor?.name || '—'}
                      </p>
                    </div>
                    <StatusChip status={po.status} />
                  </div>
                  <p className="text-right text-sm font-medium tabular-nums">
                    {formatInr(po.value)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden min-w-0 md:block">
            <DataTable
              className="rounded-none border-0"
              columns={[
                { key: 'poNumber', label: 'PO #' },
                {
                  key: 'project',
                  label: 'Project',
                  render: (_, row) => row.projectId?.name || '—',
                },
                {
                  key: 'vendor',
                  label: 'Vendor',
                  render: (_, row) => row.vendor?.name || '—',
                },
                {
                  key: 'value',
                  label: 'Value',
                  numeric: true,
                  align: 'right',
                  render: (v) => formatInr(v),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (v) => <StatusChip status={v} />,
                },
              ]}
              data={purchaseOrders}
            />
          </div>
        </Card>

        <Card padding={false} className="min-w-0 overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold sm:px-5 sm:py-4">
            Vendor directory
          </div>
          <div className="divide-y divide-border">
            {vendorList.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-secondary">
                No vendors yet.
              </p>
            ) : (
              vendorList.map((v) => (
                <div key={v._id} className="px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {(v.categories || []).join(', ') || 'General'} · ★{' '}
                    {v.rating}
                  </p>
                  <p className="mt-1 text-xs text-secondary">{v.paymentTerms}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function FinancePage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['finance'],
    queryFn: () => api('/finance/summary'),
  })
  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api('/expenses'),
  })

  const d = data?.data
  const pnl = d?.pnl || []
  const expenseList = expenses?.expenses || []

  const approve = async (id, status) => {
    try {
      await api(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast('Expense updated', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div>
        <p className="mb-1 text-sm text-secondary">Money in motion</p>
        <h1 className="text-[24px] font-semibold leading-none tracking-tight sm:text-[32px]">
          Finance
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="!p-4 sm:!p-5">
          <p className="mb-2 text-xs text-secondary">Portfolio budget</p>
          <p className="text-[22px] font-semibold leading-none tabular-nums text-accent sm:text-[28px]">
            {formatInr(d?.totalBudget)}
          </p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="mb-2 text-xs text-secondary">Total spent</p>
          <p className="text-[22px] font-semibold leading-none tabular-nums sm:text-[28px]">
            {formatInr(d?.totalSpent)}
          </p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="mb-2 text-xs text-secondary">Variance</p>
          <p className="text-[22px] font-semibold leading-none tabular-nums text-status-completed sm:text-[28px]">
            {formatInr(d?.variance)}
          </p>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card
          variant="light"
          padding={false}
          className="min-w-0 overflow-hidden"
        >
          <div className="border-b border-border-light px-4 py-3 text-sm font-semibold text-on-light sm:px-5 sm:py-4">
            Project P&L
          </div>

          <div className="divide-y divide-border-light md:hidden">
            {pnl.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No P&L data yet.
              </p>
            ) : (
              pnl.map((row) => (
                <div key={row._id || row.name} className="space-y-1.5 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-on-light">
                    {row.name}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>Quoted {formatInr(row.quoted)}</span>
                    <span className="text-right">Costs {formatInr(row.costs)}</span>
                    <span
                      className={
                        row.profit >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }
                    >
                      Profit {formatInr(row.profit)}
                    </span>
                    <span className="text-right">Margin {row.margin}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden min-w-0 md:block">
            <DataTable
              light
              className="rounded-none border-0"
              columns={[
                { key: 'name', label: 'Project' },
                {
                  key: 'quoted',
                  label: 'Quoted',
                  numeric: true,
                  align: 'right',
                  render: (v) => formatInr(v),
                },
                {
                  key: 'costs',
                  label: 'Costs',
                  numeric: true,
                  align: 'right',
                  render: (v) => formatInr(v),
                },
                {
                  key: 'profit',
                  label: 'Profit',
                  numeric: true,
                  align: 'right',
                  render: (v) => (
                    <span
                      className={v >= 0 ? 'text-emerald-600' : 'text-red-500'}
                    >
                      {formatInr(v)}
                    </span>
                  ),
                },
                {
                  key: 'margin',
                  label: 'Margin',
                  numeric: true,
                  align: 'right',
                  render: (v) => `${v}%`,
                },
              ]}
              data={pnl}
            />
          </div>
        </Card>

        <Card padding={false} className="min-w-0 overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold sm:px-5 sm:py-4">
            Expense approvals
          </div>
          <div className="divide-y divide-border">
            {expenseList.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-secondary">
                No expenses yet.
              </p>
            ) : (
              expenseList.map((ex) => (
                <div
                  key={ex._id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {ex.note || ex.category}
                    </p>
                    <p className="text-xs text-secondary">
                      {ex.projectId?.name} · {ex.submittedBy?.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="text-sm tabular-nums">
                      {formatInr(ex.amount)}
                    </span>
                    <StatusChip status={ex.status} />
                    {ex.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => approve(ex._id, 'approved')}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
