import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Flame,
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
  rising_star: { icon: Sparkles, tone: 'from-sky-400 to-blue-600' },
  consistent: { icon: Shield, tone: 'from-emerald-400 to-teal-600' },
  high_impact: { icon: Flame, tone: 'from-amber-400 to-orange-600' },
  champion: { icon: Trophy, tone: 'from-violet-400 to-fuchsia-600' },
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

  const profileId = selectedUserId || String(user?.id || user?._id || '')
  const { data: profileData } = useQuery({
    queryKey: ['impact-user', profileId],
    queryFn: () => api(`/impact/users/${profileId}`),
    enabled: !!profileId,
  })

  const canManage = !!data?.canManage
  const me = meData?.score || data?.me || { totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0 }
  const badges = meData?.badges || data?.badges || []
  const breakdown = meData?.breakdown || []
  const trend = meData?.trend || []
  const timeline = profileData?.timeline || meData?.timeline || []
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
        <div className="h-36 animate-pulse rounded-3xl bg-white" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            Performance scoring
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-[#0f172a]">
            Impact Points
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[#64748b]">
            Contribution, quality, collaboration, and delivery — scored
            automatically from work and adjustable by Admin / Owner.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#eef2f7] p-1">
            {[
              { key: 'overview', label: 'Overview' },
              ...(canManage ? [{ key: 'rules', label: 'Point rules' }] : []),
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                  tab === item.key
                    ? 'bg-white text-[#0f172a] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]',
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
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dce4ee] bg-white px-3 text-[12px] font-semibold text-[#475569] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <div className="space-y-5">
              {/* Trend + breakdown */}
              <div className="grid gap-4 lg:grid-cols-5">
                <Panel
                  className="lg:col-span-3"
                  title="30-day trend"
                  subtitle="Daily impact points earned or deducted"
                >
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18 }}>
                        <defs>
                          <linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e8eef5" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickFormatter={(v) => String(v).slice(5)}
                        />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid #dce4ee',
                            boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="points"
                          stroke="#2563eb"
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
                  subtitle="Where your score comes from"
                >
                  <div className="space-y-3">
                    {breakdown.length === 0 && (
                      <p className="py-8 text-center text-[12px] text-[#94a3b8]">
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
                            <span className="font-medium text-[#334155]">
                              {CATEGORY_LABELS[row.category] || row.category}
                            </span>
                            <span
                              className={cn(
                                'font-semibold tabular-nums',
                                row.points < 0 ? 'text-red-600' : 'text-[#0f172a]',
                              )}
                            >
                              {formatPoints(row.points)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                row.points < 0 ? 'bg-red-400' : 'bg-[#2563eb]',
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
                    <div className="inline-flex rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-0.5">
                      {PERIODS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPeriod(p.key)}
                          className={cn(
                            'rounded-md px-2.5 py-1 text-[11px] font-semibold',
                            period === p.key
                              ? 'bg-white text-[#0f172a] shadow-sm'
                              : 'text-[#64748b]',
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search people"
                        className="h-8 w-40 rounded-lg border border-[#dce4ee] bg-white pl-8 pr-2 text-[11.5px] outline-none focus:border-[#93b4ec]"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-8 rounded-lg border border-[#dce4ee] bg-white px-2 text-[11.5px] font-medium text-[#475569] outline-none"
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
                      <tr className="border-y border-[#e8eef5] bg-[#f8fafc] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                        <th className="px-5 py-2.5">Rank</th>
                        <th className="px-3 py-2.5">Employee</th>
                        <th className="px-3 py-2.5 text-center">Week</th>
                        <th className="px-3 py-2.5 text-center">Month</th>
                        <th className="px-3 py-2.5 text-center">All time</th>
                        <th className="px-5 py-2.5">Badges</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf1f6]">
                      {boardLoading && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-[12px] text-[#94a3b8]">
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
                                'cursor-pointer transition hover:bg-[#fbfdff]',
                                active && 'bg-[#f5f9ff]',
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
                                    <p className="truncate text-[12.5px] font-semibold text-[#0f172a]">
                                      {row.user.name}
                                    </p>
                                    <p className="truncate text-[10.5px] text-[#94a3b8]">
                                      {row.user.title || roleLabel(row.user.role)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-[12px] font-semibold tabular-nums text-[#475569]">
                                {row.weeklyPoints}
                              </td>
                              <td className="px-3 py-3 text-center text-[12px] font-semibold tabular-nums text-[#475569]">
                                {row.monthlyPoints}
                              </td>
                              <td className="px-3 py-3 text-center text-[13px] font-bold tabular-nums text-[#0f172a]">
                                {row.totalPoints}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex gap-1">
                                  {(row.badges || []).slice(0, 4).map((key) => (
                                    <span
                                      key={key}
                                      title={key}
                                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f5f9] text-[10px]"
                                    >
                                      {key === 'champion'
                                        ? '🏆'
                                        : key === 'high_impact'
                                          ? '🔥'
                                          : key === 'consistent'
                                            ? '🛡️'
                                            : '✨'}
                                    </span>
                                  ))}
                                  {!row.badges?.length && (
                                    <span className="text-[11px] text-[#cbd5e1]">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      {!boardLoading && !leaderboard.length && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-[12px] text-[#94a3b8]">
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
              {/* Achievements */}
              <Panel title="Achievement levels" subtitle="Unlock badges as your impact grows">
                <div className="space-y-2.5">
                  {badges.map((badge) => {
                    const meta = BADGE_META[badge.key] || BADGE_META.rising_star
                    const Icon = meta.icon
                    return (
                      <div
                        key={badge.key}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border px-3 py-3',
                          badge.earned
                            ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white'
                            : 'border-[#e8eef5] bg-[#fafcfe] opacity-70',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                            meta.tone,
                            !badge.earned && 'grayscale',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-semibold text-[#0f172a]">
                            {badge.label}
                          </p>
                          <p className="text-[10.5px] text-[#94a3b8]">
                            {badge.description} · {badge.minPoints}+ pts
                          </p>
                        </div>
                        {badge.earned ? (
                          <Award className="h-4 w-4 text-amber-500" />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#cbd5e1]">
                            Locked
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Panel>

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
                  profileData?.user
                    ? `${profileData.user.name}'s recent impact events`
                    : 'Recent impact events'
                }
                noPadding
              >
                <div className="max-h-[420px] overflow-y-auto">
                  {timeline.length === 0 && (
                    <p className="px-5 py-10 text-center text-[12px] text-[#94a3b8]">
                      No transactions yet.
                    </p>
                  )}
                  {timeline.map((entry) => (
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
                          <p className="text-[12.5px] font-semibold text-[#0f172a]">
                            {entry.label}
                          </p>
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
                        <p className="mt-0.5 text-[10.5px] text-[#94a3b8]">
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
                          <p className="mt-1 text-[11px] text-[#64748b]">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ScoreHero({ total, weekly, monthly, rank }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[#dce7f5] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] md:col-span-2 xl:col-span-1"
      style={{
        backgroundImage:
          'radial-gradient(500px 180px at 100% 0%, rgba(37,99,235,0.10), transparent 60%)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
        Your impact score
      </p>
      <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#0f172a]">
        {(total || 0).toLocaleString('en-IN')}
      </p>
      <p className="mt-2 text-[12px] text-[#64748b]">
        Rank #{rank} · Week {formatPoints(weekly)} · Month{' '}
        {formatPoints(monthly)}
      </p>
    </section>
  )
}

function MiniMetric({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <section className="rounded-2xl border border-[#e0e7f0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-[#64748b]">{label}</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-[#0f172a]">
            {value}
          </p>
        </div>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}>
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
        'overflow-hidden rounded-2xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-[#0f172a]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[10.5px] text-[#94a3b8]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className={noPadding ? '' : 'px-5 pb-5'}>{children}</div>
    </section>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[12px] font-bold text-amber-700">
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-[12px] font-bold text-orange-700">
        3
      </span>
    )
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f5f9] text-[11px] font-bold text-[#64748b]">
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
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
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
                <p className="text-[13px] font-semibold text-[#0f172a]">
                  {rule.label}
                </p>
                <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                  {rule.description || CATEGORY_LABELS[rule.category]}
                  {rule.auto ? ' · Auto' : ' · Manual'}
                </p>
              </div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
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
                  className="mt-1 h-8 w-full rounded-lg border border-[#dce4ee] px-2 text-[12px] font-semibold tabular-nums outline-none focus:border-[#93b4ec]"
                />
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
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
                  className="mt-1 h-8 w-full rounded-lg border border-[#dce4ee] px-2 text-[12px] font-semibold tabular-nums outline-none focus:border-[#93b4ec]"
                />
              </label>
              <label className="flex items-end gap-2 pb-1 text-[11px] font-semibold text-[#475569]">
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
