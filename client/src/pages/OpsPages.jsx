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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-secondary mb-1">Quotes & budgets</p>
        <h1 className="text-[32px] font-semibold tracking-tight leading-none">
          Quotations & BOQ
        </h1>
      </div>

      <Card variant="light" padding={false} className="overflow-hidden">
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
          data={data?.quotations || []}
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-secondary mb-1">Supply chain</p>
        <h1 className="text-[32px] font-semibold tracking-tight leading-none">
          Procurement & Vendors
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding={false}>
          <div className="border-b border-border px-5 py-4 font-semibold text-sm">
            All purchase orders
          </div>
          <DataTable
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
            data={pos?.purchaseOrders || []}
          />
        </Card>

        <Card padding={false}>
          <div className="border-b border-border px-5 py-4 font-semibold text-sm">
            Vendor directory
          </div>
          <div className="divide-y divide-border">
            {(vendors?.vendors || []).map((v) => (
              <div key={v._id} className="px-5 py-4">
                <p className="text-sm font-semibold">{v.name}</p>
                <p className="text-xs text-secondary mt-0.5">
                  {(v.categories || []).join(', ') || 'General'} · ★ {v.rating}
                </p>
                <p className="text-xs text-secondary mt-1">{v.paymentTerms}</p>
              </div>
            ))}
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-secondary mb-1">Money in motion</p>
        <h1 className="text-[32px] font-semibold tracking-tight leading-none">
          Finance
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-secondary mb-2">Portfolio budget</p>
          <p className="text-[28px] font-semibold tabular-nums text-accent leading-none">
            {formatInr(d?.totalBudget)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-secondary mb-2">Total spent</p>
          <p className="text-[28px] font-semibold tabular-nums leading-none">
            {formatInr(d?.totalSpent)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-secondary mb-2">Variance</p>
          <p className="text-[28px] font-semibold tabular-nums leading-none text-status-completed">
            {formatInr(d?.variance)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="light" padding={false}>
          <div className="border-b border-border-light px-5 py-4 font-semibold text-sm text-on-light">
            Project P&L
          </div>
          <DataTable
            light
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
                  <span className={v >= 0 ? 'text-emerald-600' : 'text-red-500'}>
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
            data={d?.pnl || []}
          />
        </Card>

        <Card padding={false}>
          <div className="border-b border-border px-5 py-4 font-semibold text-sm">
            Expense approvals
          </div>
          <div className="divide-y divide-border">
            {(expenses?.expenses || []).map((ex) => (
              <div key={ex._id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {ex.note || ex.category}
                  </p>
                  <p className="text-xs text-secondary">
                    {ex.projectId?.name} · {ex.submittedBy?.name}
                  </p>
                </div>
                <span className="tabular-nums text-sm">
                  {formatInr(ex.amount)}
                </span>
                <StatusChip status={ex.status} />
                {ex.status === 'pending' && (
                  <Button size="sm" onClick={() => approve(ex._id, 'approved')}>
                    Approve
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
