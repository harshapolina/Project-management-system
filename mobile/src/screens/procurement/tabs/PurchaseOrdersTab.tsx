import { useMemo, useState } from 'react'
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Fab } from '../../../components/Fab'
import { Pill } from '../../../components/Badge'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { purchaseOrdersApi } from '../../../api/procurement'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import { poWhatsappLink } from '../../../utils/phone'
import { refName } from '../procurementMeta'
import type { POStatus } from '../../../types/ops'
import type { TabProps } from './types'

type Filter = 'open' | 'transit' | 'delivered' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'To send' },
  { key: 'transit', label: 'In transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'all', label: 'All' },
]

function poStatusColor(c: AppColors, status: POStatus): string {
  return {
    draft: c.textMuted,
    approved: c.accent,
    ordered: c.accent,
    in_transit: c.warning,
    delivered: c.success,
  }[status]
}

export function PurchaseOrdersTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: () => purchaseOrdersApi.list(projectId ? { projectId } : undefined),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
  }

  const send = useMutation({
    mutationFn: ({ id, via }: { id: string; via: string }) => procurementFlowApi.sendPo(id, via),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not send', isApiError(err) ? err.message : 'Try again'),
  })

  const unsend = useMutation({
    mutationFn: (id: string) => procurementFlowApi.unsendPo(id),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not recall', isApiError(err) ? err.message : 'Try again'),
  })

  if (isLoading) return <LoadingState label="Loading purchase orders…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const all = data || []
  const pos = all.filter((po) => {
    if (filter === 'open') return po.status === 'draft' || po.status === 'approved'
    if (filter === 'transit') return po.status === 'ordered' || po.status === 'in_transit'
    if (filter === 'delivered') return po.status === 'delivered'
    return true
  })

  return (
    <>
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        data={pos}
        keyExtractor={(po) => po._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        renderItem={({ item }) => {
          const color = poStatusColor(colors, item.status)
          const wa = poWhatsappLink(item)
          const sendable = item.status === 'draft' || item.status === 'approved'
          return (
            <SurfaceCard onPress={() => navigation.navigate('PurchaseOrderDetail', { poId: item._id })}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.poNumber}
                </Text>
                <Pill label={item.status.replace('_', ' ')} color={color} bg={`${color}22`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[refName(item.vendor), refName(item.projectId)].filter(Boolean).join('  ·  ') ||
                  'No vendor set'}
              </Text>
              <Text style={styles.value}>{formatInr(item.value)}</Text>

              <View style={styles.actions}>
                {sendable ? (
                  <Pressable
                    style={[styles.action, styles.primary]}
                    disabled={send.isPending}
                    onPress={() => send.mutate({ id: item._id, via: 'manual' })}
                  >
                    <Ionicons name="paper-plane-outline" size={13} color={colors.textOnAccent} />
                    <Text style={[styles.actionText, { color: colors.textOnAccent }]}>Mark sent</Text>
                  </Pressable>
                ) : null}
                {item.status === 'ordered' ? (
                  <Pressable style={styles.action} disabled={unsend.isPending} onPress={() => unsend.mutate(item._id)}>
                    <Ionicons name="arrow-undo-outline" size={13} color={colors.accentHover} />
                    <Text style={styles.actionText}>Recall</Text>
                  </Pressable>
                ) : null}
                {wa ? (
                  <Pressable style={[styles.action, styles.wa]} onPress={() => Linking.openURL(wa)}>
                    <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success }]}>WhatsApp</Text>
                  </Pressable>
                ) : null}
                {item.status !== 'draft' ? (
                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      navigation.navigate('CreateGrn', { projectId, purchaseOrderId: item._id })
                    }
                  >
                    <Ionicons name="download-outline" size={13} color={colors.accentHover} />
                    <Text style={styles.actionText}>Receive</Text>
                  </Pressable>
                ) : null}
              </View>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={all.length ? 'Nothing in this filter' : 'No purchase orders yet'}
            body={
              all.length ? 'Switch filters to see the rest.' : 'Raise a PO once BOQ items are approved.'
            }
            action={all.length ? undefined : 'New purchase order'}
            onAction={all.length ? undefined : () => navigation.navigate('CreatePurchaseOrder', { projectId })}
          />
        }
      />
      <Fab
        label="New purchase order"
        icon="cube-outline"
        onPress={() => navigation.navigate('CreatePurchaseOrder', { projectId })}
      />
    </>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    value: { ...typography.h3, color: c.accent, marginTop: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
    },
    primary: { backgroundColor: c.accent },
    wa: { backgroundColor: c.successSoft },
    actionText: { ...typography.micro, fontWeight: '600', color: c.accentHover },
  })
}
