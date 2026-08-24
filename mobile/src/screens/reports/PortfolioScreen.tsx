import { useNavigation } from '@react-navigation/native'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SectionLabel } from '../../components/SectionLabel'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { reportsApi } from '../../api/reports'
import { isApiError } from '../../api/client'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'Portfolio'>,
  BottomTabNavigationProp<RootTabParamList>
>

export function PortfolioScreen() {
  const navigation = useNavigation<Nav>()
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['portfolio'],
    queryFn: reportsApi.portfolio,
  })

  const openProject = (projectId: string, projectName?: string) => {
    navigation.navigate('Projects', {
      screen: 'ProjectOverview',
      params: { projectId, projectName },
    })
  }

  const pageHeader = (
    <PageHeader
      title="Portfolio"
      subtitle="All live work"
      subtitleIcon="grid-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading portfolio…" variant="dashboard" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Total projects" value={data.counts.total} />
          <StatCard label="Ongoing" value={data.counts.ongoing} />
          <StatCard label="Completed" value={data.counts.completed} tone="success" />
          <StatCard label="Delayed" value={data.counts.delayed} tone={data.counts.delayed ? 'danger' : 'default'} />
        </View>

        {data.delayAlerts.length ? (
          <View style={styles.section}>
            <SectionLabel count={data.delayAlerts.length}>Delay alerts</SectionLabel>
            {data.delayAlerts.map((a) => (
              <SurfaceCard
                key={a.id}
                style={{ borderColor: colors.danger }}
                onPress={a.id ? () => openProject(a.id, a.name) : undefined}
              >
                <Text style={styles.rowLabel}>{a.name}</Text>
                <Text style={styles.meta}>{a.location || a.stage}</Text>
              </SurfaceCard>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>Upcoming deadlines</SectionLabel>
          {data.upcomingDeadlines.length === 0 ? (
            <EmptyState title="Nothing due soon" body="No deadlines in the next two weeks." />
          ) : (
            <SurfaceCard>
              {data.upcomingDeadlines.map((t) => {
                const pid = t.projectId?._id
                return (
                  <Pressable
                    key={t._id}
                    style={styles.row}
                    onPress={pid ? () => openProject(pid, t.projectId?.name) : undefined}
                    accessibilityRole={pid ? 'button' : undefined}
                    disabled={!pid}
                  >
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={styles.meta}>{new Date(t.dueDate).toLocaleDateString()}</Text>
                  </Pressable>
                )
              })}
            </SurfaceCard>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Team workload</SectionLabel>
          <SurfaceCard>
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
          </SurfaceCard>
        </View>
      </ScrollView>
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    section: { gap: spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    rowLabel: { ...typography.body, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary },
    workloadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
    loadTrack: { height: 5, backgroundColor: c.surfaceRaised, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
    loadFill: { height: '100%', backgroundColor: c.accent },
  })
}
