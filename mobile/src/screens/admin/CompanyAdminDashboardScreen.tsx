import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { ActionSheetIOS, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { IconButton } from '../../components/IconButton'
import { NavRow, NavSection } from '../../components/NavRow'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatCard } from '../../components/StatCard'
import { ErrorState, LoadingState } from '../../components/States'
import { formatInr, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { companyAdminApi } from '../../api/companyAdmin'
import { isApiError } from '../../api/client'
import { openMoreScreen, type TabNavigation } from '../../navigation/openProject'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'CompanyAdminDashboard'>,
  BottomTabNavigationProp<RootTabParamList>
>

function statusDotColor(key: string, colors: ReturnType<typeof useColors>): string {
  const map: Record<string, string> = {
    in_progress: colors.status.in_progress,
    completed: colors.status.completed,
    done: colors.status.done,
    delayed: colors.status.delayed,
    on_hold: colors.status.on_hold,
    planning: colors.status.not_started,
  }
  return map[key] || colors.textMuted
}

export function CompanyAdminDashboardScreen({ navigation }: { navigation: Nav }) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const tabNav = navigation as unknown as Nav

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['company-admin-dashboard'],
    queryFn: () => companyAdminApi.dashboard('30d'),
  })

  const goMore = (screen: keyof MoreStackParamList, params?: Record<string, unknown>) => {
    openMoreScreen(tabNav as unknown as TabNavigation, screen, params)
  }

  const openSettings = () => {
    const options = [
      { label: 'Approvals', onPress: () => goMore('Approvals') },
      { label: 'People & access', onPress: () => goMore('ProfileHub', { screen: 'People' }) },
      { label: 'Custom fields', onPress: () => goMore('CustomFields') },
      { label: 'Reports', onPress: () => goMore('Reports') },
      { label: 'Cancel', onPress: () => undefined },
    ]

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: options.map((o) => o.label),
          cancelButtonIndex: options.length - 1,
          title: 'Company settings',
        },
        (index) => options[index]?.onPress(),
      )
      return
    }

    Alert.alert(
      'Company settings',
      undefined,
      options.map((o, i) => ({
        text: o.label,
        style: i === options.length - 1 ? 'cancel' : 'default',
        onPress: o.onPress,
      })),
    )
  }

  const chromeProps = {
    title: 'Company',
    subtitle: 'Team overview',
    subtitleIcon: 'stats-chart-outline' as const,
    right: (
      <IconButton icon="settings-outline" label="Company settings" tone="ghost" onPress={openSettings} />
    ),
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading dashboard…" variant="dashboard" />
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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.rangeLabel}>Last 30 days</Text>

        <View style={styles.statsGrid}>
          {[
            {
              key: 'projects',
              label: 'Total projects',
              value: data.kpis.totalProjects,
              icon: 'folder-outline' as const,
              onPress: () => tabNav.navigate('Projects', { screen: 'ProjectsList' }),
            },
            {
              key: 'leads',
              label: 'Active leads',
              value: data.kpis.activeLeads,
              icon: 'people-outline' as const,
              onPress: () => goMore('Leads'),
            },
            {
              key: 'pipeline',
              label: 'Pipeline value',
              value: formatInr(data.kpis.pipelineValue),
              icon: 'trending-up-outline' as const,
              onPress: () => goMore('Leads'),
            },
            {
              key: 'budget',
              label: 'Budget utilization',
              value: data.kpis.budgetUtilization != null ? `${data.kpis.budgetUtilization}%` : '—',
              icon: 'wallet-outline' as const,
              tone:
                data.kpis.budgetUtilization != null && data.kpis.budgetUtilization > 90
                  ? ('warning' as const)
                  : ('default' as const),
              onPress: () => goMore('Finance'),
            },
          ].map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              tone={'tone' in stat ? stat.tone : 'default'}
              onPress={stat.onPress}
            />
          ))}
        </View>

        <SectionLabel>Project status</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {data.statusOverview.map((row, index) => (
            <View key={row.key || `status-${index}`} style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: statusDotColor(row.key, colors) }]} />
              <Text style={styles.statusLabel}>{row.label}</Text>
              <Text style={styles.statusValue}>{row.value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SectionLabel
          action="Open finance"
          onAction={() => goMore('Finance')}
        >
          Budget
        </SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {[
            { key: 'budget', label: 'Total budget', value: formatInr(data.budget.totalBudget) },
            { key: 'spent', label: 'Total spent', value: formatInr(data.budget.totalSpent) },
            { key: 'committed', label: 'Committed', value: formatInr(data.budget.committedAmount) },
            { key: 'pending', label: 'Pending expenses', value: formatInr(data.budget.pendingAmount) },
          ].map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={styles.meta}>{row.label}</Text>
              <Text style={styles.value}>{row.value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SectionLabel count={data.topVendors.length}>Top vendors</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {data.topVendors.length === 0 ? (
            <Text style={styles.meta}>No vendor activity yet.</Text>
          ) : (
            data.topVendors.map((v, index) => (
              <View key={v.id || `vendor-${index}`} style={styles.row}>
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
          {data.activity.slice(0, 10).map((a, index) => (
            <Text key={a.id || `activity-${index}`} style={styles.activityLine} numberOfLines={2}>
              {a.message}
            </Text>
          ))}
        </SurfaceCard>

        <NavSection title="Quick links">
          <NavRow
            icon="shield-checkmark-outline"
            label="Approvals"
            hint="Routing rules"
            tone={0}
            onPress={() => goMore('Approvals')}
          />
          <NavRow
            icon="people-outline"
            label="People"
            hint="Team and access"
            tone={1}
            onPress={() => goMore('ProfileHub', { screen: 'People' })}
          />
          <NavRow
            icon="bar-chart-outline"
            label="Reports"
            hint="Progress snapshot"
            tone={2}
            onPress={() => goMore('Reports')}
          />
          <NavRow
            icon="grid-outline"
            label="Portfolio"
            hint="All live work"
            tone={3}
            last
            onPress={() => goMore('Portfolio')}
          />
        </NavSection>
      </ScrollView>
    </NestedChrome>
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
