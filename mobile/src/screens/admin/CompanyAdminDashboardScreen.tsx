import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, spacing, typography } from '../../constants/theme'
import { companyAdminApi } from '../../api/companyAdmin'
import { isApiError } from '../../api/client'

export function CompanyAdminDashboardScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['company-admin-dashboard'],
    queryFn: () => companyAdminApi.dashboard('30d'),
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading dashboard…" />
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
        <Text style={styles.rangeLabel}>Last 30 days</Text>

        <View style={styles.statsGrid}>
          <StatCard label="Total projects" value={data.kpis.totalProjects} />
          <StatCard label="Active leads" value={data.kpis.activeLeads} />
          <StatCard label="Pipeline value" value={formatInr(data.kpis.pipelineValue)} />
          <StatCard
            label="Budget utilization"
            value={data.kpis.budgetUtilization != null ? `${data.kpis.budgetUtilization}%` : '—'}
            tone={data.kpis.budgetUtilization != null && data.kpis.budgetUtilization > 90 ? 'warning' : 'default'}
          />
        </View>

        <View>
          <Text style={styles.sectionTitle}>Project status</Text>
          {data.statusOverview.map((row) => (
            <View key={row.key} style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: row.color }]} />
              <Text style={styles.statusLabel}>{row.label}</Text>
              <Text style={styles.statusValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Card style={{ gap: 6 }}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.row}>
            <Text style={styles.meta}>Total budget</Text>
            <Text style={styles.value}>{formatInr(data.budget.totalBudget)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.meta}>Total spent</Text>
            <Text style={styles.value}>{formatInr(data.budget.totalSpent)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.meta}>Committed</Text>
            <Text style={styles.value}>{formatInr(data.budget.committedAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.meta}>Pending expenses</Text>
            <Text style={styles.value}>{formatInr(data.budget.pendingAmount)}</Text>
          </View>
        </Card>

        <View>
          <Text style={styles.sectionTitle}>Top vendors</Text>
          {data.topVendors.length === 0 ? (
            <Text style={styles.meta}>No vendor activity yet.</Text>
          ) : (
            data.topVendors.map((v) => (
              <View key={v.id} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {v.name}
                </Text>
                <Text style={styles.value}>{formatInr(v.value)}</Text>
              </View>
            ))
          )}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {data.activity.slice(0, 10).map((a) => (
            <Text key={a.id} style={styles.activityLine} numberOfLines={2}>
              {a.message}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  rangeLabel: { ...typography.caption, color: colors.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionTitle: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  statusValue: { ...typography.bodyStrong, color: colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.captionStrong, color: colors.textPrimary },
  activityLine: { ...typography.caption, color: colors.textSecondary, marginBottom: 6 },
})
