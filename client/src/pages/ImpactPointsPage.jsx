import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, endOfMonth } from 'date-fns'
import {
  Award,
  Check,
  Crown,
  Flame,
  Gift,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trophy,
  TrendingUp,
  Medal,
  Shield,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, useAuthStore } from '../lib/api'
import { Avatar, Button, Input, Select, toast } from '../components/ui'
import { cn } from '../lib/utils'

const PERIODS = [
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
  { key: 'all', label: 'All time' },
]

const CATEGORY_LABELS = {
  productivity: 'Productivity',
  quality: 'Quality',
  collaboration: 'Collaboration',
  client: 'Client',
  attendance: 'Attendance',
  improvement: 'Improvement',
  manual: 'Manual',
  penalty: 'Penalty',
}

const BADGE_META = {
  rising_star: {
    icon: Sparkles,
    tone: 'from-sky-400 to-blue-600',
    glow: 'shadow-[0_10px_24px_-10px_rgba(37,99,235,0.55)]',
    label: 'Rising Star',
  },
  consistent: {
    icon: Shield,
    tone: 'from-emerald-400 to-teal-600',
    glow: 'shadow-[0_10px_24px_-10px_rgba(13,148,136,0.55)]',
    label: 'Consistent',
  },
  high_impact: {
    icon: Flame,
    tone: 'from-amber-400 to-orange-600',
    glow: 'shadow-[0_10px_24px_-10px_rgba(234,88,12,0.55)]',
    label: 'High Impact',
  },
  champion: {
    icon: Trophy,
    tone: 'from-violet-400 to-fuchsia-600',
    glow: 'shadow-[0_10px_24px_-10px_rgba(168,85,247,0.55)]',
    label: 'Champion',
  },
}

function roleLabel(role) {
  return String(role || 'member')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatPoints(value) {
  const n = Number(value) || 0
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-IN')}`
}

export function ImpactPointsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [period, setPeriod] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [tab, setTab] = useState('overview') // overview | rules
  const [adjust, setAdjust] = useState({
    userId: '',
    ruleKey: '',
    points: '',
    note: '',
  })

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['impact-overview'],
    queryFn: () => api('/impact/overview'),
  })

  const { data: meData } = useQuery({
    queryKey: ['impact-me'],
    queryFn: () => api('/impact/me'),
  })

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['impact-leaderboard', period, roleFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ period })
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (search.trim()) params.set('q', search.trim())
      return api(`/impact/leaderboard?${params}`)
    },
  })

  const profileId = selectedUserId
  const { data: profileData } = useQuery({
    queryKey: ['impact-user', profileId],
    queryFn: () => api(`/impact/users/${profileId}`),
    enabled: !!profileId,
  })

  // Always know this month's #1 for the Company Champion reward card,
  // regardless of the leaderboard filters currently selected.
  const { data: championData } = useQuery({
    queryKey: ['impact-leaderboard', 'monthly', 'all', ''],
    queryFn: () => api('/impact/leaderboard?period=monthly'),
  })
  const champion = championData?.leaderboard?.[0]

  const canManage = !!data?.canManage
  const me = meData?.score || data?.me || { totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0 }
  const badges = meData?.badges || data?.badges || []
  const company = data?.company || {}
  const viewingPerson = !!selectedUserId
  // Default = company overall (so panels are never empty when the firm has activity).
  // Clicking a leaderboard row/badge drills into that person's stats.
  const breakdown = viewingPerson
    ? profileData?.breakdown || []
    : company.breakdown || []
  const trend = viewingPerson ? profileData?.trend || [] : company.trend || []
  const timeline = viewingPerson
    ? profileData?.timeline || []
    : company.timeline || []
  const viewedName = viewingPerson ? profileData?.user?.name || '' : ''
  const companyScope = company.scope === 'company'
  const leaderboard = boardData?.leaderboard || []
  const people = data?.people || []
  const rules = data?.rules || []

  const roles = useMemo(
    () => [...new Set(people.map((p) => p.role))].sort(),
    [people],
  )

  const myRank =
    leaderboard.find(
      (row) => String(row.user._id) === String(user?.id || user?._id),
    )?.rank || '—'

  const adjustMutation = useMutation({
    mutationFn: (body) =>
      api('/impact/adjust', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast('Impact points updated', { type: 'success' })
      setAdjust({ userId: '', ruleKey: '', points: '', note: '' })
      qc.invalidateQueries({ queryKey: ['impact-overview'] })
      qc.invalidateQueries({ queryKey: ['impact-me'] })
      qc.invalidateQueries({ queryKey: ['impact-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['impact-user'] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const saveRule = useMutation({
    mutationFn: ({ id, ...body }) =>
      api(`/impact/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Rule saved', { type: 'success' })
      qc.invalidateQueries({ queryKey: ['impact-overview'] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <div className="h-36 animate-pulse rounded-3xl bg-surface" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <header className="on-dark flex flex-wrap items-end justify-between gap-4 rounded-[22px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] px-5 py-6 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.4)] sm:px-7">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--create-fg)]">
            <Trophy className="h-3 w-3" />
            Performance scoring
          </div>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-white">
            Impact Points
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] text-white/55">
            Contribution, quality, collaboration, and delivery — scored
            automatically from work and adjustable by Admin / Owner.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-white/[0.1] bg-white/[0.06] p-1">
            {[
              { key: 'overview', label: 'Overview' },
              ...(canManage ? [{ key: 'rules', label: 'Point rules' }] : []),
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-semibold transition',
                  tab === item.key
                    ? 'bg-accent text-[#171717] shadow-sm'
                    : 'text-secondary hover:text-primary',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 text-[12px] font-semibold text-secondary transition hover:bg-active hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </header>

      {tab === 'rules' && canManage ? (
        <RulesPanel rules={rules} onSave={saveRule} />
      ) : (
        <>
          {/* Score cards */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ScoreHero
              total={me.totalPoints || 0}
              weekly={me.weeklyPoints || 0}
              monthly={me.monthlyPoints || 0}
              rank={myRank}
            />
            <MiniMetric
              icon={TrendingUp}
              label="This week"
              value={formatPoints(me.weeklyPoints || 0)}
              tone="blue"
            />
            <MiniMetric
              icon={Flame}
              label="This month"
              value={formatPoints(me.monthlyPoints || 0)}
              tone="amber"
            />
            <MiniMetric
              icon={Medal}
              label="Badges earned"
              value={badges.filter((b) => b.earned).length}
              tone="violet"
            />
          </section>

          {/* Champion reward + achievement badges */}
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <ChampionRewardCard
              champion={champion}
              isMe={
                champion &&
                String(champion.user?._id) === String(user?.id || user?._id)
              }
            />
            <Panel
              title="Achievement levels"
              subtitle="Earn a badge at every level as your impact grows"
            >
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {badges.map((badge) => {
                  const meta = BADGE_META[badge.key] || BADGE_META.rising_star
                  const Icon = meta.icon
                  const total = Number(me.totalPoints) || 0
                  const pct = badge.minPoints
                    ? Math.min(100, Math.round((total / badge.minPoints) * 100))
                    : 100
                  const toGo = Math.max(0, (badge.minPoints || 0) - total)
                  return (
                    <div
                      key={badge.key}
                      className={cn(
                        'relative overflow-hidden rounded-2xl border p-3 text-center transition',
                        badge.earned
                          ? 'border-amber-400/30 bg-amber-400/10'
                          : 'border-white/[0.08] bg-white/[0.03]',
                      )}
                    >
                      {badge.earned && (
                        <span className="pointer-events-none absolute -right-8 top-3 rotate-45 bg-gradient-to-r from-amber-400 to-orange-400 px-8 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                          Earned
                        </span>
                      )}

                      <div className="relative mx-auto h-14 w-14">
                        <span
                          className={cn(
                            'flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white ring-4 ring-[var(--panel-dark)]',
                            meta.tone,
                            badge.earned ? meta.glow : 'opacity-45 grayscale',
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[var(--panel-dark)]',
                            badge.earned
                              ? 'bg-[var(--accent)] text-[var(--create-fg)]'
                              : 'bg-white/20 text-white/50',
                          )}
                        >
                          {badge.earned ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            <Lock className="h-2.5 w-2.5" />
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-[12px] font-bold text-white">
                        {badge.label}
                      </p>
                      <p className="mt-0.5 text-[9.5px] leading-snug text-white/45">
                        {badge.description}
                      </p>

                      {badge.earned ? (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-300">
                          <Award className="h-2.5 w-2.5" />
                          Badge unlocked
                        </p>
                      ) : (
                        <div className="mt-2">
                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                            <div
                              className={cn(
                                'h-full rounded-full bg-gradient-to-r',
                                meta.tone,
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[9.5px] font-semibold tabular-nums text-white/45">
                            {toGo.toLocaleString('en-IN')} pts to go ·{' '}
                            {badge.minPoints}+
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <div className="space-y-5">
              {/* Trend + breakdown */}
              <div className="grid gap-4 lg:grid-cols-5">
                <Panel
                  className="lg:col-span-3"
                  title="30-day trend"
                  subtitle={
                    viewedName
                      ? `Daily impact points — ${viewedName}`
                      : companyScope
                        ? 'Company-wide daily impact points'
                        : 'Daily impact points earned or deducted'
                  }
                  action={
                    viewingPerson ? (
                      <button
                        type="button"
                        onClick={() => setSelectedUserId('')}
                        className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:bg-white/[0.1] hover:text-white"
                      >
                        Back to company
                      </button>
                    ) : null
                  }
                >
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18 }}>
                        <defs>
                          <linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3ecf8e" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#3ecf8e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="rgba(255,255,255,0.35)"
                          fontSize={10}
                          tickFormatter={(v) => String(v).slice(5)}
                        />
                        <YAxis stroke="rgba(255,255,255,0.35)" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            background: '#1c1c1c',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fafafa',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="points"
                          stroke="#3ecf8e"
                          fill="url(#impactFill)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel
                  className="lg:col-span-2"
                  title="Point sources"
                  subtitle={
                    viewedName
                      ? `Where ${viewedName}'s score comes from`
                      : companyScope
                        ? 'Where company points come from'
                        : 'Where your score comes from'
                  }
                >
                  <div className="space-y-3">
                    {breakdown.length === 0 && (
                      <p className="py-8 text-center text-[12px] text-white/45">
                        No scored activity yet.
                      </p>
                    )}
                    {breakdown.map((row) => {
                      const max = Math.max(
                        ...breakdown.map((b) => Math.abs(b.points)),
                        1,
                      )
                      const pct = Math.round((Math.abs(row.points) / max) * 100)
                      return (
                        <div key={row.category}>
                          <div className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="font-medium text-primary">
                              {CATEGORY_LABELS[row.category] || row.category}
                            </span>
                            <span
                              className={cn(
                                'font-semibold tabular-nums',
                                row.points < 0 ? 'text-red-600' : 'text-primary',
                              )}
                            >
                              {formatPoints(row.points)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                row.points < 0 ? 'bg-red-400' : 'bg-[#3ecf8e]',
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Panel>
              </div>

              {/* Leaderboard */}
              <Panel
                title="Leaderboard"
                subtitle="Ranked by impact across the company"
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full border border-white/[0.1] bg-white/[0.06] p-0.5">
                      {PERIODS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPeriod(p.key)}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            period === p.key
                              ? 'bg-accent text-[#171717] shadow-sm'
                              : 'text-secondary hover:text-primary',
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search people"
                        className="h-8 w-40 rounded-lg border border-white/[0.1] bg-white/[0.06] pl-8 pr-2 text-[11.5px] text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]/40"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-8 rounded-lg border border-white/[0.1] bg-white/[0.06] px-2 text-[11.5px] font-medium text-white/70 outline-none"
                    >
                      <option value="all">All roles</option>
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                }
                noPadding
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="border-y border-white/[0.06] bg-white/[0.03] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">
                        <th className="px-5 py-2.5">Rank</th>
                        <th className="px-3 py-2.5">Employee</th>
                        <th className="px-3 py-2.5 text-center">Week</th>
                        <th className="px-3 py-2.5 text-center">Month</th>
                        <th className="px-3 py-2.5 text-center">All time</th>
                        <th className="px-5 py-2.5">Badges</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {boardLoading && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-[12px] text-white/45">
                            Loading leaderboard…
                          </td>
                        </tr>
                      )}
                      {!boardLoading &&
                        leaderboard.map((row) => {
                          const active =
                            String(row.user._id) === String(profileId)
                          return (
                            <tr
                              key={row.user._id}
                              className={cn(
                                'cursor-pointer transition hover:bg-white/[0.03]',
                                active && 'bg-[var(--accent)]/10',
                              )}
                              onClick={() => setSelectedUserId(String(row.user._id))}
                            >
                              <td className="px-5 py-3">
                                <RankBadge rank={row.rank} />
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    src={row.user.avatar}
                                    name={row.user.name}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-[12.5px] font-semibold text-white">
                                      {row.user.name}
                                    </p>
                                    <p className="truncate text-[10.5px] text-white/45">
                                      {row.user.title || roleLabel(row.user.role)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-[12px] font-semibold tabular-nums text-white/55">
                                {row.weeklyPoints}
                              </td>
                              <td className="px-3 py-3 text-center text-[12px] font-semibold tabular-nums text-white/55">
                                {row.monthlyPoints}
                              </td>
                              <td className="px-3 py-3 text-center text-[13px] font-bold tabular-nums text-white">
                                {row.totalPoints}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex gap-1">
                                  {(row.badges || []).slice(0, 4).map((key) => {
                                    const meta =
                                      BADGE_META[key] || BADGE_META.rising_star
                                    const BadgeIcon = meta.icon
                                    return (
                                      <span
                                        key={key}
                                        title={meta.label}
                                        className={cn(
                                          'flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm ring-1 ring-[var(--panel-dark)]',
                                          meta.tone,
                                        )}
                                      >
                                        <BadgeIcon className="h-3 w-3" />
                                      </span>
                                    )
                                  })}
                                  {!row.badges?.length && (
                                    <span className="text-[11px] text-white/30">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      {!boardLoading && !leaderboard.length && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-[12px] text-white/45">
                            No people match these filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <div className="space-y-5">
              {/* Manual adjust */}
              {canManage && (
                <Panel
                  title="Adjust points"
                  subtitle="Manually add or deduct for any employee"
                >
                  <div className="space-y-3">
                    <Select
                      label="Employee"
                      value={adjust.userId}
                      onChange={(e) =>
                        setAdjust((s) => ({ ...s, userId: e.target.value }))
                      }
                      options={[
                        { value: '', label: 'Select employee…' },
                        ...people.map((p) => ({
                          value: p._id,
                          label: `${p.name} · ${roleLabel(p.role)}`,
                        })),
                      ]}
                    />
                    <Select
                      label="Preset rule (optional)"
                      value={adjust.ruleKey}
                      onChange={(e) =>
                        setAdjust((s) => ({ ...s, ruleKey: e.target.value }))
                      }
                      options={[
                        { value: '', label: 'Custom points…' },
                        ...rules.map((r) => ({
                          value: r.key,
                          label: `${r.label} (${formatPoints(r.points)})`,
                        })),
                      ]}
                    />
                    {!adjust.ruleKey && (
                      <Input
                        label="Custom points"
                        type="number"
                        placeholder="+20 or -15"
                        value={adjust.points}
                        onChange={(e) =>
                          setAdjust((s) => ({ ...s, points: e.target.value }))
                        }
                      />
                    )}
                    <Input
                      label="Note"
                      placeholder="Reason for this adjustment"
                      value={adjust.note}
                      onChange={(e) =>
                        setAdjust((s) => ({ ...s, note: e.target.value }))
                      }
                    />
                    <Button
                      className="w-full"
                      loading={adjustMutation.isPending}
                      disabled={
                        !adjust.userId ||
                        (!adjust.ruleKey && !Number(adjust.points))
                      }
                      onClick={() => {
                        const body = {
                          userId: adjust.userId,
                          note: adjust.note,
                        }
                        if (adjust.ruleKey) body.ruleKey = adjust.ruleKey
                        else body.points = Number(adjust.points)
                        adjustMutation.mutate(body)
                      }}
                    >
                      {Number(adjust.points) < 0 ||
                      rules.find((r) => r.key === adjust.ruleKey)?.points < 0 ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Apply adjustment
                    </Button>
                  </div>
                </Panel>
              )}

              {/* Activity timeline */}
              <Panel
                title="Activity timeline"
                subtitle={
                  viewingPerson && viewedName
                    ? `${viewedName}'s recent impact events`
                    : companyScope
                      ? 'Recent impact events across the company'
                      : 'Your recent impact events'
                }
                action={
                  viewingPerson ? (
                    <button
                      type="button"
                      onClick={() => setSelectedUserId('')}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:bg-white/[0.1] hover:text-white"
                    >
                      Company feed
                    </button>
                  ) : null
                }
                noPadding
              >
                <div className="max-h-[420px] overflow-y-auto">
                  {timeline.length === 0 && (
                    <p className="px-5 py-10 text-center text-[12px] text-secondary">
                      No transactions yet.
                    </p>
                  )}
                  {timeline.map((entry) => {
                    const entryUser =
                      entry.userId && typeof entry.userId === 'object'
                        ? entry.userId
                        : null
                    return (
                    <div
                      key={entry._id}
                      className="flex gap-3 border-b border-[#edf1f6] px-5 py-3 last:border-0"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold',
                          entry.weightedPoints < 0
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-700',
                        )}
                      >
                        {entry.weightedPoints < 0 ? (
                          <Minus className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-primary">
                              {entry.label}
                            </p>
                            {!viewingPerson && entryUser?.name && (
                              <p className="mt-0.5 text-[11px] font-medium text-secondary">
                                {entryUser.name}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              'shrink-0 text-[12.5px] font-bold tabular-nums',
                              entry.weightedPoints < 0
                                ? 'text-red-600'
                                : 'text-emerald-700',
                            )}
                          >
                            {formatPoints(entry.weightedPoints)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10.5px] text-secondary">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                          {entry.source === 'manual' ? ' · Manual' : ' · Auto'}
                          {entry.projectId?.name
                            ? ` · ${entry.projectId.name}`
                            : ''}
                          {' · '}
                          {new Date(entry.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {entry.note && (
                          <p className="mt-1 text-[11px] text-secondary">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ChampionRewardCard({ champion, isMe }) {
  const now = new Date()
  const daysLeft = Math.max(0, differenceInCalendarDays(endOfMonth(now), now))
  const monthLabel = now.toLocaleString('en-IN', { month: 'long' })

  return (
    <section className="on-dark relative overflow-hidden rounded-[20px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] p-5 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
          <Crown className="h-3 w-3" />
          Company Champion
        </span>
        <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/50">
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in {monthLabel}
        </span>
      </div>

      <h3 className="mt-3 text-[16px] font-bold leading-snug tracking-[-0.02em] text-white">
        Finish #1 this month &amp; win the champion&apos;s reward
      </h3>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
        Every month the company rewards the top performer on the impact
        leaderboard.
      </p>

      <div className="relative mt-4 overflow-hidden rounded-xl border border-dashed border-amber-400/40 bg-amber-400/10 p-3.5">
        <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-dashed border-amber-400/40 bg-[var(--panel-dark)]" />
        <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-dashed border-amber-400/40 bg-[var(--panel-dark)]" />
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_14px_-6px_rgba(234,88,12,0.6)]">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-amber-200">
              Amazon Gift Voucher
            </p>
            <p className="text-[10.5px] text-white/40">
              Sponsored by the company · awarded at month end
            </p>
          </div>
          <Trophy className="h-5 w-5 shrink-0 text-amber-400" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
        {champion ? (
          <>
            <div className="relative shrink-0">
              <Avatar
                src={champion.user?.avatar}
                name={champion.user?.name}
                size="sm"
              />
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-2 ring-[var(--panel-dark)]">
                <Crown className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                Currently leading
              </p>
              <p className="truncate text-[12.5px] font-semibold text-white">
                {champion.user?.name}
              </p>
            </div>
            {isMe && (
              <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--accent)]">
                You
              </span>
            )}
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-bold tabular-nums text-amber-300">
                {(champion.monthlyPoints || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[9.5px] text-white/40">pts this month</p>
            </div>
          </>
        ) : (
          <p className="w-full py-1 text-center text-[11.5px] text-white/40">
            No points scored this month yet — the crown is up for grabs.
          </p>
        )}
      </div>
    </section>
  )
}

function ScoreHero({ total, weekly, monthly, rank }) {
  return (
    <section className="on-dark relative overflow-hidden rounded-[20px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] p-5 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)] md:col-span-2 xl:col-span-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        Your impact score
      </p>
      <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.04em] text-white">
        {(total || 0).toLocaleString('en-IN')}
      </p>
      <p className="mt-2 text-[12px] text-white/50">
        Rank #{rank} · Week {formatPoints(weekly)} · Month{' '}
        {formatPoints(monthly)}
      </p>
    </section>
  )
}

function MiniMetric({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: 'bg-[var(--accent)]/15 text-[var(--accent)]',
    amber: 'bg-amber-400/15 text-amber-300',
    violet: 'bg-violet-400/15 text-violet-300',
  }
  return (
    <section className="on-dark rounded-[18px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] p-4 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-white/45">{label}</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-white">
            {value}
          </p>
        </div>
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            tones[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </section>
  )
}

function Panel({ title, subtitle, action, children, className, noPadding }) {
  return (
    <section
      className={cn(
        'on-dark overflow-hidden rounded-[20px] border border-[var(--panel-dark-border)] bg-[var(--panel-dark)] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[var(--panel-dark-raised)] px-5 py-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[10.5px] text-white/45">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className={noPadding ? '' : 'px-5 pb-5 pt-1'}>{children}</div>
    </section>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_4px_10px_-3px_rgba(245,158,11,0.7)] ring-2 ring-amber-400/20">
        <Crown className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.1] text-[12px] font-bold text-white/70">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/15 text-[12px] font-bold text-amber-300">
        3
      </span>
    )
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-white/45">
      {rank}
    </span>
  )
}

function RulesPanel({ rules, onSave }) {
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        (rules || []).map((r) => [
          r._id,
          {
            points: r.points,
            weight: r.weight,
            enabled: r.enabled,
            label: r.label,
          },
        ]),
      ),
    )
  }, [rules])

  return (
    <Panel
      title="Company point rules"
      subtitle="Customise weights and point values for your studio"
      action={
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
          <Settings2 className="h-3.5 w-3.5" />
          Admin / Owner only
        </span>
      }
      noPadding
    >
      <div className="divide-y divide-[#edf1f6]">
        {rules.map((rule) => {
          const draft = drafts[rule._id] || {
            points: rule.points,
            weight: rule.weight,
            enabled: rule.enabled,
            label: rule.label,
          }
          return (
            <div
              key={rule._id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_100px_90px_90px_110px]"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-primary">
                  {rule.label}
                </p>
                <p className="mt-0.5 text-[11px] text-secondary">
                  {rule.description || CATEGORY_LABELS[rule.category]}
                  {rule.auto ? ' · Auto' : ' · Manual'}
                </p>
              </div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                Points
                <input
                  type="number"
                  value={draft.points}
                  onChange={(e) =>
                    setDrafts((s) => ({
                      ...s,
                      [rule._id]: { ...draft, points: Number(e.target.value) },
                    }))
                  }
                  className="mt-1 h-8 w-full rounded-lg border border-border px-2 text-[12px] font-semibold tabular-nums outline-none focus:border-accent/40"
                />
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                Weight
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft.weight}
                  onChange={(e) =>
                    setDrafts((s) => ({
                      ...s,
                      [rule._id]: { ...draft, weight: Number(e.target.value) },
                    }))
                  }
                  className="mt-1 h-8 w-full rounded-lg border border-border px-2 text-[12px] font-semibold tabular-nums outline-none focus:border-accent/40"
                />
              </label>
              <label className="flex items-end gap-2 pb-1 text-[11px] font-semibold text-secondary">
                <input
                  type="checkbox"
                  checked={!!draft.enabled}
                  onChange={(e) =>
                    setDrafts((s) => ({
                      ...s,
                      [rule._id]: { ...draft, enabled: e.target.checked },
                    }))
                  }
                />
                Enabled
              </label>
              <Button
                size="sm"
                variant="secondary"
                loading={onSave.isPending}
                onClick={() =>
                  onSave.mutate({
                    id: rule._id,
                    points: draft.points,
                    weight: draft.weight,
                    enabled: draft.enabled,
                  })
                }
              >
                Save
              </Button>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
