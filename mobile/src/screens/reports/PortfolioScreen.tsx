import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { ErrorState, LoadingState } from '../../components/States'
import { colors, spacing, typography } from '../../constants/theme'
import { reportsApi } from '../../api/reports'
import { isApiError } from '../../api/client'

export function PortfolioScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['portfolio'],
    queryFn: reportsApi.portfolio,
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading portfolio…" />
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
          <StatCard label="Total projects" value={data.counts.total} />
          <StatCard label="Ongoing" value={data.counts.ongoing} />
          <StatCard label="Completed" value={data.counts.completed} tone="success" />
          <StatCard label="Delayed" value={data.counts.delayed} tone={data.counts.delayed ? 'danger' : 'default'} />
        </View>

        {data.delayAlerts.length ? (
          <View>
            <Text style={styles.sectionTitle}>Delay alerts</Text>
            {data.delayAlerts.map((a) => (
              <Card key={a.id} style={{ marginBottom: spacing.sm, borderColor: colors.danger }}>
                <Text style={styles.rowLabel}>{a.name}</Text>
                <Text style={styles.meta}>{a.location || a.stage}</Text>
              </Card>
            ))}
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>Upcoming deadlines</Text>
          {data.upcomingDeadlines.length === 0 ? (
            <Text style={styles.meta}>Nothing due in the next two weeks.</Text>
          ) : (
            data.upcomingDeadlines.map((t) => (
              <View key={t._id} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={styles.meta}>{new Date(t.dueDate).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Team workload</Text>
          {data.workload.map((w) => (
            <View key={w.user._id} style={styles.workloadRow}>
              <Avatar name={w.user.name} uri={w.user.avatar} size={30} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {w.user.name}
                </Text>
                <View style={styles.loadTrack}>
                  <View style={[styles.loadFill, { width: `${Math.min(100, w.load)}%` }]} />
                </View>
              </View>
              <Text style={styles.meta}>{w.openTasks} open</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
  workloadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  loadTrack: { height: 5, backgroundColor: colors.surfaceRaised, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  loadFill: { height: '100%', backgroundColor: colors.accent },
})
