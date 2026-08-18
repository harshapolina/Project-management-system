import { useLayoutEffect } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, typography } from '../../constants/theme'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { QuotationStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'BoqList'>

const STATUS_COLOR: Record<QuotationStatus, string> = {
  draft: colors.textMuted,
  sent: colors.accent,
  viewed: colors.accent,
  approved: colors.success,
  rejected: colors.danger,
}

export function BoqListScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params || {}

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · BOQ` : 'BOQ / Quotes' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['quotations', projectId ?? 'all'],
    queryFn: () => boqApi.list(projectId ? { projectId } : undefined),
  })

  return (
    <Screen padded={false}>
      {isLoading ? (
        <LoadingState label="Loading quotations…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(q) => q._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
            return (
              <Pressable style={styles.card} onPress={() => navigation.navigate('BoqDetail', { quotationId: item._id })}>
                <View style={styles.cardTop}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Pill label={item.status} color={STATUS_COLOR[item.status]} bg={`${STATUS_COLOR[item.status]}22`} />
                </View>
                {pName ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {pName}
                  </Text>
                ) : null}
                <Text style={styles.total}>{formatInr(item.grandTotal)}</Text>
                <Text style={styles.itemCount}>{item.items.length} line items</Text>
              </Pressable>
            )
          }}
          ListEmptyComponent={<EmptyState title="No quotations yet" body="Create a BOQ to start quoting." />}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBoq', { projectId, projectName })}
        accessibilityLabel="New quotation"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
  total: { ...typography.h3, color: colors.accent },
  itemCount: { ...typography.caption, color: colors.textMuted },
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
