import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatInr, stageLabel, COVER_FALLBACK } from '../lib/format'
import { COUNTRY_CODES, buildPhone } from '../lib/phone'
import {
  Button,
  Card,
  Input,
  Modal,
  ProgressRing,
  Select,
  SkeletonCard,
  StatusChip,
  toast,
} from '../components/ui'

export function ProjectsPage() {
  const [view, setView] = useState('grid')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['projects', q, status],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      return api(`/projects?${params}`)
    },
  })

  const create = useMutation({
    mutationFn: (body) =>
      api('/projects', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast('Project created', { type: 'success' })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects-nav'] })
      setOpen(false)
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (projectId) =>
      api(`/projects/${projectId}`, { method: 'DELETE' }),
    onMutate: async (projectId) => {
      await qc.cancelQueries({ queryKey: ['projects'] })
      await qc.cancelQueries({ queryKey: ['projects-nav'] })

      const snapLists = qc.getQueriesData({ queryKey: ['projects'] })
      const snapNav = qc.getQueryData(['projects-nav'])

      const filterOut = (old) => {
        if (!old?.projects) return old
        return {
          ...old,
          projects: old.projects.filter(
            (p) => String(p._id) !== String(projectId),
          ),
        }
      }

      qc.setQueriesData({ queryKey: ['projects'] }, filterOut)
      qc.setQueryData(['projects-nav'], filterOut)
      qc.removeQueries({ queryKey: ['project', projectId] })

      return { snapLists, snapNav }
    },
    onSuccess: () => {
      toast('Project deleted', { type: 'success' })
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects-nav'] })
      qc.invalidateQueries({ queryKey: ['home'] })
    },
    onError: (e, projectId, ctx) => {
      if (ctx?.snapLists) {
        for (const [key, data] of ctx.snapLists) qc.setQueryData(key, data)
      }
      if (ctx?.snapNav !== undefined) {
        qc.setQueryData(['projects-nav'], ctx.snapNav)
      }
      if (e.status === 404) {
        toast('Project was already deleted', { type: 'success' })
        setDeleteTarget(null)
        qc.invalidateQueries({ queryKey: ['projects'] })
        qc.invalidateQueries({ queryKey: ['projects-nav'] })
        return
      }
      toast(e.message, { type: 'error' })
    },
  })

  const projects = data?.projects || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-secondary mb-1">All studio work</p>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none text-primary md:text-[32px]">
            Projects
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Open a project for overview, tasks, quotation, materials, site, and team.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search projects…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'delayed', label: 'Delayed' },
              { value: 'on_hold', label: 'On hold' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </div>
        <div className="ml-auto inline-flex rounded-full border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`rounded-full p-2 ${view === 'grid' ? 'bg-accent text-[#0E0E10]' : 'text-secondary'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-full p-2 ${view === 'list' ? 'bg-accent text-[#0E0E10]' : 'text-secondary'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p._id}
              padding={false}
              hover
              className="overflow-hidden h-full relative group"
            >
              <Link to={`/projects/${p._id}`} className="block">
                <div
                  className="h-40 bg-cover bg-center relative"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(14,14,16,.9), transparent 55%), url(${p.coverImage || COVER_FALLBACK})`,
                  }}
                >
                  <div className="absolute top-3 left-3">
                    <StatusChip status={p.type} label={p.type} />
                  </div>
                  <div className="on-dark absolute bottom-3 right-3">
                    <ProgressRing
                      value={p.progress}
                      size={48}
                      trackColor="rgba(255,255,255,0.35)"
                      color="#ffffff"
                    />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-secondary">{p.clientName}</p>
                    </div>
                    <StatusChip status={p.status} />
                  </div>
                  <p className="text-xs text-secondary">
                    {p.location || '—'} · {stageLabel(p.currentStage)}
                  </p>
                  <p className="text-sm tabular-nums text-accent">
                    {formatInr(p.budget)}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                title="Delete project"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDeleteTarget(p)
                }}
                className="on-dark absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Budget</th>
                <th className="px-4 py-3 text-right font-medium">Progress</th>
                <th className="px-4 py-3 text-right font-medium w-12" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-border last:border-0 hover:bg-surface-raised"
                >
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p._id}`} className="font-medium hover:text-accent">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-secondary">{p.clientName}</td>
                  <td className="px-4 py-3 capitalize">{stageLabel(p.currentStage)}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatInr(p.budget)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.progress}%</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      title="Delete project"
                      onClick={() => setDeleteTarget(p)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <NewProjectModal
        open={open}
        onClose={() => setOpen(false)}
        loading={create.isPending}
        onSubmit={(values) => create.mutate(values)}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => !remove.isPending && setDeleteTarget(null)}
        title="Delete project?"
        size="sm"
      >
        <p className="text-sm text-secondary">
          Delete{' '}
          <span className="font-medium text-white">{deleteTarget?.name}</span>?
          This removes the project and its tasks. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={remove.isPending}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => deleteTarget && remove.mutate(deleteTarget._id)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function NewProjectModal({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: '',
    clientName: '',
    phoneCode: '+91',
    phone: '',
    type: 'residential',
    location: '',
    budget: '',
  })

  return (
    <Modal open={open} onClose={onClose} title="New project" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const { phoneCode, phone, ...rest } = form
          onSubmit({
            ...rest,
            clientPhone: buildPhone(phoneCode, phone),
            budget: Number(form.budget) || 0,
          })
        }}
      >
        <Input
          label="Project name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Client"
          value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          required
        />
        <div className="flex gap-2">
          <div className="w-[110px] shrink-0">
            <Select
              label="Code"
              value={form.phoneCode}
              onChange={(e) => setForm({ ...form, phoneCode: e.target.value })}
              options={COUNTRY_CODES.map((c) => ({
                value: c.code,
                label: c.code,
              }))}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Client phone (WhatsApp)"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value.replace(/[^\d\s-]/g, ''),
                })
              }
            />
          </div>
        </div>
        <Select
          label="Template"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={[
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'blank', label: 'Blank' },
          ]}
        />
        <Input
          label="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <Input
          label="Budget (INR)"
          type="number"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
        />
        <p className="text-xs text-secondary">
          Creates 5 stages (Design → Handover) and template tasks automatically.
        </p>
        <Button type="submit" className="w-full" loading={loading}>
          Create project
        </Button>
      </form>
    </Modal>
  )
}
