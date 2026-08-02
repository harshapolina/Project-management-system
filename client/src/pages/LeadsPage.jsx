import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatInr, stageLabel } from '../lib/format'
import {
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  StatusChip,
  toast,
} from '../components/ui'

const PIPELINE = [
  'new_enquiry',
  'site_visit',
  'quotation_sent',
  'negotiation',
  'won',
  'lost',
]

export function LeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api('/leads'),
  })
  const [selected, setSelected] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const patch = useMutation({
    mutationFn: ({ id, body }) =>
      api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const create = useMutation({
    mutationFn: (body) =>
      api('/leads', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      setCreateOpen(false)
      toast('Lead added', { type: 'success' })
    },
  })

  const convert = useMutation({
    mutationFn: (id) => api(`/leads/${id}/convert`, { method: 'POST' }),
    onSuccess: (res) => {
      toast('Converted to project', { type: 'success' })
      navigate(`/projects/${res.project._id}`)
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const leads = data?.leads || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-secondary mb-1">CRM pipeline</p>
          <h1 className="text-[32px] font-semibold tracking-tight leading-none">
            Leads
          </h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New enquiry</Button>
      </div>

      {isLoading ? (
        <Card className="h-64 animate-pulse" />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE.map((stage) => (
            <div
              key={stage}
              className="w-[260px] shrink-0 rounded-[18px] border border-border bg-surface"
            >
              <div className="border-b border-border px-3 py-2.5 text-xs font-semibold text-secondary">
                {stageLabel(stage)}
                <span className="ml-2 text-primary">
                  {leads.filter((l) => l.stage === stage).length}
                </span>
              </div>
              <div className="space-y-2 p-2 min-h-[320px]">
                {leads
                  .filter((l) => l.stage === stage)
                  .map((lead) => (
                    <button
                      key={lead._id}
                      type="button"
                      onClick={() => setSelected(lead)}
                      className="w-full rounded-[14px] border border-border bg-surface-raised p-3 text-left hover:border-accent/30 transition-colors"
                    >
                      <p className="text-sm font-semibold">{lead.clientName}</p>
                      <p className="text-xs text-secondary mt-0.5">
                        {lead.contactName || lead.source}
                      </p>
                      <p className="mt-2 text-sm tabular-nums text-accent">
                        {formatInr(lead.estimatedValue)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(() => {
                          const idx = PIPELINE.indexOf(stage)
                          const next =
                            idx >= 0 && idx < PIPELINE.length - 2
                              ? PIPELINE[idx + 1]
                              : null
                          const actions = []
                          if (next && next !== 'lost') {
                            actions.push({ key: next, label: `Next · ${stageLabel(next)}`, tone: 'next' })
                          }
                          if (stage !== 'won' && stage !== 'lost') {
                            actions.push({ key: 'won', label: 'Won', tone: 'won' })
                            actions.push({ key: 'lost', label: 'Lost', tone: 'lost' })
                          }
                          return actions.map((a) => (
                            <button
                              key={a.key}
                              type="button"
                              className={
                                a.tone === 'won'
                                  ? 'rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100'
                                  : a.tone === 'lost'
                                    ? 'rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100'
                                    : 'rounded-md bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#2563eb] hover:bg-[#dbeafe]'
                              }
                              onClick={(e) => {
                                e.stopPropagation()
                                patch.mutate({
                                  id: lead._id,
                                  body: { stage: a.key },
                                })
                              }}
                            >
                              {a.tone === 'next' ? `→ ${stageLabel(a.key).split(' ')[0]}` : a.label}
                            </button>
                          ))
                        })()}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.clientName || 'Lead'}
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">{selected.notes || 'No notes yet.'}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-secondary">Contact</p>
                <p>{selected.contactName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Source</p>
                <p>{selected.source}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Value</p>
                <p className="tabular-nums text-accent">
                  {formatInr(selected.estimatedValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary">Stage</p>
                <StatusChip status={selected.stage} label={stageLabel(selected.stage)} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-secondary">Move to stage</p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE.filter((s) => s !== selected.stage).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      s === 'won'
                        ? 'rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100'
                        : s === 'lost'
                          ? 'rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100'
                          : 'rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:border-accent/40'
                    }
                    onClick={() => {
                      patch.mutate(
                        { id: selected._id, body: { stage: s } },
                        {
                          onSuccess: () =>
                            setSelected((prev) =>
                              prev ? { ...prev, stage: s } : prev,
                            ),
                        },
                      )
                    }}
                  >
                    {stageLabel(s)}
                  </button>
                ))}
              </div>
            </div>
            {selected.stage !== 'won' && selected.stage !== 'lost' && (
              <Button
                className="w-full"
                loading={convert.isPending}
                onClick={() => convert.mutate(selected._id)}
              >
                Convert to project
              </Button>
            )}
            {selected.stage === 'won' && (
              <Button
                className="w-full"
                loading={convert.isPending}
                onClick={() => convert.mutate(selected._id)}
              >
                Convert won lead to project
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New enquiry">
        <LeadForm
          onSubmit={(v) => create.mutate(v)}
          loading={create.isPending}
        />
      </Modal>
    </div>
  )
}

function LeadForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    clientName: '',
    contactName: '',
    email: '',
    phone: '',
    source: 'Website',
    estimatedValue: '',
    notes: '',
  })
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...form,
          estimatedValue: Number(form.estimatedValue) || 0,
          stage: 'new_enquiry',
        })
      }}
    >
      <Input label="Client / company" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
      <Input label="Contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
      <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input label="Est. value" type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
      <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" className="w-full" loading={loading}>Create lead</Button>
    </form>
  )
}
