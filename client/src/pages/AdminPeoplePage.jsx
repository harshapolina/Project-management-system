import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus,
  Briefcase,
  AlertTriangle,
  ShieldCheck,
  Save,
  Search,
  UsersRound,
  CheckCircle2,
  ListChecks,
  Clock3,
  ChevronRight,
  LockKeyhole,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { api, getTenantSlug, useAuthStore } from '../lib/api'
import {
  canInviteUsers,
  capabilitiesForUser,
  ACCESS_TOGGLES,
  INVITE_ROLE_OPTIONS,
  ROLE_LABELS,
} from '../lib/roles'
import { formatTrackedSeconds } from '../lib/taskStatus'
import {
  Avatar,
  Button,
  Input,
  Select,
  Skeleton,
  toast,
} from '../components/ui'
import { InviteDetailsModal } from '../components/layout/GlobalChrome'

export function AdminPeoplePage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
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
  const caps = capabilitiesForUser(user)
  const canResetPasswords = ['admin', 'owner'].includes(user?.role)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-team-summary'],
    queryFn: () => api('/admin/team-summary'),
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

  const summary = data?.data
  const members = summary?.members || []
  const selected = members.find(
    (member) => String(member.user._id) === String(selectedId),
  )
  const filteredMembers = members.filter((member) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [member.user.name, member.user.email, member.user.role, member.user.title]
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
    setPermissionDraft(selected.user.effectivePermissions || {})
  }, [selected])

  const savePermissions = useMutation({
    mutationFn: () =>
      api(`/admin/users/${selectedId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: permissionDraft }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team-summary'] })
      toast(
        'Access saved. Employee sidebar updates within a few seconds (or after refresh).',
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
    <div className="min-h-full bg-[#eef3f8]">
      <div className="mx-auto max-w-[1440px] space-y-5 p-4 md:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-[28px] bg-[#102a43] px-5 py-6 text-white shadow-[0_18px_55px_rgba(15,42,67,0.18)] md:px-8 md:py-7">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="absolute bottom-[-100px] right-[22%] h-52 w-52 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                <Sparkles className="h-3.5 w-3.5" />
                People control center
              </div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] md:text-[36px]">
                Team & access
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-300 md:text-sm">
                See workload at a glance, control exactly what each person can
                access, and send new work from one place.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  label: 'People',
                  value: summary?.totalMembers ?? '—',
                  icon: UsersRound,
                  tone: 'text-blue-200',
                },
                {
                  label: 'Active',
                  value: summary?.activeMembers ?? '—',
                  icon: CheckCircle2,
                  tone: 'text-emerald-200',
                },
                {
                  label: 'Open work',
                  value: members.reduce((sum, member) => sum + (member.open || 0), 0),
                  icon: ListChecks,
                  tone: 'text-amber-200',
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-[92px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 backdrop-blur sm:min-w-[120px] sm:px-4"
                >
                  <metric.icon className={`mb-2 h-4 w-4 ${metric.tone}`} />
                  <p className="text-[22px] font-semibold tabular-nums leading-none sm:text-[26px]">
                    {metric.value}
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,0.85fr)]">
          <section className="overflow-hidden rounded-[24px] border border-[#dce5ef] bg-white shadow-[0_10px_35px_rgba(15,42,67,0.06)]">
            <div className="flex flex-col gap-3 border-b border-[#e7edf4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UsersRound className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[14px] font-semibold text-[#102a43]">
                      Company directory
                    </h2>
                    <p className="text-[11px] text-[#7b8da1]">
                      Select a person to manage their access
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative w-full sm:w-[250px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#90a2b6]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people or roles…"
                  className="h-9 w-full rounded-xl border border-[#dce5ef] bg-[#f7f9fc] pl-9 pr-3 text-[12px] text-[#102a43] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="hidden grid-cols-[minmax(0,1fr)_88px_95px_120px_20px] gap-3 border-b border-[#edf1f5] bg-[#f8fafc] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b9caf] md:grid">
              <span>Employee</span>
              <span>Open</span>
              <span>Overdue</span>
              <span>Time tracked</span>
              <span />
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[66px] w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="max-h-[610px] overflow-y-auto p-2">
                {filteredMembers.map((member) => {
                  const active =
                    String(selectedId) === String(member.user._id)
                  return (
                    <button
                      type="button"
                      key={member.user._id}
                      onClick={() => setSelectedId(String(member.user._id))}
                      className={`group grid w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-2xl px-3 py-3 text-left transition md:grid-cols-[minmax(0,1fr)_88px_95px_120px_20px] ${
                        active
                          ? 'bg-[#edf5ff] shadow-[inset_3px_0_0_#2563eb] ring-1 ring-blue-100'
                          : 'hover:bg-[#f7f9fc]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                          <Avatar
                            src={member.user.avatar}
                            name={member.user.name}
                            size="md"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#102a43]">
                            {member.user.name}
                          </p>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 rounded-md bg-[#e9eef5] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#52677d]">
                              {ROLE_LABELS[member.user.role] || member.user.role}
                            </span>
                            <span className="truncate text-[10px] text-[#8798aa]">
                              {member.user.title || member.user.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="hidden text-[12px] font-semibold tabular-nums text-[#42566c] md:block">
                        {member.open}
                      </span>
                      <span
                        className={`hidden w-fit items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold tabular-nums md:inline-flex ${
                          member.overdue > 0
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {member.overdue > 0 ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {member.overdue}
                      </span>
                      <span className="hidden items-center gap-1.5 text-[11px] tabular-nums text-[#6d8094] md:flex">
                        <Clock3 className="h-3.5 w-3.5 text-[#9aabbb]" />
                        {formatTrackedSeconds(member.timeSpent)}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 transition ${
                          active
                            ? 'text-blue-600'
                            : 'text-[#b4c0cc] group-hover:translate-x-0.5 group-hover:text-[#6d8094]'
                        }`}
                      />
                    </button>
                  )
                })}

                {!filteredMembers.length && (
                  <div className="py-16 text-center">
                    <UsersRound className="mx-auto h-8 w-8 text-[#b5c2cf]" />
                    <p className="mt-3 text-sm font-semibold text-[#52677d]">
                      No people found
                    </p>
                    <p className="mt-1 text-xs text-[#8b9caf]">
                      Try another name, email, or role.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {selected && (
            <aside className="overflow-hidden rounded-[24px] border border-[#d9e3ee] bg-white shadow-[0_14px_45px_rgba(15,42,67,0.09)] xl:sticky xl:top-5">
              <div className="border-b border-[#e7edf4] bg-gradient-to-br from-[#f5f9ff] to-white px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative">
                      <Avatar
                        src={selected.user.avatar}
                        name={selected.user.name}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white">
                        <ShieldCheck className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#102a43]">
                        {selected.user.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[#74879a]">
                        {ROLE_LABELS[selected.user.role] || selected.user.role}
                        {selected.user.title ? ` · ${selected.user.title}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-blue-50 px-2.5 py-1.5 text-center">
                    <p className="text-[16px] font-bold leading-none text-blue-600">
                      {enabledCount}
                    </p>
                    <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-blue-500">
                      enabled
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
                  <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <p className="text-[10px] leading-relaxed text-[#4d6480]">
                    Disabled modules are hidden from navigation and blocked on
                    the server.
                  </p>
                </div>
              </div>

              <div className="max-h-[500px] space-y-5 overflow-y-auto px-5 py-4">
                {Object.entries(permissionGroups).map(([group, items]) => (
                  <div key={group}>
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8fa0b2]">
                      {group}
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const enabled = !!permissionDraft[item.key]
                        return (
                          <label
                            key={item.key}
                            className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-3.5 py-3 transition ${
                              enabled
                                ? 'border-blue-200 bg-blue-50/70'
                                : 'border-[#e3eaf1] bg-white hover:border-[#cbd8e5] hover:bg-[#f9fbfd]'
                            } ${!caps.managePeople ? 'cursor-default opacity-75' : ''}`}
                          >
                            <span className="min-w-0">
                              <span
                                className={`block text-[12px] font-semibold ${
                                  enabled ? 'text-[#174f91]' : 'text-[#30475e]'
                                }`}
                              >
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-[9px] text-[#8a9bad]">
                                {enabled ? 'Visible and allowed' : 'Hidden and blocked'}
                              </span>
                            </span>
                            <span
                              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                                enabled ? 'bg-blue-600' : 'bg-[#cbd5df]'
                              }`}
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
                                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                                  enabled ? 'left-6' : 'left-1'
                                }`}
                              />
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#e7edf4] bg-[#fafcfe] p-4">
                {caps.managePeople ? (
                  <div className="space-y-2">
                    <Button
                      className="!h-11 w-full !rounded-xl shadow-lg shadow-blue-500/15"
                      loading={savePermissions.isPending}
                      onClick={() => savePermissions.mutate()}
                    >
                      <Save className="h-4 w-4" />
                      Save {selected.user.name.split(' ')[0]}'s access
                    </Button>
                    {canResetPasswords &&
                      String(selected.user._id) !==
                        String(user?.id || user?._id) &&
                      !(user?.role === 'admin' &&
                        selected.user.role === 'owner') && (
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
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dce5ef] bg-white text-[11.5px] font-semibold text-[#52677d] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          {resetPassword.isPending
                            ? 'Creating temporary password…'
                            : 'Reset password'}
                        </button>
                      )}
                  </div>
                ) : (
                  <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-[11px] text-amber-700">
                    HR can view access. Only an Admin or Owner can change it.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {canInviteUsers(user) && (
            <section className="rounded-[24px] border border-[#dce5ef] bg-white p-5 shadow-[0_8px_30px_rgba(15,42,67,0.05)]">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#102a43]">
                    Invite a teammate
                  </h2>
                  <p className="text-[11px] text-[#8395a8]">
                    Add a person to this company workspace
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
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
                <Select
                  label="Role"
                  value={invite.role}
                  onChange={(event) =>
                    setInvite((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  options={INVITE_ROLE_OPTIONS}
                />
              </div>
              <Button
                loading={sendInvite.isPending}
                disabled={!invite.name || !invite.email}
                onClick={() => sendInvite.mutate(invite)}
                className="mt-4 w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                Create invite
              </Button>
            </section>
          )}

          <section className="rounded-[24px] border border-[#dce5ef] bg-white p-5 shadow-[0_8px_30px_rgba(15,42,67,0.05)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-[#102a43]">
                  Assign project work
                </h2>
                <p className="text-[11px] text-[#8395a8]">
                  Jump to a project and create an assigned task
                </p>
              </div>
            </div>
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
            <Link
              to={projectId ? `/projects/${projectId}/tasks` : '/projects'}
              className="mt-4 block sm:w-fit"
            >
              <Button className="w-full" disabled={!projectId && !projects.length}>
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
    </div>
  )
}
