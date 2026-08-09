import { useLayoutEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { LoadingState, ErrorState } from '../../components/States'
import { colors, formatInr, radius, spacing, typography } from '../../constants/theme'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { BoqItem, QuotationStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'BoqDetail'>

const STATUS_FLOW: QuotationStatus[] = ['draft', 'sent', 'approved']

export function BoqDetailScreen({ route, navigation }: Props) {
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

  useLayoutEffect(() => {
    navigation.setOptions({ title: quotation?.title || 'Quotation' })
  }, [navigation, quotation?.title])

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

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading quotation…" />
      </Screen>
    )
  }
  if (isError || !quotation) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
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

  return (
    <Screen padded={false}>
      <FlatList
        data={quotation.items}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <View style={styles.badgeRow}>
              <Pill label={quotation.status} bg={colors.accentSoft} color={colors.accent} />
              <Text style={styles.versionLabel}>{quotation.versionLabel}</Text>
            </View>

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
                <Text style={[styles.statusChipText, quotation.status === 'rejected' && styles.statusChipTextActive]}>
                  Reject
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Line items · {quotation.items.length}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
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
        )}
        ListFooterComponent={
          <View style={{ gap: spacing.lg }}>
            <Card style={styles.addCard}>
              <Text style={styles.sectionTitle}>Add item</Text>
              <Input placeholder="Description" value={desc} onChangeText={setDesc} />
              <View style={styles.addRow}>
                <Input placeholder="Qty" keyboardType="numeric" value={qty} onChangeText={setQty} containerStyle={{ flex: 1 }} />
                <Input placeholder="Rate" keyboardType="numeric" value={rate} onChangeText={setRate} containerStyle={{ flex: 1 }} />
              </View>
              {addError ? <Text style={styles.error}>{addError}</Text> : null}
              <Button title="Add item" size="sm" onPress={addItem} loading={updateItems.isPending} />
            </Card>

            <Card style={{ gap: 6 }}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatInr(quotation.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST ({quotation.gstPercent}%)</Text>
                <Text style={styles.totalValue}>{formatInr((quotation.subtotal * quotation.gstPercent) / 100)}</Text>
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
            </Card>
          </View>
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  versionLabel: { ...typography.caption, color: colors.textMuted },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceRaised },
  statusChipActive: { backgroundColor: colors.rail },
  statusChipDanger: { backgroundColor: colors.dangerSoft },
  statusChipText: { ...typography.caption, color: colors.textSecondary },
  statusChipTextActive: { color: '#fff', fontWeight: '700' },
  sectionTitle: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  itemDesc: { ...typography.body, color: colors.textPrimary },
  itemMeta: { ...typography.caption, color: colors.textSecondary },
  itemAmount: { ...typography.bodyStrong, color: colors.textPrimary },
  addCard: { gap: spacing.sm },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  error: { ...typography.caption, color: colors.danger },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { ...typography.caption, color: colors.textSecondary },
  totalValue: { ...typography.caption, color: colors.textPrimary },
  grandRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 2 },
  grandLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  grandValue: { ...typography.h3, color: colors.accent },
})
