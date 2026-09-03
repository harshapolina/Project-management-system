import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'EditQuotation'>

const GST_PRESETS = [0, 5, 12, 18, 28]

export function EditQuotationScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()
  const { quotationId } = route.params

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => boqApi.get(quotationId),
  })

  const [title, setTitle] = useState<string | null>(null)
  const [versionLabel, setVersionLabel] = useState<string | null>(null)
  const [gst, setGst] = useState<string | null>(null)
  const [discount, setDiscount] = useState<string | null>(null)
  const [chargesPercent, setChargesPercent] = useState<string | null>(null)
  const [chargesLabel, setChargesLabel] = useState<string | null>(null)

  // Each field falls back to the loaded quotation until it is first edited,
  // so the form never blanks out while the fetch is in flight.
  const v = {
    title: title ?? quotation?.title ?? '',
    versionLabel: versionLabel ?? quotation?.versionLabel ?? '',
    gst: gst ?? String(quotation?.gstPercent ?? 18),
    discount: discount ?? String(quotation?.discount ?? 0),
    chargesPercent: chargesPercent ?? String(quotation?.chargesPercent ?? 0),
    chargesLabel: chargesLabel ?? quotation?.chargesLabel ?? '',
  }

  const gstNum = Number(v.gst) || 0
  const discountNum = Number(v.discount) || 0
  const chargesNum = Number(v.chargesPercent) || 0

  const subtotal = quotation?.subtotal || 0
  const chargesAmount = (subtotal * chargesNum) / 100
  const taxable = subtotal + chargesAmount
  const gstAmount = (taxable * gstNum) / 100
  const grand = Math.max(0, taxable + gstAmount - discountNum)

  const mutation = useMutation({
    mutationFn: () =>
      boqApi.update(quotationId, {
        title: v.title.trim(),
        versionLabel: v.versionLabel.trim() || undefined,
        gstPercent: gstNum,
        discount: discountNum,
        chargesPercent: chargesNum,
        chargesLabel: v.chargesLabel.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      navigation.goBack()
    },
    onError: (err) => {
      Alert.alert('Could not save', isApiError(err) ? err.message : 'Try again.')
    },
  })

  if (isLoading || !quotation) {
    return (
      <FormLayout title="Edit quotation" card={false}>
        <LoadingState label="Loading quotation…" variant="detail" />
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="Edit quotation"
      subtitle="Title, version, tax and discount"
      subtitleIcon="create-outline"
      card={false}
      footer={
        <Button
          title="Save changes"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!v.title.trim()}
        />
      }
    >
      <Input label="Title" value={v.title} onChangeText={setTitle} placeholder="Quotation title" />
      <Input
        label="Version label"
        value={v.versionLabel}
        onChangeText={setVersionLabel}
        placeholder="e.g. v2 — after client review"
        hint="Shown next to the status so revisions stay traceable."
      />

      <View style={styles.block}>
        <Text style={styles.label}>GST %</Text>
        <View style={styles.chipWrap}>
          {GST_PRESETS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setGst(String(n))}
              style={[styles.chip, gstNum === n && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: gstNum === n }}
            >
              <Text style={[styles.chipText, gstNum === n && styles.chipTextActive]}>{`${n}%`}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          value={v.gst}
          onChangeText={(t) => setGst(t.replace(/[^\d.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="Custom rate"
        />
      </View>

      <Input
        label="Discount (₹)"
        value={v.discount}
        onChangeText={(t) => setDiscount(t.replace(/[^\d.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <Input
        label="Design & handling %"
        value={v.chargesPercent}
        onChangeText={(t) => setChargesPercent(t.replace(/[^\d.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0"
        hint="Applied to the subtotal before GST."
      />
      {chargesNum > 0 ? (
        <Input
          label="Charge label"
          value={v.chargesLabel}
          onChangeText={setChargesLabel}
          placeholder={`Design & handling (${chargesNum}%)`}
        />
      ) : null}

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Preview</Text>
        <Row label="Subtotal" value={formatInr(subtotal)} />
        {chargesAmount > 0 ? (
          <Row label={v.chargesLabel || `Design & handling (${chargesNum}%)`} value={formatInr(chargesAmount)} />
        ) : null}
        <Row label={`GST (${gstNum}%)`} value={formatInr(gstAmount)} />
        {discountNum > 0 ? <Row label="Discount" value={`− ${formatInr(discountNum)}`} /> : null}
        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>Grand total</Text>
          <Text style={styles.grandValue}>{formatInr(grand)}</Text>
        </View>
      </View>
    </FormLayout>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    block: { gap: spacing.sm },
    label: { ...typography.captionStrong, color: c.textSecondary },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.canvas },
    preview: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 2,
    },
    previewTitle: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 3 },
    rowLabel: { ...typography.caption, color: c.textSecondary, flexShrink: 1 },
    rowValue: { ...typography.caption, color: c.textPrimary },
    grandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
      marginTop: 6,
    },
    grandLabel: { ...typography.bodyStrong, color: c.textPrimary },
    grandValue: { ...typography.h3, color: c.accentHover },
  })
}
