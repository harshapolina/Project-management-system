import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Camera,
  CheckSquare,
  Receipt,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { api, getTenantSlug, useAuthStore } from '../lib/api'
import { formatInr, stageLabel } from '../lib/format'
import { useUiStore } from '../store/uiStore'
import { InviteDetailsModal } from '../components/layout/GlobalChrome'
import {
  Avatar,
  Button,
  Card,
  Input,
  KpiCard,
  Select,
  StatusChip,
  toast,
} from '../components/ui'

export function ReportsPage() {
  const { data } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api('/reports/overview'),
  })
  const [query, setQuery] = useState('')
  const d = data?.data

  const answer = useMemo(() => {
    if (!query.trim() || !d) return null
    const q = query.toLowerCase()
    if (q.includes('risk') || q.includes('delay')) {
      return `${d.health.delayed} project(s) are delayed. On-time rate is ${d.health.onTimePct}%.`
    }
    if (q.includes('pipeline') || q.includes('crm')) {
      return `Open CRM pipeline value is ${formatInr(d.crmPipelineValue)}.`
    }
    if (q.includes('budget') || q.includes('variance')) {
      return `Portfolio budget variance (quoted − spent) is ${formatInr(d.budgetVariance)}.`
    }
    if (q.includes('team')) {
      const top = [...(d.teamPerf || [])].sort((a, b) => b.done - a.done)[0]
      return top
        ? `${top.user.name} leads completions with ${top.done} done / ${top.open} open.`
        : 'No team data.'
    }
    return 'Try: “which projects are at risk”, “pipeline value”, “budget variance”, or “team performance”.'
  }, [query, d])

  const stageChart = (d?.leadStages || []).map((s) => ({
    name: stageLabel(s.stage).split(' ')[0],
    count: s.count,
  }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-secondary mb-1">Insights</p>
        <h1 className="text-[32px] font-semibold tracking-tight leading-none">
          Reports & Analytics
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="On-time %" value={`${d?.health?.onTimePct ?? 0}%`} accentValue />
        <KpiCard label="Delayed projects" value={d?.health?.delayed ?? 0} />
        <KpiCard
          label="CRM pipeline"
          value={formatInr(d?.crmPipelineValue)}
        />
        <KpiCard
          label="Budget variance"
          value={formatInr(d?.budgetVariance)}
        />
      </div>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold">AI copilot (rules engine)</h3>
        <div className="flex gap-2">
          <Input
            placeholder='Ask e.g. "which projects are at risk this month"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={() => setQuery(query)}>Ask</Button>
        </div>
        {answer && (
          <p className="rounded-[14px] border border-border bg-surface-raised px-4 py-3 text-sm text-secondary">
            {answer}
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold mb-4">CRM pipeline stages</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChart}>
                <CartesianGrid stroke="#2A2A2E" vertical={false} />
                <XAxis dataKey="name" stroke="#9A9A9E" fontSize={11} />
                <YAxis stroke="#9A9A9E" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1A1A1D',
                    border: '1px solid #2A2A2E',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" fill="#C6FF3D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-3">Team performance</h3>
          <div className="space-y-3">
            {(d?.teamPerf || []).map((t) => (
              <div key={t.user._id} className="flex items-center gap-3">
                <Avatar src={t.user.avatar} name={t.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.user.name}</p>
                  <p className="text-xs text-secondary">
                    {t.done} done · {t.open} open
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[12px] border border-border px-3 py-2 text-xs text-secondary">
            Vendor POs: {d?.vendorPerformance?.delivered ?? 0} delivered /{' '}
            {d?.vendorPerformance?.totalPOs ?? 0} total
          </div>
        </Card>
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api('/notifications'),
  })

  const readAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: (id) =>
      api(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-secondary mb-1">Inbox</p>
          <h1 className="text-[32px] font-semibold tracking-tight leading-none">
            Inbox
          </h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => readAll.mutate()}>
          Mark all read
        </Button>
      </div>

      <Card padding={false}>
        <div className="divide-y divide-border">
          {(data?.notifications || []).map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => !n.read && markRead.mutate(n._id)}
              className="flex w-full gap-3 px-5 py-4 text-left hover:bg-surface-raised transition-colors"
            >
              <span
                className={`mt-1.5 h-2 w-2 rounded-full ${n.read ? 'bg-border' : 'bg-accent'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-secondary mt-0.5">{n.body}</p>
                <p className="text-[11px] text-secondary mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {n.link && (
                <Link
                  to={n.link}
                  className="text-xs text-accent self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                </Link>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const setUser = useAuthStore((s) => s.setUser)
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const [name, setName] = useStateSafe(user?.name || '')
  const [title, setTitle] = useStateSafe(user?.title || '')
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: 'project_manager',
  })
  const [inviteResult, setInviteResult] = useState(null)
  const [pwd, setPwd] = useState({ current: '', next: '' })
  const canInvite =
    user?.isPlatformAdmin ||
    ['admin', 'owner', 'project_manager'].includes(user?.role)

  const save = async () => {
    try {
      const data = await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, title }),
      })
      setUser(data.user)
      toast('Profile saved', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const sendInvite = async () => {
    try {
      const data = await api('/auth/invite', {
        method: 'POST',
        body: JSON.stringify(invite),
      })
      setInviteResult({
        workspace: tenant?.slug || getTenantSlug(),
        email: data.user.email,
        tempPassword: data.tempPassword,
        loginUrl: window.location.origin + '/login',
      })
      setInvite({ name: '', email: '', role: 'project_manager' })
      toast('Invite created', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const changePassword = async () => {
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pwd.current || undefined,
          password: pwd.next,
        }),
      })
      setUser({ ...user, mustChangePassword: false })
      setPwd({ current: '', next: '' })
      toast('Password updated', { type: 'success' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-sm text-secondary mb-1">Account</p>
        <h1 className="text-[32px] font-semibold tracking-tight leading-none">
          Settings
        </h1>
        {(tenant?.slug || user?.tenantId) && (
          <p className="mt-2 text-xs text-secondary">
            Workspace: <code>{tenant?.slug || '—'}</code>
            {tenant?.seatLimit != null && ` · ${tenant.seatLimit} seats`}
          </p>
        )}
      </div>

      {user?.mustChangePassword && (
        <Card className="border border-status-delayed/40 space-y-3">
          <p className="font-semibold text-sm">Set a new password</p>
          <Input
            label="Current / temp password"
            type="password"
            value={pwd.current}
            onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            value={pwd.next}
            onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))}
          />
          <Button onClick={changePassword} disabled={pwd.next.length < 6}>
            Update password
          </Button>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar} name={user?.name} size="lg" />
          <div>
            <p className="font-semibold">{user?.email}</p>
            <p className="text-xs text-secondary capitalize">
              {(user?.role || '').replace(/_/g, ' ')}
              {user?.isPlatformAdmin ? ' · platform admin' : ''}
            </p>
          </div>
        </div>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={save}>Save changes</Button>
      </Card>

      {canInvite && (
        <Card className="space-y-3">
          <div>
            <p className="font-semibold">Invite teammate</p>
            <p className="text-xs text-secondary mt-0.5">
              Creates a user in this workspace (counts toward seat limit). Details
              open in a popup to copy and share.
            </p>
          </div>
          <Input
            label="Name"
            value={invite.name}
            onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={invite.email}
            onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
          />
          <Select
            label="Role"
            value={invite.role}
            onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'project_manager', label: 'Project manager' },
              { value: 'designer', label: 'Designer' },
              { value: 'site_supervisor', label: 'Site supervisor' },
              { value: 'client', label: 'Client' },
              { value: 'vendor', label: 'Vendor' },
            ]}
          />
          <Button
            onClick={sendInvite}
            disabled={!invite.name || !invite.email}
          >
            Create invite
          </Button>
        </Card>
      )}

      <InviteDetailsModal
        open={!!inviteResult}
        details={inviteResult}
        onClose={() => setInviteResult(null)}
      />

      <Card className="space-y-3">
        <div>
          <p className="font-semibold">Appearance</p>
          <p className="text-xs text-secondary mt-0.5">
            Switch between light and dark mode
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-[12px] font-medium transition-colors ${
                theme === id
                  ? 'border-[#7B68EE] bg-[#7B68EE]/15 text-primary'
                  : 'border-border text-secondary hover:bg-surface-raised hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function useStateSafe(initial) {
  return useState(initial)
}

export function MobileSupervisorPage() {
  const user = useAuthStore((s) => s.user)
  const { data: home } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
  })
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api('/projects'),
  })
  const [screen, setScreen] = useState('home')
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [snagTitle, setSnagTitle] = useState('')
  const qc = useQueryClient()

  const firstProject = projects?.projects?.[0]?._id

  const postUpdate = async () => {
    try {
      await api('/site-updates', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || firstProject,
          note,
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
            },
          ],
        }),
      })
      toast('Site update posted', { type: 'success' })
      setNote('')
      setScreen('home')
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const logExpense = async () => {
    try {
      await api('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || firstProject,
          amount: Number(amount),
          category: 'Materials',
          note: 'Logged from mobile',
          receiptUrl:
            'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
        }),
      })
      toast('Expense submitted', { type: 'success' })
      setAmount('')
      setScreen('home')
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const addSnag = async () => {
    try {
      await api('/snags', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || firstProject,
          title: snagTitle,
          status: 'open',
          assignee: user?.id,
        }),
      })
      toast('Snag logged', { type: 'success' })
      setSnagTitle('')
      setScreen('home')
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const toggleTask = async (id) => {
    await api(`/tasks/${id}/toggle`, { method: 'PATCH' })
    qc.invalidateQueries({ queryKey: ['home'] })
  }

  if (screen === 'home') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <p className="text-sm text-secondary">Site mode</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hey {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'update', label: 'Post site update', icon: Camera },
            { key: 'tasks', label: 'My tasks', icon: CheckSquare },
            { key: 'expense', label: 'Log expense', icon: Receipt },
            { key: 'snags', label: 'Snags', icon: AlertTriangle },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setScreen(t.key)}
              className="flex min-h-[120px] flex-col items-start justify-between rounded-[18px] border border-border bg-surface p-4 text-left hover:border-accent/40 transition-colors"
            >
              <t.icon className="h-6 w-6 text-accent" />
              <span className="text-sm font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Button variant="ghost" onClick={() => setScreen('home')}>
        ← Back
      </Button>

      {screen === 'update' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Post site update</h2>
          <Select
            label="Project"
            value={projectId || firstProject || ''}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects?.projects || []).map((p) => ({
              value: p._id,
              label: p.name,
            }))}
          />
          <div className="flex h-40 items-center justify-center rounded-[16px] border border-dashed border-border bg-surface-raised text-secondary text-sm">
            Camera capture (URL stub for web)
          </div>
          <Input
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button className="w-full" onClick={postUpdate}>
            Publish
          </Button>
        </Card>
      )}

      {screen === 'tasks' && (
        <Card padding={false}>
          {(home?.data?.tasks?.today || [])
            .concat(home?.data?.tasks?.overdue || [])
            .map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => toggleTask(t._id)}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left last:border-0"
              >
                <StatusChip status={t.status} />
                <span className="text-sm flex-1">{t.title}</span>
              </button>
            ))}
        </Card>
      )}

      {screen === 'expense' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Log expense</h2>
          <Select
            label="Project"
            value={projectId || firstProject || ''}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects?.projects || []).map((p) => ({
              value: p._id,
              label: p.name,
            }))}
          />
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button className="w-full" onClick={logExpense}>
            Submit for approval
          </Button>
        </Card>
      )}

      {screen === 'snags' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Log snag</h2>
          <Select
            label="Project"
            value={projectId || firstProject || ''}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects?.projects || []).map((p) => ({
              value: p._id,
              label: p.name,
            }))}
          />
          <Input
            label="Issue"
            value={snagTitle}
            onChange={(e) => setSnagTitle(e.target.value)}
          />
          <Button className="w-full" onClick={addSnag}>
            Save snag
          </Button>
        </Card>
      )}
    </div>
  )
}
