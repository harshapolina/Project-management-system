import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useOutletContext } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../lib/api'
import { formatInr } from '../../lib/format'
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Modal,
  ProgressBar,
  Select,
  StatusChip,
  toast,
} from '../../components/ui'

export function ProjectProcurement() {
  const { id } = useParams()
  const { data } = useQuery({
    queryKey: ['pos', id],
    queryFn: () => api(`/purchase-orders?projectId=${id}`),
  })
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api('/vendors'),
  })
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const create = useMutation({
    mutationFn: (body) =>
      api('/purchase-orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos', id] })
      setOpen(false)
      toast('PO created', { type: 'success' })
    },
  })

  const patch = useMutation({
    mutationFn: ({ poId, status }) =>
      api(`/purchase-orders/${poId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', id] }),
  })

  const pos = data?.purchaseOrders || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Purchase orders</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          Raise PO
        </Button>
      </div>
      <DataTable
        columns={[
          { key: 'poNumber', label: 'PO #' },
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
            render: (v, row) => (
              <button
                type="button"
                onClick={() => {
                  const flow = [
                    'draft',
                    'approved',
                    'ordered',
                    'in_transit',
                    'delivered',
                  ]
                  const next = flow[Math.min(flow.indexOf(v) + 1, flow.length - 1)]
                  patch.mutate({ poId: row._id, status: next })
                }}
              >
                <StatusChip status={v} />
              </button>
            ),
          },
        ]}
        data={pos}
        emptyMessage="No purchase orders yet — raise one to track deliveries."
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Raise purchase order">
        <PoForm
          vendors={vendorsData?.vendors || []}
          onSubmit={(values) =>
            create.mutate({
              ...values,
              projectId: id,
              value: Number(values.value) || 0,
            })
          }
          loading={create.isPending}
        />
      </Modal>
    </div>
  )
}

function PoForm({ vendors, onSubmit, loading }) {
  const [form, setForm] = useState({
    vendor: vendors[0]?._id || '',
    value: '',
    itemsDesc: '',
  })
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          vendor: form.vendor,
          value: form.value,
          items: [
            {
              description: form.itemsDesc || 'Materials',
              qty: 1,
              rate: Number(form.value) || 0,
              amount: Number(form.value) || 0,
            },
          ],
          status: 'draft',
        })
      }}
    >
      <Select
        label="Vendor"
        value={form.vendor}
        onChange={(e) => setForm({ ...form, vendor: e.target.value })}
        options={vendors.map((v) => ({ value: v._id, label: v.name }))}
      />
      <Input
        label="Description"
        value={form.itemsDesc}
        onChange={(e) => setForm({ ...form, itemsDesc: e.target.value })}
      />
      <Input
        label="Value"
        type="number"
        value={form.value}
        onChange={(e) => setForm({ ...form, value: e.target.value })}
      />
      <Button type="submit" className="w-full" loading={loading}>
        Create PO
      </Button>
    </form>
  )
}

export function ProjectSite() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['site', id],
    queryFn: () => api(`/site-updates?projectId=${id}`),
  })
  const { data: snagsData } = useQuery({
    queryKey: ['snags', id],
    queryFn: () => api(`/snags?projectId=${id}`),
  })
  const [note, setNote] = useState('')

  const post = useMutation({
    mutationFn: (body) =>
      api('/site-updates', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site', id] })
      setNote('')
      toast('Site update posted', { type: 'success' })
    },
  })

  const patchSnag = useMutation({
    mutationFn: ({ snagId, body }) =>
      api(`/snags/${snagId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snags', id] }),
  })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold">Post site update</h3>
          <Input
            placeholder="What happened on site today?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            disabled={!note.trim()}
            loading={post.isPending}
            onClick={() =>
              post.mutate({
                projectId: id,
                note,
                photos: [
                  {
                    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
                  },
                ],
                progress: 50,
              })
            }
          >
            Publish
          </Button>
        </Card>

        {(data?.updates || []).map((u) => (
          <Card key={u._id} padding={false} className="overflow-hidden">
            {u.photos?.[0]?.url && (
              <img
                src={u.photos[0].url}
                alt=""
                className="h-48 w-full object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={u.author?.avatar} name={u.author?.name} size="sm" />
                <div>
                  <p className="text-sm font-medium">{u.author?.name}</p>
                  <p className="text-[11px] text-secondary">
                    {formatDistanceToNow(new Date(u.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-secondary">{u.note}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card padding={false}>
        <div className="border-b border-border px-4 py-3 font-semibold text-sm">
          Snag list
        </div>
        <div className="divide-y divide-border">
          {(snagsData?.snags || []).length === 0 && (
            <p className="px-4 py-6 text-sm text-secondary text-center">
              No snags logged.
            </p>
          )}
          {(snagsData?.snags || []).map((s) => (
            <div key={s._id} className="px-4 py-3 space-y-2">
              <p className="text-sm font-medium">{s.title}</p>
              <div className="flex items-center justify-between gap-2">
                <StatusChip status={s.status} />
                <button
                  type="button"
                  className="text-[11px] text-accent"
                  onClick={() =>
                    patchSnag.mutate({
                      snagId: s._id,
                      body: {
                        status:
                          s.status === 'open'
                            ? 'fixed'
                            : s.status === 'fixed'
                              ? 'verified'
                              : 'open',
                      },
                    })
                  }
                >
                  Advance
                </button>
              </div>
              {s.status === 'open' && (
                <button
                  type="button"
                  className="text-[11px] text-secondary hover:text-accent"
                  onClick={() =>
                    patchSnag.mutate({
                      snagId: s._id,
                      body: { convertToTask: true },
                    })
                  }
                >
                  Convert to task
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function ProjectTeam() {
  const { project } = useOutletContext()
  const members = project?.members || []

  return (
    <Card padding={false}>
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <h3 className="font-semibold">Team</h3>
        <AvatarStack
          users={members.map((m) => m.user).filter(Boolean)}
          max={6}
        />
      </div>
      <div className="divide-y divide-border">
        {members.map((m) => (
          <div
            key={m.user?._id || m._id}
            className="flex items-center gap-3 px-5 py-4"
          >
            <Avatar src={m.user?.avatar} name={m.user?.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.user?.name}</p>
              <p className="text-xs text-secondary">{m.user?.email}</p>
            </div>
            <StatusChip status="in_progress" label={(m.role || m.user?.role || '').replace(/_/g, ' ')} />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ProjectActivity() {
  const { id } = useParams()
  const { data } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => api(`/activity?projectId=${id}`),
  })

  return (
    <Card padding={false}>
      <div className="divide-y divide-border">
        {(data?.activity || []).map((a) => (
          <div key={a._id} className="flex gap-3 px-5 py-4">
            <Avatar src={a.actor?.avatar} name={a.actor?.name} size="sm" />
            <div>
              <p className="text-sm">{a.message}</p>
              <p className="text-[11px] text-secondary mt-0.5">
                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        {(data?.activity || []).length === 0 && (
          <EmptyState title="Quiet so far" description="Project activity will stream here." />
        )}
      </div>
    </Card>
  )
}

export function ProjectClientPortal() {
  const { project, stats } = useOutletContext()
  const { id } = useParams()
  const { data: filesData } = useQuery({
    queryKey: ['client-files', id],
    queryFn: () => api(`/files?projectId=${id}&clientVisible=true`),
  })
  const { data: siteData } = useQuery({
    queryKey: ['site', id],
    queryFn: () => api(`/site-updates?projectId=${id}`),
  })

  return (
    <div className="space-y-4">
      <Card variant="light" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Client portal preview</p>
            <h2 className="text-2xl font-semibold text-on-light">{project.name}</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Progress for {project.clientName} — internal costs hidden.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums text-on-light">
              {project.progress}%
            </p>
            <p className="text-xs text-zinc-500">Complete</p>
          </div>
        </div>
        <ProgressBar value={project.progress} color="#16161A" trackClassName="bg-zinc-200" />
        <div className="flex flex-wrap gap-2">
          {(project.stages || []).map((s) => (
            <StatusChip key={s.key} status={s.status} label={s.label} />
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Shared documents</h3>
          <div className="space-y-2">
            {(filesData?.files || []).length === 0 && (
              <p className="text-sm text-secondary">No client-visible files yet.</p>
            )}
            {(filesData?.files || []).map((f) => (
              <div
                key={f._id}
                className="flex items-center justify-between rounded-[12px] border border-border px-3 py-2"
              >
                <span className="text-sm truncate">{f.name}</span>
                <StatusChip status={f.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold mb-3">Latest site photos</h3>
          <div className="grid grid-cols-2 gap-2">
            {(siteData?.updates || [])
              .flatMap((u) => u.photos || [])
              .slice(0, 4)
              .map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  alt=""
                  className="h-24 w-full rounded-[12px] object-cover"
                />
              ))}
          </div>
          <p className="mt-3 text-xs text-secondary">
            Pending approvals: {stats?.pendingApprovals ?? 0}
          </p>
        </Card>
      </div>
    </div>
  )
}
