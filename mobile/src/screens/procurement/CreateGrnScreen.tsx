import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { SurfaceCard } from '../../components/SurfaceCard'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { purchaseOrdersApi } from '../../api/procurement'
import { procurementFlowApi } from '../../api/procurementFlow'
import { isApiError } from '../../api/client'
import { refName } from './procurementMeta'
import type { PurchaseOrder } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateGrn'>

interface DraftLine {
  description: string
  unit: string
  orderedQty: number
  rate: number
  receivedQty: string
  batchNo: string
  remarks: string
}

function linesFromPo(po: PurchaseOrder): DraftLine[] {
  return (po.items || []).map((it) => ({
    description: it.description || '',
    unit: 'nos',
    orderedQty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    // Default to the full ordered quantity — short receipts are the exception.
    receivedQty: String(Number(it.qty) || 0),
    batchNo: '',
    remarks: '',
  }))
}

/** Record what physically arrived against a purchase order. */
export function CreateGrnScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const params = route.params || {}

  const [poId, setPoId] = useState(params.purchaseOrderId || '')
  /** Keyed by line index; lines themselves are derived from the chosen PO. */
  const [edits, setEdits] = useState<Record<number, Partial<DraftLine>>>({})
  const [invoiceNo, setInvoiceNo] = useState('')
  const [challanNo, setChallanNo] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const pos = useQuery({
    queryKey: ['purchase-orders', params.projectId || ''],
    queryFn: () => purchaseOrdersApi.list(params.projectId ? { projectId: params.projectId } : undefined),
  })

  const selectable = (pos.data || []).filter((po) => po.status !== 'draft' && po.status !== 'delivered')
  const selected = (pos.data || []).find((po) => po._id === poId)

  // Derived, so a deep-linked PO seeds itself the moment the list loads and
  // switching PO cannot leave stale lines behind.
  const lines: DraftLine[] = useMemo(
    () => (selected ? linesFromPo(selected).map((line, i) => ({ ...line, ...edits[i] })) : []),
    [selected, edits],
  )

  const pickPo = (po: PurchaseOrder) => {
    setPoId(po._id)
    setEdits({})
    setError('')
  }

  const setLine = (index: number, patch: Partial<DraftLine>) => {
    setEdits((prev) => ({ ...prev, [index]: { ...prev[index], ...patch } }))
  }

  const total = lines.reduce((sum, line) => sum + (Number(line.receivedQty) || 0) * line.rate, 0)

  const mutation = useMutation({
    mutationFn: () =>
      procurementFlowApi.createGrn({
        purchaseOrder: poId,
        invoiceNo: invoiceNo.trim(),
        challanNo: challanNo.trim(),
        warehouse: warehouse.trim(),
        notes: notes.trim(),
        items: lines.map((line) => ({
          description: line.description,
          unit: line.unit,
          orderedQty: line.orderedQty,
          receivedQty: Number(line.receivedQty) || 0,
          rate: line.rate,
          batchNo: line.batchNo.trim(),
          remarks: line.remarks.trim(),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grns'] })
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not record the GRN'),
  })

  return (
    <FormLayout
      title="Record GRN"
      subtitle="What arrived at site"
      subtitleIcon="download-outline"
      card={false}
      footer={
        <Button
          title="Record GRN"
          onPress={() => {
            if (!poId) {
              setError('Choose the purchase order this delivery is against')
              return
            }
            if (!lines.some((line) => Number(line.receivedQty) > 0)) {
              setError('Enter at least one received quantity')
              return
            }
            setError('')
            mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      }
    >
      <Text style={styles.label}>Purchase order</Text>
      {pos.isLoading ? (
        <Text style={styles.hint}>Loading purchase orders…</Text>
      ) : !selectable.length ? (
        <Text style={styles.hint}>
          No open purchase orders. A GRN is always recorded against a sent PO.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {selectable.map((po) => {
            const active = po._id === poId
            return (
              <Pressable key={po._id} onPress={() => pickPo(po)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {po.poNumber}
                  {refName(po.vendor) ? ` · ${refName(po.vendor)}` : ''}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {lines.length ? (
        <>
          <Text style={styles.label}>Lines received</Text>
          {lines.map((line, i) => (
            <SurfaceCard key={`${line.description}-${i}`}>
              <Text style={styles.lineDesc}>{line.description || `Line ${i + 1}`}</Text>
              <Text style={styles.lineMeta}>
                Ordered {line.orderedQty} · {formatInr(line.rate)} each
              </Text>
              <View style={styles.lineRow}>
                <Input
                  label="Received"
                  keyboardType="numeric"
                  value={line.receivedQty}
                  onChangeText={(v) => setLine(i, { receivedQty: v })}
                  containerStyle={styles.flex}
                />
                <Input
                  label="Batch no."
                  value={line.batchNo}
                  onChangeText={(v) => setLine(i, { batchNo: v })}
                  containerStyle={styles.flex}
                />
              </View>
              <Input
                label="Remarks"
                value={line.remarks}
                onChangeText={(v) => setLine(i, { remarks: v })}
              />
              {Number(line.receivedQty) < line.orderedQty ? (
                <Text style={styles.short}>
                  Short by {line.orderedQty - (Number(line.receivedQty) || 0)} — QC will draft a debit note.
                </Text>
              ) : null}
            </SurfaceCard>
          ))}

          <SurfaceCard>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Value received</Text>
              <Text style={styles.totalValue}>{formatInr(total)}</Text>
            </View>
          </SurfaceCard>
        </>
      ) : null}

      <Text style={styles.label}>Paperwork</Text>
      <Input label="Vendor invoice no." value={invoiceNo} onChangeText={setInvoiceNo} />
      <Input label="Challan no." value={challanNo} onChangeText={setChallanNo} />
      <Input label="Warehouse / store" value={warehouse} onChangeText={setWarehouse} />
      <Input label="Notes" value={notes} onChangeText={setNotes} multiline />

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    label: { ...typography.captionStrong, color: c.textSecondary, marginTop: spacing.sm },
    hint: { ...typography.caption, color: c.textMuted },
    chipRow: { gap: spacing.sm, paddingVertical: 2 },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    lineDesc: { ...typography.bodyStrong, color: c.textPrimary },
    lineMeta: { ...typography.micro, color: c.textMuted, marginTop: 2, marginBottom: spacing.sm },
    lineRow: { flexDirection: 'row', gap: spacing.md },
    flex: { flex: 1 },
    short: { ...typography.micro, color: c.warning, marginTop: 6 },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    totalLabel: { ...typography.caption, color: c.textSecondary },
    totalValue: { ...typography.h3, color: c.textPrimary },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    error: { ...typography.caption, color: c.danger, flex: 1 },
  })
}
