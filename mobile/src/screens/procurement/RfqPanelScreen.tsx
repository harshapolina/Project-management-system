import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Fab } from '../../components/Fab'
import { Pill } from '../../components/Badge'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { rfqsApi } from '../../api/rfq'
import { isApiError } from '../../api/client'
import { smartGoBack } from '../../navigation/openProject'
import type { RfqStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'RfqPanel'>

function rfqStatusColorMap(c: AppColors): Record<RfqStatus, string> {
  return {
    draft: c.textMuted,
    sent: c.accent,
    comparing: c.warning,
    awarded: c.success,
    cancelled: c.danger,
  }
}

export function RfqPanelScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { projectId, projectName } = route.params

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['rfqs', projectId],
    queryFn: () => rfqsApi.list({ projectId }),
  })

  const chromeProps = {
    title: "RFQs",
    subtitle: projectName || 'Request for quotation',
    subtitleIcon: 'document-text-outline' as const,
    onBack: () => smartGoBack(navigation, route),
  }

  return (
    <NestedChrome {...chromeProps}>
      {isLoading ? (
        <LoadingState label="Loading RFQs…" variant="list" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(rfq) => rfq._id}
          contentContainerStyle={listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('RfqDetail', { rfqId: item._id })}>
              <SurfaceCard>
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.rfqNumber}
                    </Text>
                    <Pill
                      label={item.status}
                      color={rfqStatusColorMap(colors)[item.status]}
                      bg={`${rfqStatusColorMap(colors)[item.status]}22`}
                    />
                  </View>
                  <Text style={styles.meta}>
                    {item.items.length} items · {item.vendors.length} vendors
                  </Text>
                  {item.closingDate ? <Text style={styles.meta}>Closes {item.closingDate.slice(0, 10)}</Text> : null}
                </View>
              </SurfaceCard>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No RFQs for this project"
              body="Send material requests to vendors for competitive quotes."
              action="New RFQ"
              onAction={() => navigation.navigate('CreateRfq', { projectId, projectName })}
            />
          }
        />
      )}
      <Fab
        label="New RFQ"
        onPress={() => navigation.navigate('CreateRfq', { projectId, projectName })}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardInner: { gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
  })
}
