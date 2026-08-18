import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
  Save,
  ShieldOff,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { api } from '../../lib/api'
import { InviteDetailsModal } from '../layout/GlobalChrome'
import { Button, Input, Select, StatusChip, toast } from '../ui'
import { INVITE_ROLE_OPTIONS, ROLE_LABELS } from '../../lib/roles'
import {
  TENANT_FEATURE_KEYS,
  SUBSCRIPTION_PLANS,
  normalizeTenantFeatures,
} from '../../lib/tenantFeatures'
import { cn } from '../../lib/utils'

function companyLoginUrl(workspace, portal = 'admin') {
  const origin = window.location.origin
  return `${origin}/login?portal=${portal}&tenant=${encodeURIComponent(workspace)}`
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let out = ''
  for (let i = 0; i < 12; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function CompanyControlPanel({ tenant, expanded, onToggle }) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState({
    name: tenant.name,
    status: tenant.status,
    seatLimit: tenant.seatLimit,
    subscriptionPlan: tenant.subscriptionPlan || 'pro',
    notes: tenant.notes || '',
    features: normalizeTenantFeatures(tenant.features),
  })
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: 'admin',
    password: '',
  })
  const [details, setDetails] = useState(null)

  useEffect(() => {
    setDraft({
      name: tenant.name,
      status: tenant.status,
      seatLimit: tenant.seatLimit,
      subscriptionPlan: tenant.subscriptionPlan || 'pro',
      notes: tenant.notes || '',
      features: normalizeTenantFeatures(tenant.features),
    })
  }, [tenant])

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['platform-tenant-users', tenant._id],
    queryFn: () => api(`/platform/tenants/${tenant._id}/users`),
    enabled: expanded,
  })

  const users = usersData?.users || []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['platform-tenants'] })
    qc.invalidateQueries({ queryKey: ['platform-tenant-users', tenant._id] })
  }

  const saveTenant = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${tenant._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name.trim(),
          status: draft.status,
          seatLimit: Number(draft.seatLimit) || 30,
          subscriptionPlan: draft.subscriptionPlan,
          notes: draft.notes.trim(),
          features: draft.features,
        }),
      }),
    onSuccess: () => {
      toast('Company settings saved', { type: 'success' })
      invalidate()
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const cancelSubscription = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${tenant._id}/cancel-subscription`, { method: 'POST' }),
    onSuccess: () => {
      toast('Subscription cancelled — company blocked from signing in', { type: 'success' })
      invalidate()
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const reactivateSubscription = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${tenant._id}/reactivate-subscription`, { method: 'POST' }),
    onSuccess: () => {
      toast('Subscription reactivated', { type: 'success' })
      invalidate()
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const createUser = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${tenant._id}/users`, {
        method: 'POST',
        body: JSON.stringify({
          name: invite.name,
          email: invite.email,
          role: invite.role,
          ...(invite.password.trim() ? { password: invite.password.trim() } : {}),
        }),
      }),
    onSuccess: (res) => {
      toast('User credentials created', { type: 'success' })
      setDetails({
        companyName: tenant.name,
        workspace: tenant.slug,
        email: res.user.email,
        tempPassword: res.tempPassword,
        role: ROLE_LABELS[invite.role] || invite.role,
        loginUrl: companyLoginUrl(
          tenant.slug,
          ['admin', 'owner', 'hr'].includes(invite.role) ? 'admin' : 'staff',
        ),
        portal: ['admin', 'owner', 'hr'].includes(invite.role) ? 'admin' : 'staff',
      })
      setInvite({ name: '', email: '', role: 'admin', password: '' })
      invalidate()
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const patchUser = useMutation({
    mutationFn: ({ userId, body }) =>
      api(`/platform/tenants/${tenant._id}/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('User updated', { type: 'success' })
      invalidate()
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const resetPassword = useMutation({
    mutationFn: (userId) =>
      api(`/platform/tenants/${tenant._id}/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (res) => {
      setDetails({
        companyName: tenant.name,
        workspace: tenant.slug,
        email: res.user.email,
        tempPassword: res.tempPassword,
        role: ROLE_LABELS[res.user.role] || res.user.role,
        loginUrl: companyLoginUrl(
          tenant.slug,
          ['admin', 'owner', 'hr'].includes(res.user.role) ? 'admin' : 'staff',
        ),
        portal: ['admin', 'owner', 'hr'].includes(res.user.role) ? 'admin' : 'staff',
      })
      toast('New password generated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const copyLogin = async () => {
    const url = companyLoginUrl(tenant.slug)
    try {
      await navigator.clipboard.writeText(`Workspace: ${tenant.slug}\nLogin: ${url}`)
      toast('Login link copied', { type: 'success' })
    } catch {
      toast('Could not copy', { type: 'error' })
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce4ee] bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-[#f8fafc] sm:px-5"
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#64748b] transition-transform',
            expanded && 'rotate-180',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#0f172a]">{tenant.name}</p>
            <StatusChip status={tenant.status} />
            {tenant.status === 'suspended' && (
              <span className="text-[11px] font-medium text-[#ef4444]">Access blocked</span>
            )}
            {tenant.status === 'cancelled' && (
              <span className="text-[11px] font-medium text-[#ef4444]">Subscription cancelled</span>
            )}
            {tenant.subscriptionPlan && (
              <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2563eb]">
                {tenant.subscriptionPlan}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#64748b]">
            <span className="font-mono font-medium text-[#2563eb]">{tenant.slug}</span>
            {' · '}
            {tenant.seatsUsed ?? 0}/{tenant.seatLimit} active seats
            {' · '}
            {tenant.userCount ?? users.length} users
            {' · '}
            {tenant.projectCount ?? 0} projects
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              copyLogin()
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[#dce4ee] px-2.5 py-1.5 text-[11px] font-medium text-[#475569] hover:border-[#2563eb]/30 hover:bg-[#eff6ff] hover:text-[#2563eb]"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy login
          </button>
          <a
            href={companyLoginUrl(tenant.slug)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg border border-[#dce4ee] px-2.5 py-1.5 text-[11px] font-medium text-[#475569] hover:border-[#2563eb]/30 hover:bg-[#eff6ff] hover:text-[#2563eb]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open login
          </a>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#dce4ee] bg-[#f8fafc] px-4 py-5 sm:px-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3 rounded-xl border border-[#dce4ee] bg-white p-4">
              <p className="text-sm font-semibold text-[#0f172a]">Company settings</p>
              <Input
                label="Company name"
                light
                value={draft.name}
                onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Status"
                  light
                  value={draft.status}
                  onChange={(e) => setDraft((s) => ({ ...s, status: e.target.value }))}
                  options={STATUS_OPTIONS}
                />
                <Select
                  label="Subscription plan"
                  light
                  value={draft.subscriptionPlan}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, subscriptionPlan: e.target.value }))
                  }
                  options={SUBSCRIPTION_PLANS}
                />
                <Input
                  label="Seat limit"
                  type="number"
                  light
                  className="sm:col-span-2"
                  value={draft.seatLimit}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, seatLimit: e.target.value }))
                  }
                />
              </div>
              <Input
                label="Internal notes"
                light
                placeholder="Billing contact, plan, etc."
                value={draft.notes}
                onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => saveTenant.mutate()}
                  loading={saveTenant.isPending}
                  disabled={!draft.name.trim()}
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save settings
                </Button>
                {tenant.status === 'cancelled' || tenant.cancelledAt ? (
                  <Button
                    variant="secondary"
                    loading={reactivateSubscription.isPending}
                    onClick={() => reactivateSubscription.mutate()}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    Reactivate subscription
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    loading={cancelSubscription.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Cancel subscription for ${tenant.name}? They will be blocked from signing in.`,
                        )
                      ) {
                        cancelSubscription.mutate()
                      }
                    }}
                  >
                    <ShieldOff className="mr-1 h-4 w-4" />
                    Cancel subscription
                  </Button>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-[#dce4ee] bg-white p-4">
              <p className="text-sm font-semibold text-[#0f172a]">Add user</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Name"
                  light
                  value={invite.name}
                  onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  light
                  value={invite.email}
                  onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                />
                <Select
                  label="Role"
                  light
                  value={invite.role}
                  onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}
                  options={INVITE_ROLE_OPTIONS}
                />
                <Input
                  label="Password"
                  light
                  placeholder="Auto-generate if blank"
                  value={invite.password}
                  onChange={(e) =>
                    setInvite((s) => ({ ...s, password: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setInvite((s) => ({ ...s, password: generatePassword() }))
                  }
                >
                  <KeyRound className="mr-1 h-4 w-4" />
                  Generate password
                </Button>
                <Button
                  onClick={() => createUser.mutate()}
                  loading={createUser.isPending}
                  disabled={!invite.name || !invite.email}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Create credentials
                </Button>
              </div>
            </section>
          </div>

          <section className="mt-6 space-y-3 rounded-xl border border-[#dce4ee] bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">Feature access</p>
              <p className="text-xs text-[#64748b]">
                Turn modules on or off for this company. Disabled features disappear from
                their sidebar after save.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TENANT_FEATURE_KEYS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#dce4ee] bg-[#f8fafc] px-3 py-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={draft.features[key] !== false}
                    onChange={(e) =>
                      setDraft((s) => ({
                        ...s,
                        features: { ...s.features, [key]: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-[#cbd5e1] text-[#2563eb]"
                  />
                  <span className="text-[#0f172a]">{label}</span>
                </label>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => saveTenant.mutate()}
              loading={saveTenant.isPending}
            >
              Save feature limits
            </Button>
          </section>

          <section className="mt-6 overflow-hidden rounded-xl border border-[#dce4ee] bg-white">
            <div className="border-b border-[#dce4ee] px-4 py-3">
              <p className="text-sm font-semibold text-[#0f172a]">
                Users ({users.length})
              </p>
            </div>
            {usersLoading ? (
              <p className="px-4 py-6 text-sm text-[#64748b]">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#64748b]">No users in this workspace.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dce4ee]">
                    {users.map((u) => (
                      <tr key={u.id} className="text-[#0f172a]">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-[#64748b]">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              patchUser.mutate({
                                userId: u.id,
                                body: { role: e.target.value },
                              })
                            }
                            className="h-8 rounded-lg border border-[#dce4ee] bg-white px-2 text-xs"
                          >
                            {INVITE_ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip
                            status={u.isActive !== false ? 'active' : 'suspended'}
                            label={u.isActive !== false ? 'Active' : 'Deactivated'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={resetPassword.isPending}
                              onClick={() => resetPassword.mutate(u.id)}
                            >
                              Reset password
                            </Button>
                            <Button
                              size="sm"
                              variant={u.isActive !== false ? 'danger' : 'secondary'}
                              onClick={() =>
                                patchUser.mutate({
                                  userId: u.id,
                                  body: { isActive: u.isActive === false },
                                })
                              }
                            >
                              <UserMinus className="mr-1 h-3.5 w-3.5" />
                              {u.isActive !== false ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <InviteDetailsModal
        open={!!details}
        details={details}
        onClose={() => setDetails(null)}
      />
    </div>
  )
}
