import { useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { StatCard } from '../../components/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, typography } from '../../constants/theme'
import { inventoryApi } from '../../api/inventory'
import { isApiError } from '../../api/client'
import type { InventoryItem } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Inventory'>

export function InventoryScreen({ navigation }: Props) {
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)

  const summary = useQuery({ queryKey: ['inventory-summary'], queryFn: inventoryApi.summary })
  const items = useQuery({ queryKey: ['inventory-items'], queryFn: () => inventoryApi.items() })

  const moveMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'in' | 'out' }) => inventoryApi.move(id, { type, quantity: 1 }),
    onSettled: () => {
      setBusyId(null)
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
    },
    onError: (err) => Alert.alert('Could not update stock', isApiError(err) ? err.message : 'Try again'),
  })

  if (summary.isLoading || items.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading inventory…" />
      </Screen>
    )
  }
  if (summary.isError) {
    return (
      <Screen>
        <ErrorState message={isApiError(summary.error) ? summary.error.message : undefined} onRetry={() => summary.refetch()} />
      </Screen>
    )
  }

  const data = summary.data!
  const renderItem = ({ item }: { item: InventoryItem }) => {
    const low = item.quantity <= item.reorderLevel
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {low ? <Ionicons name="warning" size={16} color={colors.warning} /> : null}
        </View>
        <Text style={styles.meta}>
          {item.quantity} {item.unit} · {item.category}
          {item.location ? ` · ${item.location}` : ''}
        </Text>
        <Text style={styles.value}>{formatInr(item.quantity * item.unitCost)}</Text>
        <View style={styles.moveRow}>
          <Pressable
            style={[styles.moveBtn, { backgroundColor: colors.successSoft }]}
            disabled={busyId === item._id}
            onPress={() => {
              setBusyId(item._id)
              moveMutation.mutate({ id: item._id, type: 'in' })
            }}
          >
            <Text style={[styles.moveText, { color: colors.success }]}>+1 In</Text>
          </Pressable>
          <Pressable
            style={[styles.moveBtn, { backgroundColor: colors.dangerSoft }]}
            disabled={busyId === item._id || item.quantity <= 0}
            onPress={() => {
              setBusyId(item._id)
              moveMutation.mutate({ id: item._id, type: 'out' })
            }}
          >
            <Text style={[styles.moveText, { color: colors.danger }]}>-1 Out</Text>
          </Pressable>
          <Pressable style={styles.moveBtn} onPress={() => navigation.navigate('InventoryMovements')}>
            <Text style={styles.moveText}>History</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={items.data}
        keyExtractor={(i) => i._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={items.isRefetching || summary.isRefetching}
            onRefresh={() => {
              items.refetch()
              summary.refetch()
            }}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.statsGrid}>
            <StatCard label="Items" value={data.totals.items} />
            <StatCard label="Low stock" value={data.totals.lowStock} tone={data.totals.lowStock ? 'warning' : 'default'} />
            <StatCard label="Total units" value={data.totals.units} />
            <StatCard label="Stock value" value={formatInr(data.totals.value)} />
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState title="No inventory items yet" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.captionStrong, color: colors.accent },
  moveRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  moveBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceRaised },
  moveText: { ...typography.micro, color: colors.textSecondary, fontWeight: '700' },
})
