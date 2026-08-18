import { useLayoutEffect } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, typography } from '../../constants/theme'
import { purchaseOrdersApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import type { POStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'PurchaseOrders'>

const STATUS_COLOR: Record<POStatus, string> = {
  draft: colors.textMuted,
  approved: colors.accent,
  ordered: colors.accent,
  in_transit: colors.warning,
  delivered: colors.success,
}

export function PurchaseOrdersScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params || {}

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Purchase Orders` : 'Purchase Orders' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['purchase-orders', projectId ?? 'all'],
    queryFn: () => purchaseOrdersApi.list(projectId ? { projectId } : undefined),
  })

  return (
    <Screen padded={false}>
      {isLoading ? (
        <LoadingState label="Loading purchase orders…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(po) => po._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const vendorName = typeof item.vendor === 'object' ? item.vendor?.name : undefined
            const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.poNumber} numberOfLines={1}>
                    {item.poNumber}
                  </Text>
                  <Pill label={item.status.replace('_', ' ')} color={STATUS_COLOR[item.status]} bg={`${STATUS_COLOR[item.status]}22`} />
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {[vendorName, pName].filter(Boolean).join(' · ') || 'No vendor set'}
                </Text>
                <Text style={styles.value}>{formatInr(item.value)}</Text>
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState title="No purchase orders yet" body="Raise a PO once BOQ items are approved." />}
        />
      )}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePurchaseOrder', { projectId, projectName })}
        accessibilityLabel="New purchase order"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  poNumber: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.h3, color: colors.accent },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
})
