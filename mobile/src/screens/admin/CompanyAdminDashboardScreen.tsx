import { useNavigation } from '@react-navigation/native'
import { useMemo } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatCard } from '../../components/StatCard'
import { ErrorState, LoadingState } from '../../components/States'
import { formatInr, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { companyAdminApi } from '../../api/companyAdmin'
import { isApiError } from '../../api/client'

export function CompanyAdminDashboardScreen() {
  const navigation = useNavigation()
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['company-admin-dashboard'],
    queryFn: () => companyAdminApi.dashboard('30d'),
  })

  const pageHeader = (
    <>
      <AppNavBar />
    <PageHeader
      title="Company"
      subtitle="Team overview"
      subtitleIcon="stats-chart-outline"
      onBack={() => navigation.goBack()}
    />
    </>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading dashboard…" variant="dashboard" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {pageHeader}
      <ScrollView
        contentContainerStyle={listContent}
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

        <SectionLabel>Project status</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {data.statusOverview.map((row) => (
            <View key={row.key} style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: row.color }]} />
              <Text style={styles.statusLabel}>{row.label}</Text>
              <Text style={styles.statusValue}>{row.value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SectionLabel>Budget</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
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
        </SurfaceCard>

        <SectionLabel count={data.topVendors.length}>Top vendors</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
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
        </SurfaceCard>

        <SectionLabel>Recent activity</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {data.activity.slice(0, 10).map((a) => (
            <Text key={a.id} style={styles.activityLine} numberOfLines={2}>
              {a.message}
            </Text>
          ))}
        </SurfaceCard>
      </ScrollView>
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    rangeLabel: { ...typography.caption, color: c.textMuted },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    blockGap: { gap: spacing.sm },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    statusLabel: { ...typography.body, color: c.textPrimary, flex: 1 },
    statusValue: { ...typography.bodyStrong, color: c.textPrimary },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, gap: spacing.sm },
    rowLabel: { ...typography.body, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary },
    value: { ...typography.captionStrong, color: c.textPrimary },
    activityLine: { ...typography.caption, color: c.textSecondary },
  })
}
