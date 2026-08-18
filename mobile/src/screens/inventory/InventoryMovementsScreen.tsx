import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { inventoryApi } from '../../api/inventory'
import { isApiError } from '../../api/client'

const TYPE_COLOR = { in: colors.success, out: colors.danger, adjust: colors.accent }

export function InventoryMovementsScreen() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => inventoryApi.movements(),
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading movements…" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(m) => m._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const itemName = typeof item.itemId === 'object' ? item.itemId?.name : 'Item'
          return (
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
                color={TYPE_COLOR[item.type]}
                bg={`${TYPE_COLOR[item.type]}22`}
              />
            </View>
          )
        }}
        ListEmptyComponent={<EmptyState title="No stock movements yet" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
})
