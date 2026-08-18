import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { VendorPicker } from '../../components/VendorPicker'
import { colors, spacing, typography } from '../../constants/theme'
import { billingApi } from '../../api/billing'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateInvoice'>

export function CreateInvoiceScreen({ navigation }: Props) {
  const qc = useQueryClient()
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null)
  const [error, setError] = useState('')

  const options = useQuery({ queryKey: ['billing-options'], queryFn: billingApi.options })

  const vendorPos = useMemo(() => {
    const pos = options.data?.purchaseOrders || []
    if (!vendorId) return pos
    return pos.filter((po) => String((po.vendor as any)?._id || po.vendor) === vendorId)
  }, [options.data, vendorId])

  const mutation = useMutation({
    mutationFn: () =>
      billingApi.create({
        invoiceNumber: invoiceNumber.trim(),
        vendorId,
        purchaseOrderId: purchaseOrderId || undefined,
        amount: Number(amount),
        invoiceDate,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        file,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not save invoice'),
  })

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: ['application/pdf', 'image/*'],
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType })
  }

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Input label="Invoice number" placeholder="INV-1042" value={invoiceNumber} onChangeText={setInvoiceNumber} />
        <VendorPicker label="Vendor" value={vendorId} onChange={(id) => { setVendorId(id); setPurchaseOrderId('') }} />
        {vendorPos.length ? (
          <>
            <Text style={styles.label}>Purchase order (optional)</Text>
            <ScrollChips
              items={vendorPos.map((po) => ({ id: po._id, label: po.poNumber }))}
              value={purchaseOrderId}
              onChange={setPurchaseOrderId}
            />
          </>
        ) : null}
        <Input label="Amount" keyboardType="numeric" placeholder="0" value={amount} onChangeText={setAmount} />
        <Input label="Invoice date (YYYY-MM-DD)" value={invoiceDate} onChangeText={setInvoiceDate} />
        <Input label="Due date (optional)" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ minHeight: 72, textAlignVertical: 'top' }}
        />
        <Button title={file ? file.name : 'Attach PDF or photo'} variant="secondary" onPress={pickFile} fullWidth />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Save invoice"
          fullWidth
          loading={mutation.isPending}
          onPress={() => {
            if (!invoiceNumber.trim()) return setError('Invoice number is required')
            if (!vendorId) return setError('Pick a vendor')
            if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return setError('Enter a valid amount')
            setError('')
            mutation.mutate()
          }}
        />
      </ScrollView>
    </Screen>
  )
}

function ScrollChips({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {items.map((item) => (
        <Text
          key={item.id}
          onPress={() => onChange(value === item.id ? '' : item.id)}
          style={[styles.chip, value === item.id && styles.chipActive]}
        >
          {item.label}
        </Text>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  label: { ...typography.captionStrong, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
  chip: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.rail, color: '#fff' },
})
