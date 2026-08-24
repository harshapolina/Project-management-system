import { useNavigation } from '@react-navigation/native'
import { useMemo } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { inventoryApi } from '../../api/inventory'
import { isApiError } from '../../api/client'

function typeColorMap(c: AppColors) {
  return { in: c.success, out: c.danger, adjust: c.accent }
}

export function InventoryMovementsScreen() {
  const navigation = useNavigation()
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => inventoryApi.movements(),
  })

  const pageHeader = (
    <PageHeader
      title="Stock log"
      subtitle="In and out movements"
      subtitleIcon="time-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading movements…" variant="list" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const movements = data || []

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <FlatList
        data={movements}
        keyExtractor={(m) => m._id}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          movements.length > 0 ? <SectionLabel count={movements.length}>Movements</SectionLabel> : null
        }
        renderItem={({ item }) => {
          const itemName = typeof item.itemId === 'object' ? item.itemId?.name : 'Item'
          return (
            <SurfaceCard>
              <View style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {itemName}
                  </Text>
                  <Text style={styles.meta}>
                    Balance {item.balanceAfter} · {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Pill
                  label={`${item.type} ${item.quantity}`}
                  color={typeColorMap(colors)[item.type]}
                  bg={`${typeColorMap(colors)[item.type]}22`}
                />
              </View>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={<EmptyState title="No stock movements yet" />}
      />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
  })
}
