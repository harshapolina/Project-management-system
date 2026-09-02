import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { LoadingState, ErrorState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { rfqsApi } from '../../api/rfq'
import { isApiError } from '../../api/client'
import type { RfqStatus, RfqVendorEntry } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'RfqDetail'>

function vendorId(entry: RfqVendorEntry): string | undefined {
  return typeof entry.vendor === 'object' ? entry.vendor._id : entry.vendor
}

function vendorName(entry: RfqVendorEntry): string {
  return typeof entry.vendor === 'object' ? entry.vendor.name : 'Vendor'
}

function rfqStatusColor(c: AppColors, status: RfqStatus): string {
  const map: Record<RfqStatus, string> = {
    draft: c.textMuted,
    sent: c.accent,
    comparing: c.warning,
    awarded: c.success,
    cancelled: c.danger,
  }
  return map[status]
}

export function RfqDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { rfqId } = route.params
  const queryClient = useQueryClient()
  const [quoteVendorId, setQuoteVendorId] = useState<string | undefined>()
  const [quoteRate, setQuoteRate] = useState('')
  const [awardVendorId, setAwardVendorId] = useState<string | undefined>()

  const { data: rfq, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rfq', rfqId],
    queryFn: () => rfqsApi.get(rfqId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rfq', rfqId] })
    queryClient.invalidateQueries({ queryKey: ['rfqs'] })
  }

  const sendMutation = useMutation({
    mutationFn: (vendorId?: string) => rfqsApi.send(rfqId, vendorId ? { vendorId } : undefined),
    onSuccess: (result) => {
      invalidate()
      Alert.alert('Sent', `${result.sent} vendor(s) notified.`)
    },
    onError: (err) => Alert.alert('Send failed', isApiError(err) ? err.message : 'Could not send RFQ'),
  })

  const quoteMutation = useMutation({
    mutationFn: () =>
      rfqsApi.quote(rfqId, {
        vendorId: quoteVendorId!,
        rates: quoteRate.trim() ? [Number(quoteRate)] : undefined,
      }),
    onSuccess: () => {
      invalidate()
      setQuoteRate('')
      Alert.alert('Quote recorded', 'Vendor quote has been saved.')
    },
    onError: (err) => Alert.alert('Quote failed', isApiError(err) ? err.message : 'Could not save quote'),
  })

  const awardMutation = useMutation({
    mutationFn: () => rfqsApi.award(rfqId, { vendorId: awardVendorId! }),
    onSuccess: (result) => {
      invalidate()
      Alert.alert('Awarded', `PO ${result.purchaseOrder.poNumber} created.`, [
        { text: 'View PO', onPress: () => navigation.navigate('PurchaseOrderDetail', { poId: result.purchaseOrder._id }) },
        { text: 'OK' },
      ])
    },
    onError: (err) => Alert.alert('Award failed', isApiError(err) ? err.message : 'Could not award RFQ'),
  })

  const chromeProps = {
    title: rfq?.rfqNumber || 'RFQ',
    subtitle: "Request for quotation",
    subtitleIcon: 'document-text-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading RFQ…" variant="detail" />
      </NestedChrome>
    )
  }
  if (isError || !rfq) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const pName = typeof rfq.projectId === 'object' ? rfq.projectId?.name : undefined
  const canSend = rfq.status === 'draft' || rfq.status === 'sent'
  const canAward = rfq.status === 'sent' || rfq.status === 'comparing'

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={rfq.items}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.badgeRow}>
                <Pill label={rfq.status} color={rfqStatusColor(colors, rfq.status)} bg={`${rfqStatusColor(colors, rfq.status)}22`} />
                {pName ? <Text style={styles.projectName}>{pName}</Text> : null}
              </View>
              {rfq.closingDate ? <Text style={styles.meta}>Closing {rfq.closingDate.slice(0, 10)}</Text> : null}
              {rfq.notes ? <Text style={styles.notes}>{rfq.notes}</Text> : null}
              {canSend ? (
                <Button
                  title="Send to vendors"
                  size="sm"
                  onPress={() => sendMutation.mutate(undefined)}
                  loading={sendMutation.isPending}
                />
              ) : null}
            </SurfaceCard>

            <SectionLabel count={rfq.vendors.length}>Vendors</SectionLabel>
            {rfq.vendors.map((entry) => {
              const id = vendorId(entry)
              const selectedQuote = quoteVendorId === id
              const selectedAward = awardVendorId === id
              return (
                <SurfaceCard key={id || vendorName(entry)}>
                  <View style={styles.vendorRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.vendorName}>{vendorName(entry)}</Text>
                      <Text style={styles.meta}>
                        {entry.status}
                        {entry.landedCost != null ? ` · ${formatInr(entry.landedCost)}` : ''}
                      </Text>
                    </View>
                    <Pill label={entry.status} bg={colors.surfaceRaised} color={colors.textSecondary} />
                  </View>
                  {canAward ? (
                    <View style={styles.vendorActions}>
                      <Pressable
                        onPress={() => setQuoteVendorId(id)}
                        style={[styles.chip, selectedQuote && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, selectedQuote && styles.chipTextActive]}>Quote</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setAwardVendorId(id)}
                        style={[styles.chip, selectedAward && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, selectedAward && styles.chipTextActive]}>Award</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </SurfaceCard>
              )
            })}

            {quoteVendorId ? (
              <SurfaceCard style={styles.actionCard}>
                <Text style={styles.actionTitle}>Record quote</Text>
                <Input placeholder="Rate (optional)" keyboardType="numeric" value={quoteRate} onChangeText={setQuoteRate} />
                <Button
                  title="Save quote"
                  size="sm"
                  onPress={() => quoteMutation.mutate()}
                  loading={quoteMutation.isPending}
                />
              </SurfaceCard>
            ) : null}

            {awardVendorId ? (
              <SurfaceCard style={styles.actionCard}>
                <Text style={styles.actionTitle}>Award RFQ</Text>
                <Button
                  title="Create purchase order"
                  size="sm"
                  onPress={() => awardMutation.mutate()}
                  loading={awardMutation.isPending}
                />
              </SurfaceCard>
            ) : null}

            <SectionLabel count={rfq.items.length}>Line items</SectionLabel>
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
                  {item.qty} {item.unit}
                  {item.boqRate != null ? ` · BOQ ${formatInr(item.boqRate)}` : ''}
                  {item.rate != null ? ` · Quote ${formatInr(item.rate)}` : ''}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        )}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    headerBlock: { gap: spacing.md },
    summaryCard: { gap: spacing.sm },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    projectName: { ...typography.caption, color: c.textSecondary },
    meta: { ...typography.caption, color: c.textSecondary },
    notes: { ...typography.body, color: c.textPrimary },
    vendorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    vendorName: { ...typography.bodyStrong, color: c.textPrimary },
    vendorActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    actionCard: { gap: spacing.sm },
    actionTitle: { ...typography.captionStrong, color: c.textSecondary },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    itemDesc: { ...typography.body, color: c.textPrimary },
  })
}
