import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { LoadingState, ErrorState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { Ionicons } from '@expo/vector-icons'
import { purchaseOrdersApi } from '../../api/procurement'
import { procurementFlowApi } from '../../api/procurementFlow'
import { poEmailDraft } from '../../lib/composeEmail'
import { poWhatsappLink } from '../../utils/phone'
import { isApiError } from '../../api/client'
import type { POStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'PurchaseOrderDetail'>

const STATUS_FLOW: POStatus[] = ['draft', 'approved', 'ordered', 'in_transit', 'delivered']

function statusColorMap(c: AppColors): Record<POStatus, string> {
  return {
    draft: c.textMuted,
    approved: c.accent,
    ordered: c.accent,
    in_transit: c.warning,
    delivered: c.success,
  }
}

function statusLabel(status: POStatus): string {
  return status.replace('_', ' ')
}

export function PurchaseOrderDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { poId } = route.params
  const queryClient = useQueryClient()

  const { data: po, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: async () => {
      const orders = await purchaseOrdersApi.list()
      const found = orders.find((o) => o._id === poId)
      if (!found) throw new Error('Purchase order not found')
      return found
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    queryClient.invalidateQueries({ queryKey: ['procurement-dashboard'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: POStatus) => purchaseOrdersApi.update(poId, { status }),
    onSuccess: invalidate,
  })

  /** Records how and when the order went out, and moves it to `ordered`. */
  const dispatch = useMutation({
    mutationFn: (via: string) => procurementFlowApi.sendPo(poId, via),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not mark sent', isApiError(err) ? err.message : 'Try again'),
  })

  const chromeProps = {
    title: po?.poNumber || 'Purchase order',
    subtitle: "Material order",
    subtitleIcon: 'cart-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading purchase order…" variant="detail" />
      </NestedChrome>
    )
  }
  if (isError || !po) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const vendorName = typeof po.vendor === 'object' ? po.vendor?.name : undefined
  const pName = typeof po.projectId === 'object' ? po.projectId?.name : undefined
  const currentIdx = STATUS_FLOW.indexOf(po.status)

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={po.items}
        keyExtractor={(item, i) => `${item.description}-${i}`}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.badgeRow}>
                <Pill label={statusLabel(po.status)} color={statusColorMap(colors)[po.status]} bg={`${statusColorMap(colors)[po.status]}22`} />
                <Text style={styles.value}>{formatInr(po.value)}</Text>
              </View>
              <Text style={styles.meta}>{[vendorName, pName].filter(Boolean).join(' · ')}</Text>

              <View style={styles.sendRow}>
                <Pressable
                  style={styles.sendBtn}
                  onPress={() => {
                    navigation.navigate('ComposeEmail', poEmailDraft(po))
                    if (po.status === 'draft' || po.status === 'approved') dispatch.mutate('email')
                  }}
                >
                  <Ionicons name="mail-outline" size={14} color={colors.accent} />
                  <Text style={styles.sendText}>Email vendor</Text>
                </Pressable>
                {poWhatsappLink(po) ? (
                  <Pressable
                    style={[styles.sendBtn, styles.waBtn]}
                    onPress={() => {
                      Linking.openURL(poWhatsappLink(po))
                      if (po.status === 'draft' || po.status === 'approved') dispatch.mutate('whatsapp')
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                    <Text style={[styles.sendText, { color: colors.success }]}>WhatsApp</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.sendBtn}
                  onPress={() => navigation.navigate('CreateGrn', { purchaseOrderId: poId })}
                >
                  <Ionicons name="download-outline" size={14} color={colors.accent} />
                  <Text style={styles.sendText}>Receive goods</Text>
                </Pressable>
              </View>

              <SectionLabel>Status</SectionLabel>
              <View style={styles.stepper}>
                {STATUS_FLOW.map((status, idx) => {
                  const done = idx <= currentIdx
                  const active = status === po.status
                  return (
                    <View key={status} style={styles.step}>
                      <Pressable
                        onPress={() => statusMutation.mutate(status)}
                        disabled={statusMutation.isPending}
                        style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}
                      >
                        <Text style={[styles.stepNum, (done || active) && styles.stepNumActive]}>{idx + 1}</Text>
                      </Pressable>
                      <Text style={[styles.stepLabel, active && styles.stepLabelActive]} numberOfLines={1}>
                        {statusLabel(status)}
                      </Text>
                      {idx < STATUS_FLOW.length - 1 ? (
                        <View style={[styles.stepLine, idx < currentIdx && styles.stepLineDone]} />
                      ) : null}
                    </View>
                  )
                })}
              </View>
            </SurfaceCard>
            <SectionLabel count={po.items.length}>Line items</SectionLabel>
          </View>
        }
        renderItem={({ item }) => (
          <SurfaceCard>
            <View style={styles.itemRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.meta}>
                  {item.qty} × {formatInr(item.rate)}
                </Text>
              </View>
              <Text style={styles.itemAmount}>{formatInr(item.amount)}</Text>
            </View>
          </SurfaceCard>
        )}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    sendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
    },
    waBtn: { backgroundColor: c.successSoft },
    sendText: { ...typography.micro, fontWeight: '600', color: c.accentHover },
    headerBlock: { gap: spacing.md },
    summaryCard: { gap: spacing.sm },
    badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    value: { ...typography.h3, color: c.accent },
    meta: { ...typography.caption, color: c.textSecondary },
    stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    step: { alignItems: 'center', width: 64, position: 'relative' },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotDone: { borderColor: c.accent, backgroundColor: c.accentSoft },
    stepDotActive: { backgroundColor: c.accent, borderColor: c.accent },
    stepNum: { ...typography.micro, color: c.textMuted, fontWeight: '700' },
    stepNumActive: { color: c.textOnAccent },
    stepLabel: { ...typography.micro, color: c.textMuted, marginTop: 4, textAlign: 'center' },
    stepLabelActive: { color: c.accent, fontWeight: '700' },
    stepLine: {
      position: 'absolute',
      top: 14,
      left: 46,
      width: 24,
      height: 2,
      backgroundColor: c.border,
    },
    stepLineDone: { backgroundColor: c.accent },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    itemDesc: { ...typography.body, color: c.textPrimary },
    itemAmount: { ...typography.bodyStrong, color: c.textPrimary },
  })
}
