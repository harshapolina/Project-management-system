import { useNavigation } from '@react-navigation/native'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SectionLabel } from '../../components/SectionLabel'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, stageLabel, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { reportsApi } from '../../api/reports'
import { isApiError } from '../../api/client'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'Reports'>,
  BottomTabNavigationProp<RootTabParamList>
>

export function ReportsScreen() {
  const navigation = useNavigation<Nav>()
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

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

  const chromeProps = {
    title: "Reports",
    subtitle: "Progress snapshot",
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

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Projects on time" value={`${data.health.onTimePct}%`} />
          <StatCard label="Delayed projects" value={data.health.delayed} tone={data.health.delayed ? 'danger' : 'default'} />
          <StatCard label="Budget variance" value={formatInr(data.budgetVariance)} tone={data.budgetVariance < 0 ? 'danger' : 'success'} />
          <StatCard label="Pipeline value" value={formatInr(data.crmPipelineValue)} />
        </View>

        <View style={styles.section}>
          <SectionLabel>Task status</SectionLabel>
          <View style={styles.taskStatusRow}>
            {data.taskStatus.map((t) => (
              <View key={t.status} style={styles.taskStatusChip}>
                <Text style={styles.taskStatusValue}>{t.count}</Text>
                <Text style={styles.taskStatusLabel}>{t.status.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Lead pipeline</SectionLabel>
          <SurfaceCard>
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
          <SectionLabel>Project health</SectionLabel>
          {data.projectHealth.slice(0, 8).map((p) => (
            <SurfaceCard key={p._id} onPress={() => openProject(p._id, p.name)}>
              <View style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.rowValue, p.isDelayed && { color: colors.danger }]}>{p.progress}%</Text>
              </View>
              <Text style={styles.meta}>
                {p.done}/{p.totalTasks} tasks done{p.overdue ? ` · ${p.overdue} overdue` : ''}
              </Text>
            </SurfaceCard>
          ))}
        </View>

        <View style={styles.section}>
          <SectionLabel>Team performance</SectionLabel>
          <SurfaceCard>
            {data.teamPerf
              .filter((t) => t.total > 0)
              .slice(0, 10)
              .map((t) => (
                <View key={t.user._id} style={styles.teamRow}>
                  <Avatar name={t.user.name} uri={t.user.avatar} size={30} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {t.user.name}
                    </Text>
                    <Text style={styles.meta}>
                      {t.done}/{t.total} done · {t.completionRate}%
                    </Text>
                  </View>
                </View>
              ))}
          </SurfaceCard>
        </View>
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
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
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    rowLabel: { ...typography.body, color: c.textPrimary, flexShrink: 1, textTransform: 'capitalize' },
    rowValue: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  })
}
