import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, stageLabel, typography } from '../../constants/theme'
import { reportsApi } from '../../api/reports'
import { isApiError } from '../../api/client'

export function ReportsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: reportsApi.overview,
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Crunching reports…" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Projects on time" value={`${data.health.onTimePct}%`} />
          <StatCard label="Delayed projects" value={data.health.delayed} tone={data.health.delayed ? 'danger' : 'default'} />
          <StatCard label="Budget variance" value={formatInr(data.budgetVariance)} tone={data.budgetVariance < 0 ? 'danger' : 'success'} />
          <StatCard label="Pipeline value" value={formatInr(data.crmPipelineValue)} />
        </View>

        <View>
          <Text style={styles.sectionTitle}>Task status</Text>
          <View style={styles.taskStatusRow}>
            {data.taskStatus.map((t) => (
              <View key={t.status} style={styles.taskStatusChip}>
                <Text style={styles.taskStatusValue}>{t.count}</Text>
                <Text style={styles.taskStatusLabel}>{t.status.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Lead pipeline</Text>
          {data.leadStages.filter((s) => s.count > 0).map((s) => (
            <View key={s.stage} style={styles.row}>
              <Text style={styles.rowLabel}>{stageLabel(s.stage)}</Text>
              <Text style={styles.rowValue}>{s.count}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Project health</Text>
          {data.projectHealth.slice(0, 8).map((p) => (
            <Card key={p._id} style={{ gap: 4, marginBottom: spacing.sm }}>
              <View style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.rowValue, p.isDelayed && { color: colors.danger }]}>{p.progress}%</Text>
              </View>
              <Text style={styles.meta}>
                {p.done}/{p.totalTasks} tasks done{p.overdue ? ` · ${p.overdue} overdue` : ''}
              </Text>
            </Card>
          ))}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Team performance</Text>
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
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionTitle: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  taskStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  taskStatusChip: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', minWidth: 80 },
  taskStatusValue: { ...typography.h3, color: colors.textPrimary },
  taskStatusLabel: { ...typography.micro, color: colors.textSecondary, textTransform: 'capitalize' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { ...typography.body, color: colors.textPrimary, flexShrink: 1, textTransform: 'capitalize' },
  rowValue: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
})
