import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Mail,
  MessageCircle,
  Package,
  Pencil,
  Phone as PhoneIcon,
  Plus,
  ReceiptIndianRupee,
  Store,
  TriangleAlert,
  Truck,
  User2,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { api, assetUrl, useAuthStore } from '../lib/api'
import { formatInr } from '../lib/format'
import { COUNTRY_CODES, buildPhone, splitPhone, whatsappLink } from '../lib/phone'
import { Stars, SendPoButton } from '../components/VendorBits'
import { cn } from '../lib/utils'
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
  const [editVendor, setEditVendor] = useState(null)
  const [compareOpen, setCompareOpen] = useState(false)
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

  const updateVendor = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      qc.invalidateQueries({ queryKey: ['all-pos'] })
      setEditVendor(null)
      toast('Vendor updated', { type: 'success' })
    },
    onError: (e) =>
      toast(e.message || 'Could not update vendor', { type: 'error' }),
  })

  const totalPoValue = purchaseOrders.reduce(
    (s, po) => s + (Number(po.value) || 0),
    0,
  )
  const deliveredCount = purchaseOrders.filter(
    (po) => po.status === 'delivered',
  ).length
  const openCount = purchaseOrders.length - deliveredCount

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#1d4ed8]">
            <Truck className="h-3 w-3" />
            Supply chain
          </p>
          <h1 className="text-[24px] font-semibold leading-none tracking-tight sm:text-[32px]">
            Materials & vendors
          </h1>
          <p className="mt-1.5 text-sm text-secondary">
            Purchase orders and suppliers for all projects
          </p>
        </div>
        <Button onClick={() => setAddVendorOpen(true)}>
          <Plus className="h-4 w-4" />
          Add vendor
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={WalletCards}
          tint="blue"
          label="Total PO value"
          value={formatInr(totalPoValue)}
          sub={`across ${purchaseOrders.length} order${purchaseOrders.length === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Truck}
          tint="amber"
          label="In pipeline"
          value={openCount}
          sub="draft → in transit"
        />
        <StatCard
          icon={CheckCircle2}
          tint="emerald"
          label="Delivered"
          value={deliveredCount}
          sub="orders completed"
        />
        <StatCard
          icon={Store}
          tint="violet"
          label="Vendors"
          value={vendorList.length}
          sub="in your directory"
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e4eaf3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-24px_rgba(16,24,40,0.18)] lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] bg-gradient-to-r from-[#f8fafc] to-white px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] ring-1 ring-inset ring-[#dbeafe]">
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-[#0b1220]">
                  Purchase orders
                </p>
                <p className="truncate text-[11px] text-[#94a3b8]">
                  Tap Send to WhatsApp the list to the vendor
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#475569]">
              {purchaseOrders.length}
            </span>
          </div>

          {/* Mobile: stacked rows */}
          <div className="divide-y divide-[#eef2f7] md:hidden">
            {purchaseOrders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-secondary">
                No purchase orders yet.
              </p>
            ) : (
              purchaseOrders.map((po) => (
                <div
                  key={po._id}
                  className="space-y-2 px-4 py-3 transition hover:bg-[#fbfcfe]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0b1220]">
                        {po.poNumber}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-secondary">
                        {po.projectId?.name || '—'} · {po.vendor?.name || '—'}
                      </p>
                    </div>
                    <StatusChip status={po.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <SendPoButton po={po} />
                    <p className="text-right text-sm font-bold tabular-nums text-[#0b1220]">
                      {formatInr(po.value)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden min-w-0 md:block">
            <DataTable
              className="rounded-none border-0"
              columns={[
                {
                  key: 'poNumber',
                  label: 'PO #',
                  render: (v, row) => (
                    <div>
                      <p className="font-bold text-[#0b1220]">{v}</p>
                      <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                        {row.items?.length
                          ? `${row.items.length} line${row.items.length === 1 ? '' : 's'}`
                          : '—'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'project',
                  label: 'Project',
                  render: (_, row) => (
                    <span className="text-[#475569]">
                      {row.projectId?.name || '—'}
                    </span>
                  ),
                },
                {
                  key: 'vendor',
                  label: 'Vendor',
                  render: (_, row) =>
                    row.vendor?.name ? (
                      <span className="flex items-center gap-2">
                        <VendorAvatar name={row.vendor.name} size="sm" />
                        <span className="font-medium">{row.vendor.name}</span>
                      </span>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'value',
                  label: 'Value',
                  numeric: true,
                  align: 'right',
                  render: (v) => (
                    <span className="font-bold text-[#0b1220]">
                      {formatInr(v)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (v) => <StatusChip status={v} />,
                },
                {
                  key: 'send',
                  label: '',
                  render: (_, row) => <SendPoButton po={row} />,
                },
              ]}
              data={purchaseOrders}
            />
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e4eaf3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-24px_rgba(16,24,40,0.18)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] bg-gradient-to-r from-[#f8fafc] to-white px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed] ring-1 ring-inset ring-[#ede9fe]">
                <Store className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-[#0b1220]">
                  Vendor directory
                </p>
                <p className="truncate text-[11px] text-[#94a3b8]">
                  {vendorList.length} supplier{vendorList.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {vendorList.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setCompareOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#d7e5fc] bg-[#eef4ff] px-2 py-1 text-[11px] font-semibold text-[#1d4ed8] transition hover:bg-[#e0ebff]"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Compare
                </button>
              )}
              <button
                type="button"
                onClick={() => setAddVendorOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-2 py-1 text-[11px] font-semibold text-[#475569] transition hover:bg-[#f8fafc]"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#eef2f7]">
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
                <div
                  key={v._id}
                  className="group px-4 py-3 transition hover:bg-[#fbfcfe] sm:px-5 sm:py-4"
                >
                  <div className="flex items-start gap-3">
                    <VendorAvatar name={v.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-[#0b1220]">
                          {v.name}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 pt-0.5">
                          <Stars value={v.rating} />
                          <span className="text-[11px] font-semibold text-[#94a3b8]">
                            {v.rating}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {((v.categories || []).length
                          ? v.categories
                          : ['General']
                        ).map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10.5px] font-semibold text-[#475569]"
                          >
                            {c}
                          </span>
                        ))}
                        <span className="rounded-full bg-[#fefce8] px-2 py-0.5 text-[10.5px] font-semibold text-[#a16207] ring-1 ring-inset ring-[#fef08a]">
                          {v.paymentTerms}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 grid gap-x-4 gap-y-1 text-xs text-secondary sm:grid-cols-2">
                    {v.contact && (
                      <p className="flex items-center gap-1.5 truncate">
                        <User2 className="h-3 w-3 shrink-0 text-[#b4c0d0]" />
                        {v.contact}
                      </p>
                    )}
                    {v.phone && (
                      <p className="flex items-center gap-1.5 truncate tabular-nums">
                        <PhoneIcon className="h-3 w-3 shrink-0 text-[#b4c0d0]" />
                        {v.phone}
                      </p>
                    )}
                    {v.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0 text-[#b4c0d0]" />
                        {v.email}
                      </p>
                    )}
                    {v.gst && (
                      <p className="flex items-center gap-1.5 truncate">
                        <BadgeCheck className="h-3 w-3 shrink-0 text-[#b4c0d0]" />
                        GST:{' '}
                        <span className="font-medium tabular-nums text-[#475569]">
                          {v.gst}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      title={
                        v.phone
                          ? `Chat with ${v.contact || v.name} on WhatsApp`
                          : 'Add a phone number to chat on WhatsApp'
                      }
                      onClick={() => {
                        const url = whatsappLink(
                          v.phone,
                          `Hello ${v.contact || v.name},`,
                        )
                        if (!url) {
                          toast('No phone number saved for this vendor', {
                            type: 'error',
                          })
                          return
                        }
                        window.open(url, '_blank', 'noopener')
                      }}
                      className={cn(
                        'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-white shadow-sm transition',
                        v.phone
                          ? 'bg-[#25D366] hover:bg-[#1fb958]'
                          : 'bg-[#a7dcbb] hover:bg-[#98d2ad]',
                      )}
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      title="Edit vendor details"
                      onClick={() => setEditVendor(v)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#e2e8f0] px-2 text-[11.5px] font-semibold text-[#475569] transition hover:bg-white"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
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

      <Modal
        open={!!editVendor}
        onClose={() => !updateVendor.isPending && setEditVendor(null)}
        title={`Edit ${editVendor?.name || 'vendor'}`}
      >
        {editVendor && (
          <VendorForm
            initial={editVendor}
            submitLabel="Save changes"
            loading={updateVendor.isPending}
            onSubmit={(body) =>
              updateVendor.mutate({ id: editVendor._id, body })
            }
          />
        )}
      </Modal>

      <VendorCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        vendors={vendorList}
        purchaseOrders={purchaseOrders}
      />
    </div>
  )
}


const STAT_TINTS = {
  blue: 'bg-[#eff6ff] text-[#2563eb] ring-[#dbeafe]',
  amber: 'bg-[#fffbeb] text-[#d97706] ring-[#fde68a]',
  emerald: 'bg-[#ecfdf5] text-[#059669] ring-[#a7f3d0]',
  violet: 'bg-[#f5f3ff] text-[#7c3aed] ring-[#ede9fe]',
}

function StatCard({ icon: Icon, label, value, sub, tint = 'blue' }) {
  return (
    <div className="rounded-2xl border border-[#e4eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(16,24,40,0.22)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8a98ac]">
          {label}
        </p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            STAT_TINTS[tint],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1.5 truncate text-[20px] font-bold tabular-nums tracking-tight text-[#0b1220] sm:text-[22px]">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11.5px] text-[#94a3b8]">{sub}</p>
    </div>
  )
}

const AVATAR_TINTS = [
  'from-blue-500 to-indigo-500',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
]

function VendorAvatar({ name = '', size = 'md', className }) {
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  const tint = AVATAR_TINTS[(name.charCodeAt(0) || 0) % AVATAR_TINTS.length]
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-white shadow-sm',
        size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-9 w-9 text-[12px]',
        tint,
        className,
      )}
    >
      {initials}
    </span>
  )
}

function VendorForm({ onSubmit, loading, initial = null, submitLabel = 'Add vendor' }) {
  const [form, setForm] = useState(() => {
    const { code, number } = splitPhone(initial?.phone)
    return {
      name: initial?.name || '',
      contact: initial?.contact || '',
      phoneCode: code,
      phone: number,
      email: initial?.email || '',
      gst: initial?.gst || '',
      categories: (initial?.categories || []).join(', '),
      paymentTerms: initial?.paymentTerms || 'Net 30',
      rating: String(initial?.rating || 4),
    }
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
          phone: buildPhone(form.phoneCode, form.phone),
          email: form.email.trim(),
          gst: form.gst.trim().toUpperCase(),
          categories: form.categories
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
          paymentTerms: form.paymentTerms,
          rating: Number(form.rating) || 4,
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Vendor name"
          value={form.name}
          onChange={set('name')}
          placeholder="e.g. BlueRock Materials"
        />
        <Input
          label="Contact person"
          value={form.contact}
          onChange={set('contact')}
          placeholder="e.g. Ramesh"
        />
      </div>
      <div className="flex gap-2">
        <div className="w-[104px] shrink-0">
          <Select
            label="Code"
            value={form.phoneCode}
            onChange={set('phoneCode')}
            options={COUNTRY_CODES.map((c) => ({
              value: c.code,
              label: c.code,
            }))}
          />
        </div>
        <div className="flex-1">
          <Input
            label="Phone (WhatsApp)"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value.replace(/[^\d\s-]/g, ''),
              })
            }
            placeholder="98765 43210"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="sales@vendor.com"
        />
        <Input
          label="GST number"
          value={form.gst}
          onChange={(e) =>
            setForm({ ...form, gst: e.target.value.toUpperCase() })
          }
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
        />
      </div>
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
          label="Rating (review)"
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
        {submitLabel}
      </Button>
    </form>
  )
}

/**
 * Side-by-side vendor comparison — pick up to 4 vendors and compare their
 * profile plus real order history computed from purchase orders.
 */
function VendorCompareModal({ open, onClose, vendors, purchaseOrders }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (open) setSelected(vendors.slice(0, 3).map((v) => v._id))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const map = {}
    for (const po of purchaseOrders) {
      const vid = po.vendor?._id || po.vendor
      if (!vid) continue
      const s = (map[vid] ||= { orders: 0, total: 0, delivered: 0, last: null })
      s.orders += 1
      s.total += Number(po.value) || 0
      if (po.status === 'delivered') s.delivered += 1
      const d = po.createdAt ? new Date(po.createdAt) : null
      if (d && (!s.last || d > s.last)) s.last = d
    }
    return map
  }, [purchaseOrders])

  const chosen = vendors.filter((v) => selected.includes(v._id))
  const bestRating = Math.max(0, ...chosen.map((v) => Number(v.rating) || 0))
  const bestTotal = Math.max(0, ...chosen.map((v) => stats[v._id]?.total || 0))

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) {
        toast('Compare up to 4 vendors at a time', { type: 'info' })
        return prev
      }
      return [...prev, id]
    })
  }

  const rowLabel =
    'sticky left-0 z-[1] bg-white py-2.5 pr-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a98ac]'
  const cell = 'min-w-[160px] py-2.5 pr-4 align-top text-[13px] text-[#334155]'

  return (
    <Modal open={open} onClose={onClose} title="Compare vendors" size="xl">
      <p className="text-[12px] text-secondary">
        Pick up to 4 vendors to see them side by side. Order history is
        calculated from your purchase orders.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {vendors.map((v) => {
          const on = selected.includes(v._id)
          return (
            <button
              key={v._id}
              type="button"
              onClick={() => toggle(v._id)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold transition',
                on
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]',
              )}
            >
              {v.name}
            </button>
          )
        })}
      </div>

      {chosen.length < 2 ? (
        <p className="py-10 text-center text-sm text-secondary">
          Select at least two vendors to compare.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#e8eef4]">
          <table className="w-full border-separate border-spacing-0 px-1 text-left">
            <thead>
              <tr>
                <th className={cn(rowLabel, 'pl-3')} />
                {chosen.map((v) => {
                  const topRated =
                    Number(v.rating) === bestRating && chosen.length > 1
                  const mostBusiness =
                    bestTotal > 0 && (stats[v._id]?.total || 0) === bestTotal
                  return (
                    <th
                      key={v._id}
                      className="min-w-[160px] border-b border-[#e8eef4] py-3 pr-4 align-top"
                    >
                      <p className="text-[14px] font-bold text-[#0f172a]">
                        {v.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {topRated && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                            Top rated
                          </span>
                        )}
                        {mostBusiness && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            Most business
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-[#f1f5f9] [&>tr:last-child>td]:border-0">
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Rating</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cell}>
                    <span className="flex items-center gap-1.5">
                      <Stars value={v.rating} />
                      <span className="text-[12px] font-semibold text-[#64748b]">
                        {v.rating}/5
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Contact person</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cell}>
                    {v.contact || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Phone</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cn(cell, 'tabular-nums')}>
                    {v.phone || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Email</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cn(cell, 'break-all')}>
                    {v.email || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>GST no</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cn(cell, 'tabular-nums')}>
                    {v.gst || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Supplies</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cell}>
                    {(v.categories || []).length ? (
                      <span className="flex flex-wrap gap-1">
                        {v.categories.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-medium text-[#475569]"
                          >
                            {c}
                          </span>
                        ))}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Payment terms</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cell}>
                    {v.paymentTerms || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Orders placed</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cn(cell, 'tabular-nums')}>
                    {stats[v._id]?.orders || 0}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Total business</td>
                {chosen.map((v) => {
                  const total = stats[v._id]?.total || 0
                  return (
                    <td
                      key={v._id}
                      className={cn(
                        cell,
                        'font-semibold tabular-nums',
                        bestTotal > 0 && total === bestTotal
                          ? 'text-emerald-700'
                          : 'text-[#0f172a]',
                      )}
                    >
                      {formatInr(total)}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Delivered orders</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cn(cell, 'tabular-nums')}>
                    {stats[v._id]?.delivered || 0}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')}>Last order</td>
                {chosen.map((v) => (
                  <td key={v._id} className={cell}>
                    {stats[v._id]?.last
                      ? format(stats[v._id].last, 'd MMM yyyy')
                      : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={cn(rowLabel, 'pl-3')} />
                {chosen.map((v) => (
                  <td key={v._id} className={cell}>
                    <button
                      type="button"
                      onClick={() => {
                        const url = whatsappLink(
                          v.phone,
                          `Hello ${v.contact || v.name},`,
                        )
                        if (!url) {
                          toast('No phone number saved for this vendor', {
                            type: 'error',
                          })
                          return
                        }
                        window.open(url, '_blank', 'noopener')
                      }}
                      className={cn(
                        'inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-semibold text-white shadow-sm transition',
                        v.phone
                          ? 'bg-[#25D366] hover:bg-[#1fb958]'
                          : 'bg-[#a7dcbb] hover:bg-[#98d2ad]',
                      )}
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
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
