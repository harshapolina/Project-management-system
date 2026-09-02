import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatCard } from '../../components/StatCard'
import { Pill } from '../../components/Badge'
import { NavRow, NavSection } from '../../components/NavRow'
import { ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import { smartGoBack } from '../../navigation/openProject'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'
import type { Tenant } from '../../types/ops'

type Props = NativeStackScreenProps<PlatformStackParamList, 'PlatformOverview'>

function statusColor(c: AppColors) {
  return { trial: c.warning, active: c.success, suspended: c.danger, cancelled: c.danger }
}

function needsAttention(t: Tenant) {
  return t.status === 'suspended' || t.status === 'cancelled' || (t.seatsUsed ?? 0) >= (t.seatLimit ?? 30) * 0.9
}

export function PlatformOverviewScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const overviewQuery = useQuery({
    queryKey: ['platform-overview'],
    queryFn: platformApi.overview,
  })
  const tenantsQuery = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: platformApi.tenants,
  })

  const chromeProps = {
    title: "Platform",
    subtitle: "Editco admin overview",
    subtitleIcon: 'server-outline' as const,
    onBack: () => smartGoBack(navigation),
    right: (
      <Pressable onPress={() => navigation.navigate('PlatformSettings')} hitSlop={8} accessibilityRole="button">
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
    ),
  }

  if (overviewQuery.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading overview…" variant="dashboard" />
      </NestedChrome>
    )
  }
  if (overviewQuery.isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState
          message={isApiError(overviewQuery.error) ? overviewQuery.error.message : undefined}
          onRetry={() => overviewQuery.refetch()}
        />
      </NestedChrome>
    )
  }

  const overview = overviewQuery.data!
  const tenants = tenantsQuery.data || []
  const attention = tenants.filter(needsAttention)
  const isRefetching = overviewQuery.isRefetching || tenantsQuery.isRefetching
  const refetch = () => {
    overviewQuery.refetch()
    tenantsQuery.refetch()
  }

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Companies" value={overview.companies} icon="business-outline" />
          <StatCard label="Active users" value={overview.activeUsers} icon="people-outline" />
          <StatCard label="Projects" value={overview.totalProjects} icon="folder-outline" />
          <StatCard
            label="Active subs"
            value={overview.byStatus?.active ?? 0}
            tone="success"
            icon="card-outline"
          />
        </View>

        <SectionLabel>Subscription breakdown</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {[
            ['Active', overview.byStatus?.active],
            ['Trial', overview.byStatus?.trial],
            ['Suspended', overview.byStatus?.suspended],
            ['Cancelled', overview.byStatus?.cancelled],
          ].map(([label, count]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.meta}>{label}</Text>
              <Text style={styles.value}>{count ?? 0}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SectionLabel>Plans in use</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {[
            ['Starter', overview.byPlan?.starter],
            ['Pro', overview.byPlan?.pro],
            ['Enterprise', overview.byPlan?.enterprise],
          ].map(([label, count]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.meta}>{label}</Text>
              <Text style={styles.value}>{count ?? 0}</Text>
            </View>
          ))}
        </SurfaceCard>

        {attention.length > 0 ? (
          <>
            <SectionLabel count={attention.length}>Needs attention</SectionLabel>
            <SurfaceCard style={styles.blockGap}>
              {attention.map((t) => (
                <Pressable
                  key={t._id}
                  style={styles.attentionRow}
                  onPress={() => navigation.navigate('TenantDetail', { tenantId: t._id })}
                >
                  <Text style={styles.attentionName} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Pill
                    label={t.status}
                    color={statusColor(colors)[t.status]}
                    bg={`${statusColor(colors)[t.status]}22`}
                  />
                </Pressable>
              ))}
            </SurfaceCard>
          </>
        ) : null}

        <NavSection title="Manage">
          <NavRow
            icon="business-outline"
            label="Companies"
            hint="Workspaces & tenants"
            tone={0}
            onPress={() => navigation.navigate('PlatformCompanies')}
          />
          <NavRow
            icon="card-outline"
            label="Subscriptions"
            hint="Cancel or reactivate"
            tone={1}
            onPress={() => navigation.navigate('PlatformSubscriptions')}
          />
          <NavRow
            icon="people-outline"
            label="All users"
            hint="Search across companies"
            tone={2}
            onPress={() => navigation.navigate('PlatformUsers')}
          />
          <NavRow
            icon="toggle-outline"
            label="Feature plans"
            hint="Apply bundles & toggles"
            tone={3}
            onPress={() => navigation.navigate('PlatformFeatures')}
          />
          <NavRow
            icon="settings-outline"
            label="Settings"
            hint="Platform login info"
            tone={4}
            last
            onPress={() => navigation.navigate('PlatformSettings')}
          />
        </NavSection>
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    blockGap: { gap: spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    meta: { ...typography.body, color: c.textSecondary },
    value: { ...typography.bodyStrong, color: c.textPrimary },
    attentionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: 4,
    },
    attentionName: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
  })
}
