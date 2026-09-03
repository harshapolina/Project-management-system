import { useEffect, useMemo, useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { LoadingState, ErrorState } from '../../components/States'
import { formatInr, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { billingApi } from '../../api/billing'
import { assetUrl } from '../../constants/env'
import { isApiError } from '../../api/client'
import type { InvoiceStatus } from '../../types/ops'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'InvoiceDetail'>

const STATUS_OPTIONS: InvoiceStatus[] = ['unpaid', 'paid', 'overdue', 'cancelled']

function statusColorMap(c: AppColors): Record<string, string> {
  return {
    unpaid: c.warning,
    overdue: c.danger,
    paid: c.success,
    cancelled: c.textMuted,
  }
}

export function InvoiceDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const { invoiceId } = route.params

  const { data: invoice, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billing-invoice', invoiceId],
    queryFn: () => billingApi.get(invoiceId),
  })

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('unpaid')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!invoice) return
    setInvoiceNumber(invoice.invoiceNumber)
    setAmount(String(invoice.amount))
    setInvoiceDate(invoice.invoiceDate ? invoice.invoiceDate.slice(0, 10) : '')
    setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : '')
    setNotes(invoice.notes || '')
    setStatus(invoice.status)
  }, [invoice])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['billing-invoice', invoiceId] })
    qc.invalidateQueries({ queryKey: ['billing-invoices'] })
    qc.invalidateQueries({ queryKey: ['billing-summary'] })
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      billingApi.update(invoiceId, {
        invoiceNumber: invoiceNumber.trim(),
        amount: Number(amount),
        invoiceDate: invoiceDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        status,
      }),
    onSuccess: () => {
      setFormError('')
      invalidate()
      navigation.goBack()
    },
    onError: (err) => setFormError(isApiError(err) ? err.message : 'Could not save invoice'),
  })

  const removeMutation = useMutation({
    mutationFn: () => billingApi.remove(invoiceId),
    onSuccess: () => {
      invalidate()
      navigation.goBack()
    },
    onError: (err) => Alert.alert('Could not delete', isApiError(err) ? err.message : 'Try again'),
  })

  if (isLoading) {
    return (
      <FormLayout title="Invoice" subtitle="Loading…" subtitleIcon="receipt-outline">
        <LoadingState label="Loading invoice…" variant="detail" />
      </FormLayout>
    )
  }
  if (isError || !invoice) {
    return (
      <FormLayout title="Invoice" subtitle="Vendor billing" subtitleIcon="receipt-outline">
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </FormLayout>
    )
  }

  const vendorName = typeof invoice.vendor === 'object' ? invoice.vendor?.name : 'Vendor'
  const po = typeof invoice.purchaseOrder === 'object' ? invoice.purchaseOrder?.poNumber : null
  const statusColor = statusColorMap(colors)[status] || colors.textMuted

  return (
    <FormLayout
      title={invoice.invoiceNumber}
      subtitle={vendorName}
      subtitleIcon="receipt-outline"

      footer={
        <View style={styles.footer}>
          <Button
            title="Save changes"
            fullWidth
            loading={saveMutation.isPending}
            onPress={() => {
              if (!invoiceNumber.trim()) return setFormError('Invoice number is required')
              if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return setFormError('Enter a valid amount')
              setFormError('')
              saveMutation.mutate()
            }}
          />
          <Button
            title="Delete invoice"
            variant="secondary"
            fullWidth
            loading={removeMutation.isPending}
            onPress={() =>
              Alert.alert('Delete invoice', `Remove ${invoice.invoiceNumber}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
              ])
            }
          />
        </View>
      }
    >
      <View style={styles.metaRow}>
        <Pill label={status} color={statusColor} bg={`${statusColor}18`} />
        <Text style={styles.amount}>{formatInr(invoice.amount)}</Text>
      </View>
      {po ? <Text style={styles.meta}>PO {po}</Text> : null}

      <Input label="Invoice number" value={invoiceNumber} onChangeText={setInvoiceNumber} />
      <Input label="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <Input label="Invoice date (YYYY-MM-DD)" value={invoiceDate} onChangeText={setInvoiceDate} />
      <Input label="Due date (optional)" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />
      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={[styles.statusChip, status === s && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {invoice.fileUrl ? (
        <Pressable style={styles.fileBtn} onPress={() => Linking.openURL(assetUrl(invoice.fileUrl))}>
          <Ionicons name="open-outline" size={16} color={colors.accent} />
          <Text style={styles.fileText}>{invoice.fileName || 'View attachment'}</Text>
        </Pressable>
      ) : null}

      {formError ? <Text style={styles.error}>{formError}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    footer: { gap: spacing.sm },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    amount: { ...typography.h3, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    label: { ...typography.captionStrong, color: c.textSecondary, marginBottom: spacing.sm },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statusChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surfaceRaised,
    },
    statusChipActive: { backgroundColor: c.accent },
    statusChipText: { ...typography.caption, color: c.textSecondary, textTransform: 'capitalize' },
    statusChipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    fileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: spacing.sm,
    },
    fileText: { ...typography.caption, color: c.accent },
    error: { ...typography.caption, color: c.danger },
  })
}
