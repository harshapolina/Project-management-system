import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { Sparkline } from '../../components/Sparkline'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { impactApi } from '../../api/impact'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import { timeAgo } from '../../utils/time'
import { CATEGORY_LABELS, roleLabel, signedPoints } from './impactMeta'
import type { ImpactPeriod } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Impact'>

type Tab = 'overview' | 'board' | 'rules'

const PERIODS: { key: ImpactPeriod; label: string }[] = [
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'all', label: 'All time' },
]

const BADGE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  rising_star: 'sparkles-outline',
  consistent: 'shield-checkmark-outline',
  high_impact: 'flame-outline',
  champion: 'trophy-outline',
}

function daysLeftInMonth() {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / 86_400_000))
}

export function ImpactScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState<ImpactPeriod>('all')
  const [search, setSearch] = useState('')

  const overview = useQuery({
    queryKey: ['impact-overview'],
    queryFn: impactApi.overview,
    enabled: caps.impact,
  })

  const board = useQuery({
    queryKey: ['impact-leaderboard', period],
    queryFn: () => impactApi.leaderboard({ period }),
    enabled: caps.impact && tab === 'board',
  })

  // /impact/overview only returns *enabled* rules, so a rule switched off there
  // would be unreachable. The rules tab reads the full list.
  const rulesQuery = useQuery({
    queryKey: ['impact-rules'],
    queryFn: impactApi.rules,
    enabled: caps.impact && tab === 'rules',
  })

  const canManage = !!overview.data?.canManage

  const chromeProps = {
    title: 'Impact',
    subtitle: 'Points earned for finishing work well',
    subtitleIcon: 'trophy-outline' as const,
    right: canManage ? (
      <IconButton
        icon="add-circle-outline"
        label="Adjust points"
        tone="ghost"
        onPress={() => navigation.navigate('ImpactAdjust', undefined)}
      />
    ) : undefined,
  }

  if (!caps.impact) {
    return (
      <NestedChrome {...chromeProps}>
        <EmptyState title="Impact Points" body="This isn’t enabled for your role yet." />
      </NestedChrome>
    )
  }

  if (overview.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading your score…" variant="dashboard" />
      </NestedChrome>
    )
  }
  if (overview.isError || !overview.data) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState
          message={isApiError(overview.error) ? overview.error.message : undefined}
          onRetry={() => overview.refetch()}
        />
      </NestedChrome>
    )
  }

  const data = overview.data
  const me = data.me || { totalPoints: 0 }
  const total = Number(me.totalPoints) || 0
  const weekly = Number(me.weeklyPoints) || 0
  const monthly = Number(me.monthlyPoints) || 0
  const myRank = data.top.findIndex((row) => row.user?._id === user?.id)

  // Whoever leads the monthly board is the champion in the running.
  const champion = [...data.top].sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0))[0]
  const championIsMe = champion?.user?._id === user?.id

  const nextLevel = data.achievements.find((level) => total < level.minPoints)
  const levelProgress = nextLevel ? Math.min(100, Math.round((total / nextLevel.minPoints) * 100)) : 100

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'board', label: 'Leaderboard' },
    ...(canManage ? [{ key: 'rules' as const, label: 'Rules' }] : []),
  ]

  const rows = (board.data || []).filter((row) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [row.user?.name, row.user?.role, row.user?.title]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const periodPointsOf = (row: { totalPoints: number; weeklyPoints: number; monthlyPoints: number }) =>
    period === 'weekly' ? row.weeklyPoints : period === 'monthly' ? row.monthlyPoints : row.totalPoints

  const rules = rulesQuery.data?.rules || []

  return (
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={tabs} value={tab} onChange={setTab} />

      <ScrollView
        contentContainerStyle={listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={overview.isRefetching || board.isRefetching || rulesQuery.isRefetching}
            onRefresh={() => {
              overview.refetch()
              if (tab === 'board') board.refetch()
              if (tab === 'rules') rulesQuery.refetch()
            }}
            tintColor={colors.accent}
          />
        }
      >
        {tab === 'overview' ? (
          <>
            {/* Score hero */}
            <SurfaceCard style={styles.scoreCard}>
              <Text style={styles.scoreEyebrow}>Your score</Text>
              <Text style={styles.scoreValue}>{total.toLocaleString('en-IN')}</Text>
              <Text style={styles.scoreLabel}>total points</Text>
              <View style={styles.heroMetrics}>
                <HeroMetric label="This week" value={weekly} />
                <HeroMetric label="This month" value={monthly} />
                <HeroMetric label="Rank" value={myRank >= 0 ? `#${myRank + 1}` : '—'} />
              </View>
            </SurfaceCard>

            {/* Achievement levels */}
            <SectionLabel count={data.badges.filter((b) => b.earned).length}>
              Achievement levels
            </SectionLabel>
            <SurfaceCard>
              {data.achievements.map((level, idx) => {
                const earned = data.badges.find((b) => b.key === level.key)?.earned
                return (
                  <View key={level.key} style={[styles.levelRow, idx > 0 && styles.rowBorder]}>
                    <View
                      style={[
                        styles.levelIcon,
                        { backgroundColor: earned ? colors.accentSoft : colors.surfaceRaised },
                      ]}
                    >
                      <Ionicons
                        name={BADGE_ICON[level.key] || 'ribbon-outline'}
                        size={17}
                        color={earned ? colors.accentHover : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.levelLabel, !earned && { color: colors.textSecondary }]}>
                        {level.label}
                      </Text>
                      <Text style={styles.meta}>
                        {level.description || `${level.minPoints.toLocaleString('en-IN')} points`}
                      </Text>
                    </View>
                    {earned ? (
                      <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                    ) : (
                      <Text style={styles.meta}>{level.minPoints.toLocaleString('en-IN')}</Text>
                    )}
                  </View>
                )
              })}
              {nextLevel ? (
                <View style={styles.nextLevel}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
                  </View>
                  <Text style={styles.meta}>
                    {`${(nextLevel.minPoints - total).toLocaleString('en-IN')} points to ${nextLevel.label}`}
                  </Text>
                </View>
              ) : null}
            </SurfaceCard>

            {/* Champion reward */}
            <SectionLabel>Company champion</SectionLabel>
            <SurfaceCard>
              <View style={styles.championHead}>
                <Pill label="Company Champion" color={colors.warning} bg={colors.warningSoft} />
                <Text style={styles.meta}>
                  {`${daysLeftInMonth()}d left in ${new Date().toLocaleString(undefined, { month: 'long' })}`}
                </Text>
              </View>
              <Text style={styles.championTitle}>Finish #1 this month & win the reward</Text>
              <Text style={styles.meta}>Top of the monthly impact board gets the company gift.</Text>
              <View style={styles.rewardRow}>
                <View style={[styles.levelIcon, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="gift-outline" size={17} color={colors.warning} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.levelLabel}>Amazon Gift Voucher</Text>
                  <Text style={styles.meta}>Awarded at month end</Text>
                </View>
              </View>
              {champion ? (
                <View style={styles.leaderRow}>
                  <Avatar name={champion.user?.name} uri={champion.user?.avatar} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.eyebrow}>Leading now</Text>
                    <Text style={styles.levelLabel} numberOfLines={1}>
                      {champion.user?.name}
                    </Text>
                  </View>
                  {championIsMe ? (
                    <Pill label="You" color={colors.accentHover} bg={colors.accentSoft} />
                  ) : null}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.leaderPoints}>
                      {(champion.monthlyPoints || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.meta}>pts this month</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.meta, { textAlign: 'center', paddingVertical: spacing.sm }]}>
                  Crown is up for grabs — no points this month yet.
                </Text>
              )}
            </SurfaceCard>

            {/* Trend */}
            <SectionLabel>
              {data.company.scope === 'company' ? '30-day trend (company)' : '30-day trend'}
            </SectionLabel>
            <SurfaceCard>
              <Sparkline data={data.company.trend} />
            </SurfaceCard>

            {/* Point sources */}
            <SectionLabel count={data.company.breakdown.length}>Point sources</SectionLabel>
            <SurfaceCard>
              {data.company.breakdown.length ? (
                data.company.breakdown.map((row, idx) => {
                  const max = Math.max(...data.company.breakdown.map((b) => Math.abs(b.points)), 1)
                  const pct = Math.round((Math.abs(row.points) / max) * 100)
                  const negative = row.points < 0
                  return (
                    <View key={row.category} style={[styles.sourceRow, idx > 0 && styles.rowBorder]}>
                      <View style={styles.sourceTop}>
                        <Text style={styles.levelLabel} numberOfLines={1}>
                          {CATEGORY_LABELS[row.category] || row.category}
                        </Text>
                        <Text
                          style={[styles.sourceValue, negative && { color: colors.danger }]}
                        >
                          {signedPoints(row.points)}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${pct}%`, backgroundColor: negative ? colors.danger : colors.accent },
                          ]}
                        />
                      </View>
                      <Text style={styles.meta}>{`${row.count} entr${row.count === 1 ? 'y' : 'ies'}`}</Text>
                    </View>
                  )
                })
              ) : (
                <Text style={styles.meta}>No points scored yet.</Text>
              )}
            </SurfaceCard>

            {/* Activity */}
            <SectionLabel count={data.company.timeline.length}>Activity</SectionLabel>
            <SurfaceCard>
              {data.company.timeline.length ? (
                data.company.timeline.slice(0, 20).map((t, idx) => (
                  <View key={t._id} style={[styles.timelineRow, idx > 0 && styles.rowBorder]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.timelineReason} numberOfLines={2}>
                        {t.reason}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[t.userId?.name, t.projectId?.name, timeAgo(t.createdAt)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.timelinePoints,
                        t.points < 0 && { color: colors.danger },
                      ]}
                    >
                      {signedPoints(t.points)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.meta}>Nothing scored recently.</Text>
              )}
            </SurfaceCard>
          </>
        ) : null}

        {tab === 'board' ? (
          <>
            <SegmentedControl
              options={PERIODS}
              value={period}
              onChange={setPeriod}
              inset={false}
              style={{ paddingHorizontal: 0 }}
            />
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search people or roles"
              inset={false}
            />

            {board.isLoading ? (
              <LoadingState label="Loading the board…" variant="list" />
            ) : board.isError ? (
              <ErrorState
                message={isApiError(board.error) ? board.error.message : undefined}
                onRetry={() => board.refetch()}
              />
            ) : !rows.length ? (
              <EmptyState
                icon="trophy-outline"
                title="No one on the board yet"
                body="Points appear here as work gets finished."
              />
            ) : (
              <>
                <SectionLabel count={rows.length}>
                  {`Ranked by ${PERIODS.find((p) => p.key === period)?.label.toLowerCase()} points`}
                </SectionLabel>
                {rows.map((row) => {
                  const isMe = row.user?._id === user?.id
                  return (
                    <SurfaceCard
                      key={row.user._id}
                      onPress={() =>
                        navigation.navigate('ImpactPerson', {
                          userId: row.user._id,
                          userName: row.user.name,
                        })
                      }
                      style={isMe ? { borderColor: colors.accent } : undefined}
                    >
                      <View style={styles.boardRow}>
                        <View
                          style={[
                            styles.rankBadge,
                            row.rank <= 3 && { backgroundColor: colors.accentSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rankText,
                              row.rank <= 3 && { color: colors.accentHover },
                            ]}
                          >
                            {row.rank}
                          </Text>
                        </View>
                        <Avatar name={row.user.name} uri={row.user.avatar} size={34} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.levelLabel} numberOfLines={1}>
                            {row.user.name}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {[roleLabel(row.user.role), row.user.title].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        {isMe ? <Pill label="You" color={colors.accentHover} bg={colors.accentSoft} /> : null}
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.leaderPoints}>
                            {periodPointsOf(row).toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.meta}>pts</Text>
                        </View>
                      </View>
                      {row.badges?.length ? (
                        <View style={styles.badgeRow}>
                          {row.badges.map((b) => (
                            <Ionicons
                              key={b}
                              name={BADGE_ICON[b] || 'ribbon-outline'}
                              size={14}
                              color={colors.accentHover}
                            />
                          ))}
                        </View>
                      ) : null}
                    </SurfaceCard>
                  )
                })}
              </>
            )}
          </>
        ) : null}

        {tab === 'rules' ? (
          <>
            <SectionLabel count={rules.length}>Company point rules</SectionLabel>
            <Text style={styles.meta}>
              Tune the weight and value of every automatic award. Changes apply to points earned from
              now on.
            </Text>
            {rules.map((rule) => (
              <SurfaceCard
                key={rule._id}
                onPress={() => navigation.navigate('ImpactRule', { ruleId: rule._id })}
              >
                <View style={styles.sourceTop}>
                  <Text style={styles.levelLabel} numberOfLines={1}>
                    {rule.label}
                  </Text>
                  <Text style={[styles.sourceValue, rule.points < 0 && { color: colors.danger }]}>
                    {signedPoints(rule.points)}
                  </Text>
                </View>
                <Text style={styles.meta} numberOfLines={2}>
                  {rule.description || CATEGORY_LABELS[rule.category] || rule.category}
                </Text>
                <View style={styles.badgeRow}>
                  <Pill
                    label={rule.enabled ? 'On' : 'Off'}
                    color={rule.enabled ? colors.success : colors.textMuted}
                    bg={rule.enabled ? colors.successSoft : colors.surfaceRaised}
                  />
                  <Pill label={rule.auto ? 'Automatic' : 'Manual'} />
                  <Pill label={`Weight ${rule.weight}`} />
                </View>
              </SurfaceCard>
            ))}
            {rulesQuery.isLoading ? (
              <LoadingState label="Loading rules…" variant="list" />
            ) : !rules.length ? (
              <EmptyState
                icon="options-outline"
                title="No rules configured"
                body="Default rules are created the first time impact runs for a workspace."
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function HeroMetric({ label, value }: { label: string; value: number | string }) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricValue}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    scoreCard: { alignItems: 'center', gap: 4, paddingVertical: 24, backgroundColor: c.accentSoft },
    scoreEyebrow: { ...typography.micro, color: c.accentHover, textTransform: 'uppercase', letterSpacing: 0.8 },
    scoreValue: { ...typography.h1, fontSize: 46, color: c.textPrimary },
    scoreLabel: { ...typography.caption, color: c.textSecondary },
    heroMetrics: {
      flexDirection: 'row',
      gap: spacing.xl,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    heroMetric: { alignItems: 'center', minWidth: 64 },
    heroMetricValue: { ...typography.h3, color: c.textPrimary },
    heroMetricLabel: { ...typography.micro, color: c.textSecondary },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
    levelIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelLabel: { ...typography.bodyStrong, color: c.textPrimary },
    eyebrow: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    meta: { ...typography.caption, color: c.textSecondary },
    nextLevel: { gap: 6, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    progressTrack: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: c.accent },
    championHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    championTitle: { ...typography.h3, color: c.textPrimary, marginTop: spacing.sm },
    rewardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.warningSoft,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    leaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surfaceRaised,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    leaderPoints: { ...typography.bodyStrong, color: c.textPrimary },
    sourceRow: { paddingVertical: 12, gap: 6 },
    sourceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    sourceValue: { ...typography.bodyStrong, color: c.accentHover },
    timelineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 12 },
    timelineReason: { ...typography.caption, color: c.textPrimary },
    timelinePoints: { ...typography.captionStrong, color: c.success },
    boardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: { ...typography.captionStrong, color: c.textSecondary },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  })
}
