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
                        {PIPELINE.filter((s) => s !== stage)
                          .slice(0, 3)
                          .map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="text-[10px] text-secondary hover:text-accent"
                              onClick={(e) => {
                                e.stopPropagation()
                                patch.mutate({
                                  id: lead._id,
                                  body: { stage: s },
                                })
                              }}
                            >
                              → {stageLabel(s).split(' ')[0]}
                            </button>
                          ))}
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
            {selected.stage !== 'won' && selected.stage !== 'lost' && (
              <Button
                className="w-full"
                loading={convert.isPending}
                onClick={() => convert.mutate(selected._id)}
              >
                Convert to project
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
