import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { Button } from '../../components/Button'
import { ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import { SUBSCRIPTION_PLANS } from '../../utils/tenantFeatures'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'
import type { Tenant } from '../../types/ops'

type Props = NativeStackScreenProps<PlatformStackParamList, 'PlatformSubscriptions'>

const STATUS_ORDER = ['active', 'trial', 'suspended', 'cancelled'] as const

function statusColor(c: AppColors) {
  return { trial: c.warning, active: c.success, suspended: c.danger, cancelled: c.danger }
}

export function PlatformSubscriptionsScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: platformApi.tenants,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => platformApi.cancelSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-overview'] })
    },
    onError: (err) => Alert.alert('Could not cancel', isApiError(err) ? err.message : 'Try again'),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => platformApi.reactivateSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-overview'] })
    },
    onError: (err) => Alert.alert('Could not reactivate', isApiError(err) ? err.message : 'Try again'),
  })

  const chromeProps = {
    title: "Subscriptions",
    subtitle: "Billing & access",
    subtitleIcon: 'card-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading subscriptions…" variant="list" />
      </NestedChrome>
    )
  }
  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const tenants = data || []
  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tenants.filter((t) => t.status === status)
      return acc
    },
    {} as Record<(typeof STATUS_ORDER)[number], Tenant[]>,
  )

  const sections = STATUS_ORDER.flatMap((status) => {
    const items = grouped[status]
    if (items.length === 0) return [{ type: 'header' as const, status, count: 0 }]
    return [
      { type: 'header' as const, status, count: items.length },
      ...items.map((tenant) => ({ type: 'tenant' as const, status, tenant })),
    ]
  })

  const busy = cancelMutation.isPending || reactivateMutation.isPending

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={sections}
        keyExtractor={(item, index) =>
          item.type === 'header' ? `header-${item.status}` : `tenant-${item.tenant._id}-${index}`
        }
        contentContainerStyle={listContent}
        ListFooterComponent={
          <>
            <SectionLabel>Available plans</SectionLabel>
            <View style={styles.planGrid}>
              {SUBSCRIPTION_PLANS.map((p) => (
                <SurfaceCard key={p.value} style={styles.planCard}>
                  <Text style={styles.planLabel}>{p.label}</Text>
                  <Text style={styles.planMeta}>
                    {tenants.filter((t) => (t.subscriptionPlan || 'pro') === p.value).length} companies
                  </Text>
                </SurfaceCard>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Pill
                  label={item.status}
                  color={statusColor(colors)[item.status]}
                  bg={`${statusColor(colors)[item.status]}22`}
                />
                <Text style={styles.sectionCount}>({item.count})</Text>
              </View>
            )
          }

          const { tenant, status } = item
          const cancelled = status === 'cancelled' || !!tenant.cancelledAt

          return (
            <SurfaceCard style={styles.tenantCard}>
              <Text style={styles.name}>{tenant.name}</Text>
              <Text style={styles.meta}>
                {tenant.subscriptionPlan || 'pro'} plan · {tenant.seatsUsed}/{tenant.seatLimit} seats
                {tenant.cancelledAt
                  ? ` · cancelled ${new Date(tenant.cancelledAt).toLocaleDateString()}`
                  : ''}
              </Text>
              <View style={styles.actions}>
                <Button
                  title="Manage"
                  variant="secondary"
                  onPress={() => navigation.navigate('TenantDetail', { tenantId: tenant._id })}
                />
                {cancelled ? (
                  <Button
                    title="Reactivate"
                    onPress={() => reactivateMutation.mutate(tenant._id)}
                    loading={busy}
                  />
                ) : (
                  <Button
                    title="Cancel"
                    variant="danger"
                    onPress={() =>
                      Alert.alert(
                        'Cancel subscription',
                        `Cancel subscription for ${tenant.name}?`,
                        [
                          { text: 'Keep', style: 'cancel' },
                          { text: 'Cancel subscription', style: 'destructive', onPress: () => cancelMutation.mutate(tenant._id) },
                        ],
                      )
                    }
                    loading={busy}
                  />
                )}
              </View>
            </SurfaceCard>
          )
        }}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionCount: { ...typography.caption, color: c.textMuted },
    tenantCard: { gap: spacing.sm, marginBottom: spacing.sm },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
    planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    planCard: { flexGrow: 1, flexBasis: '30%', minWidth: 100 },
    planLabel: { ...typography.bodyStrong, color: c.textPrimary, textTransform: 'capitalize' },
    planMeta: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
  })
}
