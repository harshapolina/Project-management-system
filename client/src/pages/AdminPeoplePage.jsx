import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus,
  Briefcase,
  AlertTriangle,
  Save,
  Search,
  UsersRound,
  ChevronRight,
  KeyRound,
} from 'lucide-react'
import { api, getTenantSlug, useAuthStore } from '../lib/api'
import {
  canInviteUsers,
  capabilitiesForUser,
  ACCESS_TOGGLES,
  CUSTOM_ROLE_BASE_OPTIONS,
  NEW_CUSTOM_ROLE_VALUE,
  inviteRoleOptions,
  roleLabelFor,
} from '../lib/roles'
import { formatTrackedSeconds } from '../lib/taskStatus'
import {
  Avatar,
  Button,
  Input,
  Modal,
  Select,
  Skeleton,
  toast,
} from '../components/ui'
import { InviteDetailsModal } from '../components/layout/GlobalChrome'
import { cn } from '../lib/utils'

export function AdminPeoplePage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const setTenant = useAuthStore((s) => s.setTenant)
  const qc = useQueryClient()
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: 'designer',
  })
  const [inviteResult, setInviteResult] = useState(null)
  const [projectId, setProjectId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [permissionDraft, setPermissionDraft] = useState({})
  const [search, setSearch] = useState('')
  const [customRoleOpen, setCustomRoleOpen] = useState(false)
  const [customRoleForm, setCustomRoleForm] = useState({
    label: '',
    basedOn: 'designer',
  })
  const caps = capabilitiesForUser(user, tenant)
  const canResetPasswords = ['admin', 'owner'].includes(user?.role)
  const customRoles = tenant?.customRoles || []
  const canCreateCustomRoles =
    !!user?.isPlatformAdmin || ['admin', 'owner'].includes(user?.role)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-team-summary'],
    queryFn: () => api('/admin/team-summary'),
  })

  const summary = data?.data
  const members = summary?.members || data?.members || []
  const adminsUsed = members.filter(
    (m) =>
      m.user?.isActive !== false &&
      ['admin', 'owner'].includes(m.user?.role),
  ).length
  const adminLimit = tenant?.adminLimit ?? 3
  const adminSlotsFull = adminsUsed >= adminLimit

  const roleOptions = inviteRoleOptions(customRoles, {
    allowCreate: canCreateCustomRoles,
  }).filter((opt) => {
    if (!adminSlotsFull) return true
    if (opt.value === '__create_custom__') return true
    return !['admin', 'owner'].includes(opt.value)
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-nav'],
    queryFn: () => api('/projects'),
  })
  const projects = projectsData?.projects || []

  const sendInvite = useMutation({
    mutationFn: (body) =>
      api('/auth/invite', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      setInviteResult({
        workspace: tenant?.slug || getTenantSlug(),
        email: res.user.email,
        tempPassword: res.tempPassword,
        loginUrl: `${window.location.origin}/login`,
      })
      setInvite({ name: '', email: '', role: 'designer' })
      qc.invalidateQueries({ queryKey: ['admin-team-summary'] })
      toast('Invite created', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const createCustomRole = useMutation({
    mutationFn: (body) =>
      api('/admin/custom-roles', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      const nextRoles = res.customRoles || [
        ...(customRoles || []),
        res.role,
      ].filter(Boolean)
      if (tenant) {
        setTenant({ ...tenant, customRoles: nextRoles })
      }
      setInvite((s) => ({ ...s, role: res.role?.key || s.role }))
      setCustomRoleOpen(false)
      setCustomRoleForm({ label: '', basedOn: 'designer' })
      toast(`Role “${res.role?.label}” created`, { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const selected = members.find(
    (member) => String(member.user._id) === String(selectedId),
  )
  const filteredMembers = members.filter((member) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [
      member.user.name,
      member.user.email,
      member.user.role,
      roleLabelFor(member.user.role, customRoles),
      member.user.title,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  })
  const enabledCount = ACCESS_TOGGLES.filter(
    (item) => permissionDraft[item.key],
  ).length
  const permissionGroups = ACCESS_TOGGLES.reduce((groups, item) => {
    groups[item.group] = [...(groups[item.group] || []), item]
    return groups
  }, {})

  useEffect(() => {
    if (!selectedId && members.length) {
      setSelectedId(String(members[0].user._id))
    }
  }, [members, selectedId])

  useEffect(() => {
    if (!selected) return
    const effective = selected.user.effectivePermissions || {}
    setPermissionDraft(
      Object.fromEntries(
        ACCESS_TOGGLES.map((item) => [item.key, !!effective[item.key]]),
      ),
    )
  }, [selected])

  const savePermissions = useMutation({
    mutationFn: () => {
      const permissions = Object.fromEntries(
        ACCESS_TOGGLES.map((item) => [item.key, !!permissionDraft[item.key]]),
      )
      return api(`/admin/users/${selectedId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      })
    },
    onSuccess: (res) => {
      qc.setQueryData(['admin-team-summary'], (prev) => {
        if (!prev?.data?.members) return prev
        return {
          ...prev,
          data: {
            ...prev.data,
            members: prev.data.members.map((member) => {
              if (String(member.user._id) !== String(selectedId)) return member
              return {
                ...member,
                user: {
                  ...member.user,
                  permissions: res?.user?.permissions || member.user.permissions,
                  effectivePermissions:
                    res?.user?.effectivePermissions ||
                    member.user.effectivePermissions,
                },
              }
            }),
          },
        }
      })
      qc.invalidateQueries({ queryKey: ['admin-team-summary'] })
      toast(
        `Access updated for ${selected?.user?.name || 'employee'}. Their menu updates instantly if they’re online.`,
        { type: 'success' },
      )
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const resetPassword = useMutation({
    mutationFn: () =>
      api(`/admin/users/${selectedId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (res) => {
      setInviteResult({
        workspace: tenant?.slug || getTenantSlug(),
        email: res.user.email,
        tempPassword: res.tempPassword,
        loginUrl: `${window.location.origin}/login`,
      })
      toast('Temporary password created', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="min-h-full bg-[var(--bg-canvas)]">
      <div className="mx-auto max-w-[1440px] space-y-5 p-4 md:p-6 lg:p-8">
        <section className="grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            {
              label: 'People',
              value: summary?.totalMembers ?? '—',
            },
            {
              label: 'Active',
              value: summary?.activeMembers ?? '—',
            },
            {
              label: 'Open work',
              value: members.reduce(
                (sum, member) => sum + (member.open || 0),
                0,
              ),
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[8px] border border-border bg-surface px-4 py-3"
            >
              <p className="text-[20px] font-medium tabular-nums leading-none text-primary">
                {metric.value}
              </p>
              <p className="mt-1.5 text-[11px] text-secondary">
                {metric.label}
              </p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-[12px] border border-border bg-surface">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-[14px] font-medium text-primary">
                  Company directory
                </h2>
                <p className="mt-0.5 text-[12px] text-secondary">
                  Select a person to manage their access
                </p>
              </div>
              <div className="relative w-full sm:w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people or roles…"
                  className="h-9 w-full rounded-[6px] border border-border bg-canvas pl-9 pr-3 text-[12px] text-primary outline-none placeholder:text-secondary focus:border-accent/40"
                />
              </div>
            </div>

            <div className="hidden border-b border-border bg-canvas px-5 md:block">
              <div className="grid grid-cols-[minmax(0,1fr)_64px_80px_96px_24px] items-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
                <span>Employee</span>
                <span className="text-center">Open</span>
                <span className="text-center">Overdue</span>
                <span className="text-center">Time</span>
                <span />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[60px] w-full rounded-[8px]" />
                ))}
              </div>
            ) : (
              <div className="thin-scroll max-h-[620px] overflow-y-auto overflow-x-hidden">
                {filteredMembers.map((member) => {
                  const active =
                    String(selectedId) === String(member.user._id)
                  return (
                    <button
                      type="button"
                      key={member.user._id}
                      onClick={() => setSelectedId(String(member.user._id))}
                      className={cn(
                        'group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,1fr)_64px_80px_96px_24px]',
                        active
                          ? 'bg-[var(--nav-active-bg)]'
                          : 'hover:bg-canvas',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          src={member.user.avatar}
                          name={member.user.name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-primary">
                            {member.user.name}
                          </p>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 rounded-[4px] bg-canvas px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-secondary ring-1 ring-border">
                              {roleLabelFor(member.user.role, customRoles)}
                            </span>
                            <span className="truncate text-[11px] text-secondary">
                              {member.user.title || member.user.email}
                            </span>
                          </div>
                          {/* Mobile metrics — always visible */}
                          <div className="mt-1.5 flex flex-wrap gap-2 md:hidden">
                            <span className="rounded-[4px] bg-canvas px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary ring-1 ring-border">
                              Open {member.open}
                            </span>
                            <span
                              className={cn(
                                'rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                                member.overdue > 0
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-[var(--accent)]/12 text-[var(--accent-hover)]',
                              )}
                            >
                              Overdue {member.overdue}
                            </span>
                            <span className="rounded-[4px] bg-canvas px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary ring-1 ring-border">
                              {formatTrackedSeconds(member.timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="hidden text-center text-[13px] font-semibold tabular-nums text-primary md:block">
                        {member.open}
                      </span>
                      <span className="hidden justify-center md:flex">
                        <span
                          className={cn(
                            'inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-bold tabular-nums',
                            member.overdue > 0
                              ? 'bg-red-50 text-red-700'
                              : 'bg-[var(--accent)]/15 text-[var(--accent-hover)]',
                          )}
                        >
                          {member.overdue > 0 ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : null}
                          {member.overdue}
                        </span>
                      </span>
                      <span className="hidden text-center text-[12px] font-semibold tabular-nums text-primary md:block">
                        {formatTrackedSeconds(member.timeSpent)}
                      </span>
                      <ChevronRight
                        className={cn(
                          'hidden h-4 w-4 justify-self-end text-secondary transition md:block',
                          active && 'text-accent',
                        )}
                      />
                    </button>
                  )
                })}

                {!filteredMembers.length && (
                  <div className="py-16 text-center">
                    <UsersRound className="mx-auto h-8 w-8 text-secondary" />
                    <p className="mt-3 text-sm font-medium text-primary">
                      No people found
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Try another name, email, or role.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {selected && (
            <aside className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-surface xl:sticky xl:top-5">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={selected.user.avatar}
                      name={selected.user.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-primary">
                        {selected.user.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-secondary">
                        {roleLabelFor(selected.user.role, customRoles)}
                        {selected.user.title ? ` · ${selected.user.title}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-[8px] bg-[var(--accent)]/10 px-2.5 py-1.5 text-center">
                    <p className="text-[15px] font-semibold leading-none text-[var(--accent-hover)]">
                      {enabledCount}
                    </p>
                    <p className="mt-1 text-[9px] font-medium uppercase tracking-wider text-secondary">
                      enabled
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[420px] flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                {Object.entries(permissionGroups).map(([group, items]) => (
                  <div key={group}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-secondary">
                      {group}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const enabled = !!permissionDraft[item.key]
                        return (
                          <label
                            key={item.key}
                            className={cn(
                              'flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border px-3 py-2.5 transition',
                              enabled
                                ? 'border-[var(--accent)]/30 bg-[var(--accent)]/8'
                                : 'border-border bg-canvas hover:bg-surface-raised',
                              !caps.managePeople && 'cursor-default opacity-75',
                            )}
                          >
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  'block text-[12px] font-semibold',
                                  enabled ? 'text-primary' : 'text-primary/80',
                                )}
                              >
                                {item.label}
                              </span>
                              <span
                                className={cn(
                                  'mt-0.5 block text-[10px] font-medium',
                                  enabled
                                    ? 'text-[var(--accent-hover)]'
                                    : 'text-secondary',
                                )}
                              >
                                {enabled
                                  ? 'Visible and allowed'
                                  : 'Hidden and blocked'}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'relative h-5 w-9 shrink-0 rounded-full transition',
                                enabled ? 'bg-accent' : 'bg-border',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={!caps.managePeople}
                                onChange={(event) =>
                                  setPermissionDraft((current) => ({
                                    ...current,
                                    [item.key]: event.target.checked,
                                  }))
                                }
                                className="sr-only"
                              />
                              <span
                                className={cn(
                                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition',
                                  enabled ? 'left-[18px]' : 'left-0.5',
                                )}
                              />
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto space-y-2 border-t border-border p-4 sm:px-5">
                {caps.managePeople ? (
                  <>
                    <Button
                      className="h-10 w-full rounded-[8px]"
                      loading={savePermissions.isPending}
                      onClick={() => savePermissions.mutate()}
                    >
                      <Save className="h-4 w-4" />
                      Save {selected.user.name.split(' ')[0]}'s access
                    </Button>
                    {canResetPasswords &&
                      String(selected.user._id) !==
                        String(user?.id || user?._id) &&
                      !(
                        user?.role === 'admin' &&
                        selected.user.role === 'owner'
                      ) && (
                        <button
                          type="button"
                          disabled={resetPassword.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Reset ${selected.user.name}'s password?\n\nThey will be signed out and must change the temporary password after logging in.`,
                              )
                            ) {
                              resetPassword.mutate()
                            }
                          }}
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-border text-[12px] font-medium text-secondary transition hover:bg-canvas hover:text-primary disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          {resetPassword.isPending
                            ? 'Creating temporary password…'
                            : 'Reset password'}
                        </button>
                      )}
                  </>
                ) : (
                  <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-[11px] text-amber-700">
                    HR can view access. Only an Admin or Owner can change it.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          {canInviteUsers(user) && (
            <section className="flex h-full flex-col rounded-[12px] border border-border bg-surface p-5">
              <div className="mb-4">
                <h2 className="text-[14px] font-medium text-primary">
                  Invite a teammate
                </h2>
                <p className="mt-0.5 text-[12px] text-secondary">
                  Add a person to this company workspace
                </p>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Name"
                  value={invite.name}
                  onChange={(event) =>
                    setInvite((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={invite.email}
                  onChange={(event) =>
                    setInvite((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <div className="sm:col-span-2">
                  <Select
                    label="Role"
                    value={invite.role}
                    onChange={(event) => {
                      const next = event.target.value
                      if (next === NEW_CUSTOM_ROLE_VALUE) {
                        setCustomRoleForm({ label: '', basedOn: 'designer' })
                        setCustomRoleOpen(true)
                        return
                      }
                      setInvite((current) => ({
                        ...current,
                        role: next,
                      }))
                    }}
                    options={roleOptions}
                  />
                  <p className="mt-1.5 text-[11px] text-secondary">
                    Company admins: {adminsUsed}/{adminLimit}
                    {adminSlotsFull
                      ? ' — admin slots full (platform sets this limit).'
                      : ''}
                  </p>
                </div>
              </div>
              <Button
                loading={sendInvite.isPending}
                disabled={!invite.name || !invite.email}
                onClick={() => sendInvite.mutate(invite)}
                className="mt-4 h-10 w-full rounded-[8px]"
              >
                <UserPlus className="h-4 w-4" />
                Create invite
              </Button>
            </section>
          )}

          <section className="flex h-full flex-col rounded-[12px] border border-border bg-surface p-5">
            <div className="mb-4">
              <h2 className="text-[14px] font-medium text-primary">
                Assign project work
              </h2>
              <p className="mt-0.5 text-[12px] text-secondary">
                Jump to a project and create an assigned task
              </p>
            </div>
            <div className="flex-1">
              <Select
                label="Choose project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                options={[
                  { value: '', label: 'Select project…' },
                  ...projects.map((project) => ({
                    value: project._id,
                    label: project.name,
                  })),
                ]}
              />
            </div>
            <Link
              to={projectId ? `/projects/${projectId}/tasks` : '/projects'}
              className="mt-4 block"
            >
              <Button
                className="h-10 w-full rounded-[8px]"
                disabled={!projectId && !projects.length}
              >
                {projectId ? 'Open project tasks' : 'Browse projects'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </section>
        </div>
      </div>

      <InviteDetailsModal
        open={!!inviteResult}
        details={inviteResult}
        onClose={() => setInviteResult(null)}
      />

      <Modal
        open={customRoleOpen}
        onClose={() => setCustomRoleOpen(false)}
        title="New custom role"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!customRoleForm.label.trim()) {
              toast('Enter a role name', { type: 'error' })
              return
            }
            createCustomRole.mutate({
              label: customRoleForm.label.trim(),
              basedOn: customRoleForm.basedOn,
            })
          }}
        >
          <p className="text-[13px] leading-relaxed text-secondary">
            Create a company role for invites. Access starts from a base
            template — you can fine-tune permissions after inviting.
          </p>
          <Input
            label="Role name"
            autoFocus
            placeholder="e.g. Quantity surveyor, Site engineer"
            value={customRoleForm.label}
            onChange={(e) =>
              setCustomRoleForm((s) => ({ ...s, label: e.target.value }))
            }
          />
          <Select
            label="Based on"
            value={customRoleForm.basedOn}
            onChange={(e) =>
              setCustomRoleForm((s) => ({ ...s, basedOn: e.target.value }))
            }
            options={CUSTOM_ROLE_BASE_OPTIONS}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCustomRoleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomRole.isPending}>
              {createCustomRole.isPending ? 'Creating…' : 'Create role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
