import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Fab } from '../../components/Fab'
import { Pill } from '../../components/Badge'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { QuotationStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'BoqList'>

function statusColorMap(c: AppColors): Record<QuotationStatus, string> {
  return {
    draft: c.textMuted,
    sent: c.accent,
    viewed: c.accent,
    approved: c.success,
    rejected: c.danger,
  }
}

export function BoqListScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params || {}

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['quotations', projectId ?? 'all'],
    queryFn: () => boqApi.list(projectId ? { projectId } : undefined),
  })

  const chromeProps = {
    title: 'BOQ / Quotes',
    subtitle: 'Estimates and versions',
    subtitleIcon: 'document-text-outline' as const,
  }

  return (
    <NestedChrome {...chromeProps}>
      {isLoading ? (
        <LoadingState label="Loading quotations…" variant="list" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(q) => q._id}
          contentContainerStyle={listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
            return (
              <SurfaceCard onPress={() => navigation.navigate('BoqDetail', { quotationId: item._id })}>
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Pill label={item.status} color={statusColorMap(colors)[item.status]} bg={`${statusColorMap(colors)[item.status]}22`} />
                  </View>
                  {pName ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {pName}
                    </Text>
                  ) : null}
                  <Text style={styles.total}>{formatInr(item.grandTotal)}</Text>
                  <Text style={styles.itemCount}>{item.items.length} line items</Text>
                </View>
              </SurfaceCard>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              title="No quotations yet"
              body="Create a BOQ to start quoting."
              action="New quotation"
              onAction={() => navigation.navigate('CreateBoq', { projectId, projectName })}
            />
          }
        />
      )}

      <Fab
        label="New quotation"
        onPress={() => navigation.navigate('CreateBoq', { projectId, projectName })}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardInner: { gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary },
    total: { ...typography.h3, color: c.accent },
    itemCount: { ...typography.caption, color: c.textMuted },
  })
}
