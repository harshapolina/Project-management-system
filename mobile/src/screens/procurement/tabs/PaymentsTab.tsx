import { useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Fab } from '../../../components/Fab'
import { Pill } from '../../../components/Badge'
import { StatCard } from '../../../components/StatCard'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi, type UpdateVendorPaymentPayload } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import {
  AGING_LABELS,
  MATCH_LABELS,
  PAYMENT_STATUS_LABELS,
  agingColor,
  paymentStatusColor,
  refName,
  shortDate,
} from '../procurementMeta'
import type { VendorPayment } from '../../../types/procurementFlow'
import type { TabProps } from './types'

type Filter = 'open' | 'approved' | 'paid' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'In the gate' },
  { key: 'approved', label: 'Ready to pay' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
]

/** The approval gate: accounts sign off, then management, then it can be paid. */
function gateAction(payment: VendorPayment): { label: string; body: UpdateVendorPaymentPayload } | null {
  if (payment.status === 'pending_accounts') {
    return { label: 'Accounts OK', body: { status: 'pending_management' } }
  }
  if (payment.status === 'pending_management') {
    return { label: 'Management OK', body: { status: 'approved' } }
  }
  if (payment.status === 'approved') {
    return {
      label: 'Mark paid',
      body: { status: 'paid', mode: 'NEFT', paidAmount: payment.netPayable },
    }
  }
  return null
}

export function PaymentsTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('open')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['vendor-payments', projectId],
    queryFn: () => procurementFlowApi.payments(projectId ? { projectId } : undefined),
  })

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateVendorPaymentPayload }) =>
      procurementFlowApi.updatePayment(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-payments'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
    },
    onError: (err) => Alert.alert('Could not update', isApiError(err) ? err.message : 'Try again'),
  })

  if (isLoading) return <LoadingState label="Loading payments…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const all = data || []
  const payments = all.filter((p) => {
    if (filter === 'open') return !['paid', 'cancelled', 'approved'].includes(p.status)
    if (filter === 'approved') return p.status === 'approved'
    if (filter === 'paid') return p.status === 'paid'
    return true
  })

  const outstanding = all
    .filter((p) => p.status !== 'paid' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + (Number(p.netPayable) || 0), 0)
  const overdue = all.filter((p) => p.agingBucket === 'overdue' && p.status !== 'paid').length
  const held = all.filter((p) => p.status === 'match_hold').length

  return (
    <>
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        data={payments}
        keyExtractor={(p) => p._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stats}>
              <StatCard label="Outstanding" value={formatInr(outstanding)} />
              <StatCard label="Overdue" value={overdue} tone={overdue ? 'danger' : 'default'} />
              <StatCard label="Match hold" value={held} tone={held ? 'warning' : 'default'} />
            </View>
            <Text style={styles.formula}>
              Net payable = invoice − debit note − TDS − other deductions.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = paymentStatusColor(colors, item.status)
          const aging = agingColor(colors, item.agingBucket)
          const action = gateAction(item)
          const deductions =
            (Number(item.debitAmount) || 0) +
            (Number(item.tdsAmount) || 0) +
            (Number(item.otherDeductions) || 0)
          return (
            <SurfaceCard>
              <View style={styles.row}>
                <Text style={styles.number} numberOfLines={1}>
                  {item.paymentNumber}
                </Text>
                <Pill label={PAYMENT_STATUS_LABELS[item.status]} color={statusColor} bg={`${statusColor}18`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  refName(item.vendor),
                  refName(item.purchaseOrder, 'poNumber') && `PO ${refName(item.purchaseOrder, 'poNumber')}`,
                  refName(item.vendorInvoice, 'invoiceNumber'),
                  refName(item.projectId),
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>

              <Text style={styles.amount}>{formatInr(item.netPayable)}</Text>
              <Text style={styles.breakdown}>
                {formatInr(item.invoiceAmount)} invoiced
                {deductions > 0 ? ` − ${formatInr(deductions)} deductions` : ''}
              </Text>

              <View style={styles.pills}>
                <Pill
                  label={MATCH_LABELS[item.matchStatus]}
                  color={item.matchStatus === 'mismatch' ? colors.danger : colors.textSecondary}
                  bg={item.matchStatus === 'mismatch' ? `${colors.danger}18` : colors.surfaceRaised}
                />
                <Pill label={AGING_LABELS[item.agingBucket]} color={aging} bg={`${aging}18`} />
                {item.dueDate ? (
                  <Pill label={`Due ${shortDate(item.dueDate)}`} color={colors.textSecondary} bg={colors.surfaceRaised} />
                ) : null}
              </View>

              {item.matchNotes ? <Text style={styles.matchNotes}>{item.matchNotes}</Text> : null}
              {item.utr ? <Text style={styles.matchNotes}>UTR {item.utr}</Text> : null}
              {item.followUps?.length ? (
                <Text style={styles.followUp}>
                  Last follow-up: {item.followUps[item.followUps.length - 1].note || 'contacted'} ·{' '}
                  {shortDate(item.followUps[item.followUps.length - 1].at)}
                </Text>
              ) : null}

              <View style={styles.actions}>
                {action ? (
                  <Pressable
                    style={[styles.action, styles.primaryAction]}
                    disabled={patch.isPending}
                    onPress={() => patch.mutate({ id: item._id, body: action.body })}
                  >
                    <Ionicons name="checkmark-outline" size={13} color={colors.textOnAccent} />
                    <Text style={[styles.actionText, { color: colors.textOnAccent }]}>{action.label}</Text>
                  </Pressable>
                ) : null}
                {item.status === 'match_hold' ? (
                  <Pressable
                    style={styles.action}
                    disabled={patch.isPending}
                    onPress={() =>
                      Alert.alert(
                        'Waive the match',
                        'Send this to accounts even though the invoice and PO differ?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Waive',
                            onPress: () =>
                              patch.mutate({
                                id: item._id,
                                body: { matchStatus: 'waived', status: 'pending_accounts' },
                              }),
                          },
                        ],
                      )
                    }
                  >
                    <Ionicons name="shield-outline" size={13} color={colors.accentHover} />
                    <Text style={styles.actionText}>Waive match</Text>
                  </Pressable>
                ) : null}
                {item.status !== 'paid' && item.status !== 'cancelled' ? (
                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      navigation.navigate('VendorPaymentDetail', {
                        paymentId: item._id,
                        paymentNumber: item.paymentNumber,
                      })
                    }
                  >
                    <Ionicons name="create-outline" size={13} color={colors.accentHover} />
                    <Text style={styles.actionText}>Adjust & log</Text>
                  </Pressable>
                ) : null}
              </View>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title={all.length ? 'Nothing in this filter' : 'No payments raised'}
            body={
              all.length
                ? 'Switch filters to see the rest.'
                : 'Raise a payment against a vendor invoice — it runs a 3-way match against the PO first.'
            }
            action={all.length ? undefined : 'Raise payment'}
            onAction={all.length ? undefined : () => navigation.navigate('CreateVendorPayment', { projectId })}
          />
        }
      />
      <Fab
        label="Raise payment"
        icon="wallet-outline"
        onPress={() => navigation.navigate('CreateVendorPayment', { projectId })}
      />
    </>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    header: { gap: spacing.md, marginBottom: spacing.sm },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    formula: { ...typography.micro, color: c.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    amount: { ...typography.h3, color: c.textPrimary, marginTop: 6 },
    breakdown: { ...typography.micro, color: c.textMuted, marginTop: 2 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    matchNotes: { ...typography.micro, color: c.textSecondary, marginTop: 6 },
    followUp: { ...typography.micro, color: c.textMuted, marginTop: 4, fontStyle: 'italic' },
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
    primaryAction: { backgroundColor: c.accent },
    actionText: { ...typography.micro, fontWeight: '600', color: c.accentHover },
  })
}
