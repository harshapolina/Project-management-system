import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { LoadingState, ErrorState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { BoqItem, QuotationStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'BoqDetail'>

const STATUS_FLOW: QuotationStatus[] = ['draft', 'sent', 'approved']

export function BoqDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { quotationId } = route.params
  const queryClient = useQueryClient()
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('1')
  const [rate, setRate] = useState('')
  const [addError, setAddError] = useState('')

  const { data: quotation, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => boqApi.get(quotationId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] })
    queryClient.invalidateQueries({ queryKey: ['quotations'] })
  }

  const updateItems = useMutation({
    mutationFn: (items: BoqItem[]) => boqApi.update(quotationId, { items }),
    onSuccess: invalidate,
  })

  const statusMutation = useMutation({
    mutationFn: (status: QuotationStatus) => boqApi.update(quotationId, { status }),
    onSuccess: invalidate,
  })

  const chromeProps = {
    title: quotation?.title || 'Quotation',
    subtitle: quotation ? `${quotation.versionLabel} · BOQ` : 'Bill of quantities',
    subtitleIcon: 'document-text-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading quotation…" variant="detail" />
      </NestedChrome>
    )
  }
  if (isError || !quotation) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const addItem = () => {
    const qtyNum = Number(qty) || 0
    const rateNum = Number(rate) || 0
    if (!desc.trim() || qtyNum <= 0 || rateNum <= 0) {
      setAddError('Description, quantity, and rate are required')
      return
    }
    setAddError('')
    const nextItems: BoqItem[] = [
      ...quotation.items,
      { description: desc.trim(), unit: 'nos', qty: qtyNum, rate: rateNum, amount: qtyNum * rateNum },
    ]
    updateItems.mutate(nextItems)
    setDesc('')
    setQty('1')
    setRate('')
  }

  const removeItem = (index: number) => {
    const nextItems = quotation.items.filter((_, i) => i !== index)
    updateItems.mutate(nextItems)
  }

  // Same order the quotation sheets total in: subtotal → handling → GST → discount
  const chargesAmount = (quotation.subtotal * (quotation.chargesPercent || 0)) / 100
  const gstAmount =
    ((quotation.subtotal + chargesAmount) * (quotation.gstPercent || 0)) / 100
  const propertyType =
    quotation.boqType === 'commercial'
      ? 'Commercial'
      : quotation.boqType === 'residential'
        ? 'Residential'
        : null

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={quotation.items}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <SurfaceCard style={styles.statusCard}>
              <View style={styles.badgeRow}>
                <Pill label={quotation.status} bg={colors.accentSoft} color={colors.accent} />
                {propertyType ? (
                  <Pill label={propertyType} bg={colors.muted} color={colors.textSecondary} />
                ) : null}
                <Text style={styles.versionLabel}>{quotation.versionLabel}</Text>
              </View>
              <SectionLabel>Status</SectionLabel>
              <View style={styles.statusRow}>
                {STATUS_FLOW.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                    style={[styles.statusChip, quotation.status === s && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, quotation.status === s && styles.statusChipTextActive]}>
                      {s === 'draft' ? 'Draft' : s === 'sent' ? 'Send' : 'Approve'}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => statusMutation.mutate('rejected')}
                  disabled={statusMutation.isPending}
                  style={[styles.statusChip, quotation.status === 'rejected' && styles.statusChipDanger]}
                >
                  <Text style={[styles.statusChipText, quotation.status === 'rejected' && styles.statusChipTextDanger]}>
                    Reject
                  </Text>
                </Pressable>
              </View>
            </SurfaceCard>
            <SectionLabel count={quotation.items.length}>Line items</SectionLabel>
          </View>
        }
        renderItem={({ item, index }) => (
          <SurfaceCard>
            <View style={styles.itemRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.qty} {item.unit} × {formatInr(item.rate)}
                </Text>
              </View>
              <Text style={styles.itemAmount}>{formatInr(item.amount)}</Text>
              <Pressable onPress={() => removeItem(index)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </SurfaceCard>
        )}
        ListFooterComponent={
          <View style={styles.footerBlock}>
            <SectionLabel>Add item</SectionLabel>
            <SurfaceCard style={styles.addCard}>
              <Input placeholder="Description" value={desc} onChangeText={setDesc} />
              <View style={styles.addRow}>
                <Input placeholder="Qty" keyboardType="numeric" value={qty} onChangeText={setQty} containerStyle={{ flex: 1 }} />
                <Input placeholder="Rate" keyboardType="numeric" value={rate} onChangeText={setRate} containerStyle={{ flex: 1 }} />
              </View>
              {addError ? <Text style={styles.error}>{addError}</Text> : null}
              <Button title="Add item" size="sm" onPress={addItem} loading={updateItems.isPending} />
            </SurfaceCard>

            <SectionLabel>Totals</SectionLabel>
            <SurfaceCard>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatInr(quotation.subtotal)}</Text>
              </View>
              {chargesAmount > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel} numberOfLines={1}>
                    {quotation.chargesLabel || `Design & handling (${quotation.chargesPercent}%)`}
                  </Text>
                  <Text style={styles.totalValue}>{formatInr(chargesAmount)}</Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST ({quotation.gstPercent}%)</Text>
                <Text style={styles.totalValue}>{formatInr(gstAmount)}</Text>
              </View>
              {quotation.discount ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>-{formatInr(quotation.discount)}</Text>
                </View>
              ) : null}
              <View style={[styles.totalRow, styles.grandRow]}>
                <Text style={styles.grandLabel}>Grand total</Text>
                <Text style={styles.grandValue}>{formatInr(quotation.grandTotal)}</Text>
              </View>
            </SurfaceCard>
          </View>
        }
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    headerBlock: { gap: spacing.md },
    footerBlock: { gap: spacing.md, marginTop: spacing.sm },
    statusCard: { gap: spacing.sm },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    versionLabel: { ...typography.caption, color: c.textMuted },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statusChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    statusChipActive: { backgroundColor: c.accent, borderColor: c.accent },
    statusChipDanger: { backgroundColor: c.dangerSoft, borderColor: c.dangerSoft },
    statusChipText: { ...typography.caption, color: c.textSecondary },
    statusChipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    statusChipTextDanger: { color: c.danger, fontWeight: '700' },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    itemDesc: { ...typography.body, color: c.textPrimary },
    itemMeta: { ...typography.caption, color: c.textSecondary },
    itemAmount: { ...typography.bodyStrong, color: c.textPrimary },
    addCard: { gap: spacing.sm },
    addRow: { flexDirection: 'row', gap: spacing.sm },
    error: { ...typography.caption, color: c.danger },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalLabel: { ...typography.caption, color: c.textSecondary },
    totalValue: { ...typography.caption, color: c.textPrimary },
    grandRow: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 4 },
    grandLabel: { ...typography.bodyStrong, color: c.textPrimary },
    grandValue: { ...typography.h3, color: c.accent },
  })
}
