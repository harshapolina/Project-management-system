import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SectionLabel } from '../../components/SectionLabel'
import { StatCard } from '../../components/StatCard'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Fab } from '../../components/Fab'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { inventoryApi } from '../../api/inventory'
import { isApiError } from '../../api/client'
import type { InventoryItem } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Inventory'>

export function InventoryScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

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

  const chromeProps = {
    title: "Inventory",
    subtitle: "Stock on hand",
    subtitleIcon: 'cube-outline' as const,
  }

  if (summary.isLoading || items.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading inventory…" variant="dashboard" />
      </NestedChrome>
    )
  }
  if (summary.isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(summary.error) ? summary.error.message : undefined} onRetry={() => summary.refetch()} />
      </NestedChrome>
    )
  }

  const data = summary.data!
  const list = items.data || []
  const renderItem = ({ item }: { item: InventoryItem }) => {
    const low = item.quantity <= item.reorderLevel
    return (
      <SurfaceCard>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {low ? <Ionicons name="warning-outline" size={16} color={colors.warning} /> : null}
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
      </SurfaceCard>
    )
  }

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={list}
        keyExtractor={(i) => i._id}
        contentContainerStyle={listContent}
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
          <View style={{ gap: spacing.md }}>
            <View style={styles.statsGrid}>
              <StatCard label="Items" value={data.totals.items} />
              <StatCard label="Low stock" value={data.totals.lowStock} tone={data.totals.lowStock ? 'warning' : 'default'} />
              <StatCard label="Total units" value={data.totals.units} />
              <StatCard label="Stock value" value={formatInr(data.totals.value)} />
            </View>
            {list.length > 0 ? <SectionLabel count={list.length}>Items</SectionLabel> : null}
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            title="No inventory items yet"
            body="Add materials and stock levels to track on hand."
            action="Add item"
            onAction={() => navigation.navigate('CreateInventoryItem')}
          />
        }
      />
      <Fab label="Add item" onPress={() => navigation.navigate('CreateInventoryItem')} />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    value: { ...typography.captionStrong, color: c.accent, marginTop: 2 },
    moveRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 8 },
    moveBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: c.surfaceRaised },
    moveText: { ...typography.micro, color: c.textSecondary, fontWeight: '700' },
  })
}
