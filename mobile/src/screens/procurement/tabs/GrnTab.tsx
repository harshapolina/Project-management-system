import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Fab } from '../../../components/Fab'
import { Pill } from '../../../components/Badge'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { SearchField } from '../../../components/SearchField'
import { PhotoStrip } from '../../../components/PhotoStrip'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { formatInr, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import {
  GRN_STATUS_LABELS,
  grnStatusColor,
  refName,
  shortDate,
} from '../procurementMeta'
import type { TabProps } from './types'

/** Goods receipt notes — what physically arrived against each purchase order. */
export function GrnTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['grns', projectId],
    queryFn: () => procurementFlowApi.grns(projectId ? { projectId } : undefined),
  })

  if (isLoading) return <LoadingState label="Loading GRNs…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const q = search.trim().toLowerCase()
  const grns = (data || []).filter((grn) => {
    if (!q) return true
    return [grn.grnNumber, grn.invoiceNo, grn.challanNo, refName(grn.vendor), refName(grn.purchaseOrder, 'poNumber')]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  return (
    <>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search GRN, vendor, PO" />
      <FlatList
        data={grns}
        keyExtractor={(grn) => grn._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        renderItem={({ item }) => {
          const color = grnStatusColor(colors, item.status)
          const received = item.items.reduce((sum, line) => sum + (Number(line.receivedQty) || 0), 0)
          const value = item.items.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
          return (
            <SurfaceCard
              onPress={() =>
                navigation.navigate('GrnDetail', { grnId: item._id, grnNumber: item.grnNumber })
              }
            >
              <View style={styles.row}>
                <Text style={styles.number} numberOfLines={1}>
                  {item.grnNumber}
                </Text>
                <Pill label={GRN_STATUS_LABELS[item.status]} color={color} bg={`${color}18`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  refName(item.vendor),
                  refName(item.purchaseOrder, 'poNumber') && `PO ${refName(item.purchaseOrder, 'poNumber')}`,
                  refName(item.projectId),
                  shortDate(item.receivedAt),
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
              <Text style={styles.qty}>
                {item.items.length} line{item.items.length === 1 ? '' : 's'} · {received} received ·{' '}
                {formatInr(value)}
              </Text>
              {item.photos?.length ? <PhotoStrip photos={item.photos} size={56} /> : null}
              {item.status === 'qc_pending' ? (
                <Text style={styles.hint}>Waiting on a quality check.</Text>
              ) : null}
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="download-outline"
            title={data?.length ? 'No match' : 'No goods received yet'}
            body={
              data?.length
                ? 'Try another search.'
                : 'Record a GRN when material arrives at site against a purchase order.'
            }
            action={data?.length ? undefined : 'Record GRN'}
            onAction={data?.length ? undefined : () => navigation.navigate('CreateGrn', { projectId })}
          />
        }
      />
      <Fab label="Record GRN" icon="download-outline" onPress={() => navigation.navigate('CreateGrn', { projectId })} />
    </>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    qty: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    hint: { ...typography.micro, color: c.warning, marginTop: 6 },
  })
}
