import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Plus,
  ReceiptIndianRupee,
  TriangleAlert,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { api, assetUrl, useAuthStore } from '../lib/api'
import { formatInr } from '../lib/format'
import {
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  Select,
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
                        to={`/boq/${q.projectId._id || q.projectId}`}
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
                        to={`/boq/${row.projectId._id || row.projectId}`}
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
  const qc = useQueryClient()
  const [addVendorOpen, setAddVendorOpen] = useState(false)
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

  const createVendor = useMutation({
    mutationFn: (body) =>
      api('/vendors', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      setAddVendorOpen(false)
      toast(`${res?.vendor?.name || 'Vendor'} added`, { type: 'success' })
    },
    onError: (e) => toast(e.message || 'Could not add vendor', { type: 'error' }),
  })

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm text-secondary">Supply chain</p>
          <h1 className="text-[24px] font-semibold leading-none tracking-tight sm:text-[32px]">
            Materials & vendors
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Purchase orders and suppliers for all projects
          </p>
        </div>
        <Button onClick={() => setAddVendorOpen(true)}>
          <Plus className="h-4 w-4" />
          Add vendor
        </Button>
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
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <span className="text-sm font-semibold">Vendor directory</span>
            <button
              type="button"
              onClick={() => setAddVendorOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-2 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
          <div className="divide-y divide-border">
            {vendorList.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-secondary">No vendors yet.</p>
                <button
                  type="button"
                  onClick={() => setAddVendorOpen(true)}
                  className="mt-2 text-[12px] font-semibold text-[#2563eb] hover:underline"
                >
                  Add your first vendor
                </button>
              </div>
            ) : (
              vendorList.map((v) => (
                <div key={v._id} className="px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {(v.categories || []).join(', ') || 'General'} · ★{' '}
                    {v.rating}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    {v.paymentTerms}
                    {v.phone ? ` · ${v.phone}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={addVendorOpen}
        onClose={() => !createVendor.isPending && setAddVendorOpen(false)}
        title="Add vendor"
      >
        <VendorForm
          loading={createVendor.isPending}
          onSubmit={(body) => createVendor.mutate(body)}
        />
      </Modal>
    </div>
  )
}

function VendorForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    categories: '',
    paymentTerms: 'Net 30',
    rating: '4',
  })

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!form.name.trim()) {
          toast('Vendor name is required', { type: 'error' })
          return
        }
        onSubmit({
          name: form.name.trim(),
          contact: form.contact.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          categories: form.categories
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
          paymentTerms: form.paymentTerms,
          rating: Number(form.rating) || 4,
        })
      }}
    >
      <Input
        label="Vendor name"
        value={form.name}
        onChange={set('name')}
        placeholder="e.g. BlueRock Materials"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Contact person"
          value={form.contact}
          onChange={set('contact')}
          placeholder="e.g. Ramesh"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={set('phone')}
          placeholder="98xxxxxxxx"
        />
      </div>
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={set('email')}
        placeholder="sales@vendor.com"
      />
      <Input
        label="Supplies (comma separated)"
        value={form.categories}
        onChange={set('categories')}
        placeholder="Plywood, Laminate, Hardware"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Payment terms"
          value={form.paymentTerms}
          onChange={set('paymentTerms')}
          options={[
            { value: 'Advance', label: 'Advance' },
            { value: 'Net 15', label: 'Net 15' },
            { value: 'Net 30', label: 'Net 30' },
            { value: 'Net 45', label: 'Net 45' },
            { value: 'On delivery', label: 'On delivery' },
          ]}
        />
        <Select
          label="Rating"
          value={form.rating}
          onChange={set('rating')}
          options={[
            { value: '5', label: '★ 5 — excellent' },
            { value: '4', label: '★ 4 — good' },
            { value: '3', label: '★ 3 — average' },
            { value: '2', label: '★ 2 — poor' },
            { value: '1', label: '★ 1 — avoid' },
          ]}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        loading={loading}
        disabled={!form.name.trim()}
      >
        Add vendor
      </Button>
    </form>
  )
}

const FINANCE_ROLES = ['admin', 'owner', 'project_manager', 'hr']

function moneyMargin(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Budget required'
  return `${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1,
  }).format(Number(value))}%`
}

function FinanceMetric({ icon: Icon, label, value, hint, tone = 'blue' }) {
  const tones = {
    blue: 'bg-[#eff6ff] text-[#2563eb]',
    slate: 'bg-[#f1f5f9] text-[#475569]',
    green: 'bg-[#ecfdf5] text-[#059669]',
    red: 'bg-[#fef2f2] text-[#dc2626]',
    amber: 'bg-[#fffbeb] text-[#d97706]',
  }
  return (
    <Card className="flex min-w-0 items-start gap-3 !p-4 sm:!p-5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
          {label}
        </p>
        <p className="mt-1 truncate text-[21px] font-semibold leading-none tabular-nums text-[#0f172a] sm:text-[24px]">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-[#94a3b8]">{hint}</p>
      </div>
    </Card>
  )
}

export function FinancePage() {
  const user = useAuthStore((s) => s.user)
  const canReview =
    !!user?.isPlatformAdmin || FINANCE_ROLES.includes(user?.role)
  const qc = useQueryClient()
  const [expenseFilter, setExpenseFilter] = useState('pending')
  const [addOpen, setAddOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    projectId: '',
    amount: '',
    category: 'Materials',
    note: '',
  })

  const {
    data,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['finance'],
    queryFn: () => api('/finance/summary'),
  })
  const {
    data: expenses,
    isLoading: expensesLoading,
    isError: expensesError,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api('/expenses'),
  })

  const d = data?.data
  const pnl = d?.pnl || []
  const expenseList = expenses?.expenses || []
  const variance = Number(d?.variance) || 0
  const overBudget = variance < 0

  const visibleExpenses = useMemo(() => {
    if (expenseFilter === 'all') return expenseList
    return expenseList.filter((ex) => ex.status === expenseFilter)
  }, [expenseList, expenseFilter])

  const review = useMutation({
    mutationFn: ({ id, status }) =>
      api(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['finance'] })
      toast(
        vars.status === 'approved'
          ? 'Expense approved and totals updated'
          : 'Expense rejected',
        { type: 'success' },
      )
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const createExpense = useMutation({
    mutationFn: (body) =>
      api('/expenses', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['finance'] })
      setExpenseForm({
        projectId: '',
        amount: '',
        category: 'Materials',
        note: '',
      })
      setAddOpen(false)
      setExpenseFilter('pending')
      toast('Expense submitted for approval', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const submitExpense = (e) => {
    e.preventDefault()
    createExpense.mutate({
      ...expenseForm,
      amount: Number(expenseForm.amount),
    })
  }

  if (summaryError || expensesError) {
    return (
      <Card className="border border-red-200 bg-red-50 text-center">
        <TriangleAlert className="mx-auto h-6 w-6 text-red-600" />
        <p className="mt-2 font-semibold text-red-800">
          Finance data could not be loaded
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ['finance'] })
            qc.invalidateQueries({ queryKey: ['expenses'] })
          }}
        >
          Try again
        </Button>
      </Card>
    )
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm text-secondary">Budget and expenses</p>
          <h1 className="text-[24px] font-semibold leading-none tracking-tight sm:text-[32px]">
            Money
          </h1>
          <p className="mt-2 text-[12px] text-[#64748b]">
            Approved expenses are included in actual spend. Purchase orders are
            shown separately as commitments.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Submit expense
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric
          icon={WalletCards}
          label="Portfolio budget"
          value={summaryLoading ? '—' : formatInr(d?.totalBudget)}
          hint="Approved project budgets"
        />
        <FinanceMetric
          icon={ReceiptIndianRupee}
          label="Actual spent"
          value={summaryLoading ? '—' : formatInr(d?.totalSpent)}
          hint={`${d?.approvedExpenseCount || 0} approved expense records`}
          tone="slate"
        />
        <FinanceMetric
          icon={overBudget ? TriangleAlert : CircleDollarSign}
          label={overBudget ? 'Over budget' : 'Budget remaining'}
          value={summaryLoading ? '—' : formatInr(Math.abs(variance))}
          hint={
            overBudget
              ? 'Portfolio needs attention'
              : 'Across all active projects'
          }
          tone={overBudget ? 'red' : 'green'}
        />
        <FinanceMetric
          icon={Clock3}
          label="Awaiting approval"
          value={summaryLoading ? '—' : formatInr(d?.pendingAmount)}
          hint={`${d?.pendingExpenseCount || 0} pending · ${formatInr(
            d?.committedAmount,
          )} committed in POs`}
          tone="amber"
        />
      </div>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-12">
        <Card
          variant="light"
          padding={false}
          className="min-w-0 overflow-hidden xl:col-span-7"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-light px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <p className="text-sm font-semibold text-on-light">
                Project financial health
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Budget minus recorded costs and approved expenses
              </p>
            </div>
            <span className="text-[11px] text-zinc-500">
              {pnl.length} projects
            </span>
          </div>

          <div className="divide-y divide-border-light md:hidden">
            {summaryLoading ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                Calculating project finances…
              </p>
            ) : pnl.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No project finance data yet.
              </p>
            ) : (
              pnl.map((row) => (
                <Link
                  key={row.id}
                  to={`/projects/${row.id}/overview`}
                  className="block space-y-2 px-4 py-3 hover:bg-[#f8fafc]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-on-light">
                      {row.name}
                    </p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>Budget {formatInr(row.quoted)}</span>
                    <span className="text-right">
                      Spent {formatInr(row.costs)}
                    </span>
                    <span
                      className={
                        row.profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }
                    >
                      {row.profit >= 0 ? 'Remaining' : 'Over'}{' '}
                      {formatInr(Math.abs(row.profit))}
                    </span>
                    <span className="text-right">
                      {moneyMargin(row.margin)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="hidden min-w-0 md:block">
            <DataTable
              className="rounded-none border-0"
              columns={[
                {
                  key: 'name',
                  label: 'Project',
                  render: (v, row) => (
                    <Link
                      to={`/projects/${row.id}/overview`}
                      className="inline-flex items-center gap-1 font-semibold text-[#0f172a] hover:text-[#2563eb]"
                    >
                      {v} <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ),
                },
                {
                  key: 'quoted',
                  label: 'Budget',
                  numeric: true,
                  align: 'right',
                  render: (v) => formatInr(v),
                },
                {
                  key: 'costs',
                  label: 'Actual spent',
                  numeric: true,
                  align: 'right',
                  render: (v) => formatInr(v),
                },
                {
                  key: 'profit',
                  label: 'Balance',
                  numeric: true,
                  align: 'right',
                  render: (v) => (
                    <span
                      className={
                        v >= 0
                          ? 'font-semibold text-emerald-700'
                          : 'font-semibold text-red-600'
                      }
                    >
                      {v < 0 ? '−' : ''}
                      {formatInr(Math.abs(v))}
                    </span>
                  ),
                },
                {
                  key: 'margin',
                  label: 'Margin',
                  numeric: true,
                  align: 'right',
                  render: (v) => moneyMargin(v),
                },
              ]}
              data={pnl}
            />
          </div>
        </Card>

        <Card
          padding={false}
          className="min-w-0 overflow-hidden xl:col-span-5"
        >
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Expense review</p>
                <p className="mt-0.5 text-[11px] text-secondary">
                  Submitted costs waiting for a decision
                </p>
              </div>
              <div className="flex rounded-lg bg-[#f1f5f9] p-0.5">
                {['pending', 'approved', 'rejected', 'all'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setExpenseFilter(filter)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold capitalize ${
                      expenseFilter === filter
                        ? 'bg-white text-[#0f172a] shadow-sm'
                        : 'text-[#64748b]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {expensesLoading ? (
              <p className="px-4 py-10 text-center text-sm text-secondary">
                Loading expenses…
              </p>
            ) : visibleExpenses.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-secondary">
                No {expenseFilter === 'all' ? '' : expenseFilter} expenses.
              </p>
            ) : (
              visibleExpenses.map((ex) => (
                <div key={ex._id} className="space-y-2.5 px-4 py-3 sm:px-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#64748b]">
                      <ReceiptIndianRupee className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">
                        {ex.note || ex.category}
                      </p>
                      <p className="truncate text-[11px] text-secondary">
                        {ex.projectId?.name || 'Unknown project'} ·{' '}
                        {ex.submittedBy?.name || 'Team member'}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-[#0f172a]">
                      {formatInr(ex.amount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-12">
                    <StatusChip status={ex.status} />
                    {ex.receiptUrl && (
                      <a
                        href={assetUrl(ex.receiptUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-[#2563eb] hover:underline"
                      >
                        View receipt
                      </a>
                    )}
                    {ex.status === 'pending' && canReview && (
                      <div className="ml-auto flex gap-1.5">
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({ id: ex._id, status: 'rejected' })
                          }
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({ id: ex._id, status: 'approved' })
                          }
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#2563eb] px-2.5 text-[11px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Submit an expense"
      >
        <form className="space-y-4" onSubmit={submitExpense}>
          <Select
            label="Project"
            value={expenseForm.projectId}
            onChange={(e) =>
              setExpenseForm((form) => ({
                ...form,
                projectId: e.target.value,
              }))
            }
            options={[
              { value: '', label: 'Select a project' },
              ...pnl.map((project) => ({
                value: String(project.id),
                label: project.name,
              })),
            ]}
          />
          <Input
            label="Amount (₹)"
            type="number"
            min="1"
            step="1"
            value={expenseForm.amount}
            onChange={(e) =>
              setExpenseForm((form) => ({
                ...form,
                amount: e.target.value,
              }))
            }
            placeholder="Enter the exact amount"
          />
          <Select
            label="Category"
            value={expenseForm.category}
            onChange={(e) =>
              setExpenseForm((form) => ({
                ...form,
                category: e.target.value,
              }))
            }
            options={[
              { value: 'Materials', label: 'Materials' },
              { value: 'Labour', label: 'Labour' },
              { value: 'Transport', label: 'Transport' },
              { value: 'Site', label: 'Site expense' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <Input
            label="Description"
            value={expenseForm.note}
            onChange={(e) =>
              setExpenseForm((form) => ({
                ...form,
                note: e.target.value,
              }))
            }
            placeholder="What was this expense for?"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createExpense.isPending}
              disabled={
                !expenseForm.projectId ||
                !expenseForm.note.trim() ||
                Number(expenseForm.amount) <= 0
              }
            >
              Submit for approval
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
