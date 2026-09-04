import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Fab } from '../../../components/Fab'
import { Pill } from '../../../components/Badge'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { SearchField } from '../../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { rfqsApi } from '../../../api/rfq'
import { isApiError } from '../../../api/client'
import { refName } from '../procurementMeta'
import type { RfqStatus } from '../../../types/ops'
import type { TabProps } from './types'

function rfqStatusColor(c: AppColors, status: RfqStatus): string {
  return {
    draft: c.textMuted,
    sent: c.accent,
    comparing: c.warning,
    awarded: c.success,
    cancelled: c.danger,
  }[status]
}

export function RfqsTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['rfqs', projectId],
    queryFn: () => rfqsApi.list(projectId ? { projectId } : undefined),
  })

  if (isLoading) return <LoadingState label="Loading RFQs…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const q = search.trim().toLowerCase()
  const rfqs = (data || []).filter((rfq) => {
    if (!q) return true
    return [rfq.rfqNumber, refName(rfq.projectId)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  return (
    <>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search RFQ or project" />
      <FlatList
        data={rfqs}
        keyExtractor={(rfq) => rfq._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        renderItem={({ item }) => {
          const color = rfqStatusColor(colors, item.status)
          const quoted = item.vendors.filter((v) => v.status === 'quoted').length
          return (
            <SurfaceCard onPress={() => navigation.navigate('RfqDetail', { rfqId: item._id })}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.rfqNumber}
                </Text>
                <Pill label={item.status} color={color} bg={`${color}22`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  refName(item.projectId),
                  `${item.items.length} item${item.items.length === 1 ? '' : 's'}`,
                  `${item.vendors.length} vendor${item.vendors.length === 1 ? '' : 's'}`,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
              {item.vendors.length ? (
                <Text style={styles.quoted}>
                  {quoted} of {item.vendors.length} quoted
                </Text>
              ) : null}
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="paper-plane-outline"
            title={data?.length ? 'No match' : 'No RFQs yet'}
            body={
              data?.length
                ? 'Try another search.'
                : 'Request quotes from vendors, compare them side by side, then award a purchase order.'
            }
            action={data?.length ? undefined : 'New RFQ'}
            onAction={data?.length ? undefined : () => navigation.navigate('CreateRfq', { projectId })}
          />
        }
      />
      <Fab label="New RFQ" icon="paper-plane-outline" onPress={() => navigation.navigate('CreateRfq', { projectId })} />
    </>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    quoted: { ...typography.micro, color: c.textMuted, marginTop: 4 },
  })
}
