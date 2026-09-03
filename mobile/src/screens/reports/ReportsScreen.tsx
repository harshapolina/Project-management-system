import { useNavigation } from '@react-navigation/native'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMemo, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SectionLabel } from '../../components/SectionLabel'
import { BarChart, DonutChart } from '../../components/Charts'
import { Input } from '../../components/Input'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, stageLabel, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { reportsApi } from '../../api/reports'
import { isApiError } from '../../api/client'
import { exportCsv, todayStamp } from '../../lib/exportFile'
import { ROLE_LABELS } from '../../utils/roles'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'
import type { ReportsOverview } from '../../types/ops'

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'Reports'>,
  BottomTabNavigationProp<RootTabParamList>
>

type Tab = 'overview' | 'people' | 'projects'
type PeopleSort = 'overdue' | 'open' | 'rate'
type ProjectFilter = 'all' | 'risk' | 'ontrack'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'people', label: 'People' },
  { key: 'projects', label: 'Projects' },
]

const PEOPLE_SORT: { key: PeopleSort; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'open', label: 'Open' },
  { key: 'rate', label: 'Completion' },
]

const PROJECT_FILTERS: { key: ProjectFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'risk', label: 'At risk' },
  { key: 'ontrack', label: 'On track' },
]

function roleLabel(role?: string) {
  if (!role) return 'Member'
  return (
    (ROLE_LABELS as Record<string, string>)[role] ||
    role
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
  )
}

/** A project is "at risk" when it is flagged delayed or carries overdue tasks. */
function atRisk(p: ReportsOverview['projectHealth'][number]) {
  return p.isDelayed || p.overdue > 0
}

export function ReportsScreen() {
  const navigation = useNavigation<Nav>()
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [tab, setTab] = useState<Tab>('overview')
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [peopleSearch, setPeopleSearch] = useState('')
  const [peopleSort, setPeopleSort] = useState<PeopleSort>('overdue')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [projectSearch, setProjectSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: reportsApi.overview,
  })

  const openProject = (projectId: string, projectName?: string) => {
    navigation.navigate('Projects', {
      screen: 'ProjectOverview',
      params: { projectId, projectName },
    })
  }

  /**
   * "Ask reports" — the same deterministic keyword rules the web page uses.
   * It reads the numbers already on screen rather than calling out anywhere.
   */
  const answer = useMemo(() => {
    if (!asked.trim() || !data) return null
    const q = asked.toLowerCase()
    if (q.includes('risk') || q.includes('delay')) {
      return `${data.health.delayed} project(s) are delayed. On-time rate is ${data.health.onTimePct}%.`
    }
    if (q.includes('pipeline') || q.includes('crm')) {
      return `Open CRM pipeline value is ${formatInr(data.crmPipelineValue)}.`
    }
    if (q.includes('budget') || q.includes('variance')) {
      return `Portfolio budget variance (quoted − spent) is ${formatInr(data.budgetVariance)}.`
    }
    if (q.includes('team')) {
      const top = [...(data.teamPerf || [])].sort((a, b) => b.done - a.done)[0]
      return top
        ? `${top.user.name} leads completions with ${top.done} done, ${top.open} open, and a ${top.completionRate}% completion rate.`
        : 'No team data.'
    }
    if (q.includes('overdue')) {
      const ranked = [...(data.teamPerf || [])]
        .filter((person) => person.overdue > 0)
        .sort((a, b) => b.overdue - a.overdue)
      return ranked.length
        ? `${ranked[0].user.name} has the highest overdue workload (${ranked[0].overdue}). ${data.taskCompletion.overdue} tasks are overdue company-wide.`
        : 'There are no overdue assigned tasks.'
    }
    return 'Try: “which projects are at risk”, “pipeline value”, “budget variance”, “team performance”, or “overdue”.'
  }, [asked, data])

  const roles = useMemo(
    () => [...new Set((data?.teamPerf || []).map((t) => t.user.role))].filter(Boolean).sort(),
    [data?.teamPerf],
  )

  const people = useMemo(() => {
    const term = peopleSearch.trim().toLowerCase()
    return [...(data?.teamPerf || [])]
      .filter(({ user }) => {
        if (roleFilter !== 'all' && user.role !== roleFilter) return false
        if (!term) return true
        return [user.name, user.role].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      })
      .sort((a, b) => {
        if (peopleSort === 'open') return b.open - a.open || b.overdue - a.overdue
        if (peopleSort === 'rate') return b.completionRate - a.completionRate || b.done - a.done
        return b.overdue - a.overdue || b.open - a.open
      })
  }, [data?.teamPerf, peopleSearch, peopleSort, roleFilter])

  const projects = useMemo(() => {
    const term = projectSearch.trim().toLowerCase()
    return [...(data?.projectHealth || [])].filter((p) => {
      if (projectFilter === 'risk' && !atRisk(p)) return false
      if (projectFilter === 'ontrack' && atRisk(p)) return false
      if (!term) return true
      return String(p.name || '').toLowerCase().includes(term)
    })
  }, [data?.projectHealth, projectSearch, projectFilter])

  const exportPeople = async () => {
    if (!people.length) {
      Alert.alert('Nothing to export', 'No people match the current filters.')
      return
    }
    try {
      await exportCsv(`team-report-${todayStamp()}`, [
        ['Name', 'Role', 'Assigned', 'Done', 'Open', 'Overdue', 'Completion %', 'Tracked hours'],
        ...people.map((p) => [
          p.user.name,
          p.user.role,
          p.total,
          p.done,
          p.open,
          p.overdue,
          p.completionRate,
          p.trackedHours,
        ]),
      ])
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not write the file.')
    }
  }

  const exportProjects = async () => {
    if (!projects.length) {
      Alert.alert('Nothing to export', 'No projects match the current filters.')
      return
    }
    try {
      await exportCsv(`project-report-${todayStamp()}`, [
        ['Project', 'Status', 'Delayed', 'Budget', 'Spent', 'Tasks', 'Done', 'Overdue', 'Progress %'],
        ...projects.map((p) => [
          p.name,
          p.status,
          p.isDelayed ? 'Yes' : 'No',
          p.budget,
          p.spent,
          p.totalTasks,
          p.done,
          p.overdue,
          p.progress,
        ]),
      ])
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not write the file.')
    }
  }

  const chromeProps = {
    title: 'Reports',
    subtitle: 'Progress snapshot',
    subtitleIcon: 'bar-chart-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Crunching reports…" variant="dashboard" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const completionPct = data.taskCompletion?.total
    ? Math.round((data.taskCompletion.done / data.taskCompletion.total) * 100)
    : 0

  return (
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      <ScrollView
        contentContainerStyle={listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        {tab === 'overview' ? (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Projects on time" value={`${data.health.onTimePct}%`} />
              <StatCard
                label="Delayed projects"
                value={data.health.delayed}
                tone={data.health.delayed ? 'danger' : 'default'}
              />
              <StatCard
                label="Budget variance"
                value={formatInr(data.budgetVariance)}
                tone={data.budgetVariance < 0 ? 'danger' : 'success'}
              />
              <StatCard label="Pipeline value" value={formatInr(data.crmPipelineValue)} />
            </View>

            <View style={styles.section}>
              <SectionLabel>Ask reports</SectionLabel>
              <SurfaceCard>
                <Input
                  placeholder="e.g. which projects are at risk"
                  value={question}
                  onChangeText={setQuestion}
                  returnKeyType="search"
                  onSubmitEditing={() => setAsked(question)}
                />
                <View style={styles.askChips}>
                  {['at risk', 'pipeline value', 'budget variance', 'team performance', 'overdue'].map(
                    (preset) => (
                      <Pressable
                        key={preset}
                        style={styles.askChip}
                        onPress={() => {
                          setQuestion(preset)
                          setAsked(preset)
                        }}
                      >
                        <Text style={styles.askChipText}>{preset}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
                {answer ? <Text style={styles.answer}>{answer}</Text> : null}
              </SurfaceCard>
            </View>

            <View style={styles.section}>
              <SectionLabel>Task distribution</SectionLabel>
              <SurfaceCard>
                <DonutChart
                  slices={data.taskStatus.map((t) => ({
                    label: TASK_STATUS_LABELS[t.status] || t.status.replace('_', ' '),
                    value: t.count,
                    color: colors.status[t.status] || colors.textMuted,
                  }))}
                  centerValue={String(data.taskCompletion.total)}
                  centerLabel="tasks"
                />
                <Text style={styles.meta}>
                  {data.taskCompletion.unassigned} unassigned
                </Text>
              </SurfaceCard>
            </View>

            <View style={styles.section}>
              <SectionLabel>Completion</SectionLabel>
              <SurfaceCard>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Tasks finished</Text>
                  <Text style={styles.rowValue}>{completionPct}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(completionPct, 100)}%` }]} />
                </View>
                <Text style={styles.meta}>
                  {data.taskCompletion.done}/{data.taskCompletion.total} done ·{' '}
                  {data.taskCompletion.overdue} overdue · {data.taskCompletion.unassigned} unassigned
                </Text>
              </SurfaceCard>
            </View>

            <View style={styles.section}>
              <SectionLabel>Lead pipeline</SectionLabel>
              <SurfaceCard>
                {data.leadStages.some((s) => s.count > 0) ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                    <BarChart
                      bars={data.leadStages
                        .filter((s) => s.count > 0)
                        .map((s) => ({
                          label: stageLabel(s.stage).split(' ')[0],
                          value: s.count,
                        }))}
                    />
                  </ScrollView>
                ) : null}
                {data.leadStages
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <Pressable
                      key={s.stage}
                      style={styles.row}
                      onPress={() => navigation.navigate('Leads')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.rowLabel}>{stageLabel(s.stage)}</Text>
                      <Text style={styles.rowValue}>{s.count}</Text>
                    </Pressable>
                  ))}
              </SurfaceCard>
            </View>

            <View style={styles.section}>
              <SectionLabel>Vendor performance</SectionLabel>
              <View style={styles.statsGrid}>
                <StatCard label="Total POs" value={data.vendorPerformance.totalPOs} />
                <StatCard label="Delivered" value={data.vendorPerformance.delivered} tone="success" />
                <StatCard
                  label="In transit"
                  value={data.vendorPerformance.inTransit}
                  tone={data.vendorPerformance.inTransit ? 'warning' : 'default'}
                />
              </View>
            </View>
          </>
        ) : null}

        {tab === 'people' ? (
          <>
            <SearchField
              value={peopleSearch}
              onChangeText={setPeopleSearch}
              placeholder="Search people or roles"
              inset={false}
            />
            <SegmentedControl
              options={[{ key: 'all', label: 'All roles' }, ...roles.map((r) => ({ key: r, label: roleLabel(r) }))]}
              value={roleFilter}
              onChange={setRoleFilter}
              inset={false}
              style={{ paddingHorizontal: 0 }}
            />
            <SegmentedControl
              options={PEOPLE_SORT}
              value={peopleSort}
              onChange={setPeopleSort}
              inset={false}
              style={{ paddingHorizontal: 0 }}
            />

            <SectionLabel count={people.length} action="Export CSV" onAction={exportPeople}>
              Team performance
            </SectionLabel>

            {!people.length ? (
              <EmptyState
                icon="people-outline"
                title="No people match"
                body="Try another search or role filter."
              />
            ) : (
              people.map((p) => (
                <SurfaceCard key={p.user._id}>
                  <View style={styles.personTop}>
                    <Avatar name={p.user.name} uri={p.user.avatar} size={36} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        {p.user.name}
                      </Text>
                      <Text style={styles.meta}>{roleLabel(p.user.role)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.rateValue,
                        { color: p.completionRate >= 70 ? colors.success : colors.textPrimary },
                      ]}
                    >
                      {p.completionRate}%
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Metric label="Assigned" value={p.total} />
                    <Metric label="Done" value={p.done} />
                    <Metric label="Open" value={p.open} />
                    <Metric label="Overdue" value={p.overdue} danger={p.overdue > 0} />
                    <Metric label="Hours" value={p.trackedHours} />
                  </View>
                </SurfaceCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'projects' ? (
          <>
            <SearchField
              value={projectSearch}
              onChangeText={setProjectSearch}
              placeholder="Search projects"
              inset={false}
            />
            <SegmentedControl
              options={PROJECT_FILTERS}
              value={projectFilter}
              onChange={setProjectFilter}
              inset={false}
              style={{ paddingHorizontal: 0 }}
            />

            <SectionLabel count={projects.length} action="Export CSV" onAction={exportProjects}>
              Project health
            </SectionLabel>

            {!projects.length ? (
              <EmptyState
                icon="folder-outline"
                title="No projects match"
                body="Try another search or filter."
              />
            ) : (
              projects.map((p) => (
                <SurfaceCard key={p._id} onPress={() => openProject(p._id, p.name)}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.rowValue, p.isDelayed && { color: colors.danger }]}>
                      {p.progress}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(p.progress, 100)}%`,
                          backgroundColor: atRisk(p) ? colors.danger : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.pillRow}>
                    <Pill
                      label={atRisk(p) ? 'At risk' : 'On track'}
                      color={atRisk(p) ? colors.danger : colors.success}
                      bg={atRisk(p) ? colors.dangerSoft : colors.successSoft}
                    />
                    {p.budget ? <Pill label={`Budget ${formatInr(p.budget)}`} /> : null}
                    {p.spent ? <Pill label={`Spent ${formatInr(p.spent)}`} /> : null}
                  </View>
                  <Text style={styles.meta}>
                    {p.done}/{p.totalTasks} tasks done{p.overdue ? ` · ${p.overdue} overdue` : ''}
                  </Text>
                </SurfaceCard>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, danger && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    askChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    askChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    askChipText: { ...typography.micro, color: c.textSecondary },
    answer: { ...typography.body, color: c.textPrimary, marginTop: spacing.md },
    chartScroll: { marginBottom: spacing.md },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    section: { gap: spacing.sm },
    taskStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    taskStatusChip: {
      backgroundColor: c.surfaceRaised,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      minWidth: 80,
    },
    taskStatusValue: { ...typography.h3, color: c.textPrimary },
    taskStatusLabel: { ...typography.micro, color: c.textSecondary, textTransform: 'capitalize' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: spacing.sm },
    rowLabel: { ...typography.body, color: c.textPrimary, flexShrink: 1 },
    rowValue: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    personTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    rateValue: { ...typography.h3 },
    metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    metric: { minWidth: 56 },
    metricValue: { ...typography.bodyStrong, color: c.textPrimary },
    metricLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    progressTrack: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      overflow: 'hidden',
      marginVertical: 6,
    },
    progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: c.accent },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 6 },
  })
}
