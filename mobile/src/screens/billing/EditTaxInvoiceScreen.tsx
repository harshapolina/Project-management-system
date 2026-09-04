import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { taxInvoicesApi } from '../../api/taxInvoices'
import { isApiError } from '../../api/client'
import { amountInWords } from '../../lib/amountInWords'
import type {
  GstMode,
  TaxInvoice,
  TaxInvoiceLine,
  TaxInvoiceParty,
  TaxInvoiceType,
} from '../../types/taxInvoice'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'EditTaxInvoice'>

type Section = 'items' | 'parties' | 'meta' | 'company'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'items', label: 'Items & tax' },
  { key: 'parties', label: 'Buyer' },
  { key: 'meta', label: 'Dispatch' },
  { key: 'company', label: 'Seller & bank' },
]

const EMPTY_LINE: TaxInvoiceLine = {
  description: '',
  hsnSac: '998391',
  gstRate: 18,
  qty: 1,
  unit: 'LS',
  rate: 0,
  amount: 0,
}

const GST_MODES: { key: GstMode; label: string }[] = [
  { key: 'cgst_sgst', label: 'CGST + SGST' },
  { key: 'igst', label: 'IGST' },
]

const TYPES: { key: TaxInvoiceType; label: string }[] = [
  { key: 'tax', label: 'Tax invoice' },
  { key: 'proforma', label: 'Proforma' },
]

function dateInput(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

/** Recomputed locally so the totals match what the server will store. */
function totalsFor(items: TaxInvoiceLine[], mode: GstMode, cgst: number, sgst: number, igst: number) {
  const taxable = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0)
  const cgstAmount = mode === 'igst' ? 0 : (taxable * cgst) / 100
  const sgstAmount = mode === 'igst' ? 0 : (taxable * sgst) / 100
  const igstAmount = mode === 'igst' ? (taxable * igst) / 100 : 0
  return { taxable, cgstAmount, sgstAmount, igstAmount, grand: taxable + cgstAmount + sgstAmount + igstAmount }
}

export function EditTaxInvoiceScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const { invoiceId } = route.params

  const [section, setSection] = useState<Section>('items')
  /** Null means "use the stored value" — avoids seeding state in an effect. */
  const [draft, setDraft] = useState<Partial<TaxInvoice> | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tax-invoice', invoiceId],
    queryFn: () => taxInvoicesApi.get(invoiceId),
  })

  const invoice = data
  const value = <K extends keyof TaxInvoice>(key: K): TaxInvoice[K] | undefined =>
    (draft?.[key] as TaxInvoice[K] | undefined) ?? invoice?.[key]

  const set = <K extends keyof TaxInvoice>(key: K, next: TaxInvoice[K]) => {
    setDraft((prev) => ({ ...prev, [key]: next }))
  }

  const setParty = (key: 'buyer' | 'consignee', field: keyof TaxInvoiceParty, next: string) => {
    const current = (value(key) || {}) as TaxInvoiceParty
    set(key, { ...current, [field]: next })
  }

  const items = (value('items') || []) as TaxInvoiceLine[]
  const setItem = (index: number, patch: Partial<TaxInvoiceLine>) => {
    set(
      'items',
      items.map((item, i) => {
        if (i !== index) return item
        const merged = { ...item, ...patch }
        return { ...merged, amount: (Number(merged.qty) || 0) * (Number(merged.rate) || 0) }
      }),
    )
  }

  const mode = (value('gstMode') || 'cgst_sgst') as GstMode
  const cgstPercent = Number(value('cgstPercent') ?? 9)
  const sgstPercent = Number(value('sgstPercent') ?? 9)
  const igstPercent = Number(value('igstPercent') ?? 18)
  const totals = totalsFor(items, mode, cgstPercent, sgstPercent, igstPercent)

  const save = useMutation({
    mutationFn: () =>
      taxInvoicesApi.update(invoiceId, {
        ...draft,
        // The fetched invoice populates projectId; the API expects the id.
        projectId: typeof draft?.projectId === 'object' ? draft.projectId._id : draft?.projectId,
        items: items.map((item) => ({
          ...item,
          qty: Number(item.qty) || 0,
          rate: Number(item.rate) || 0,
          gstRate: Number(item.gstRate) || 0,
          amount: (Number(item.qty) || 0) * (Number(item.rate) || 0),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-invoices'] })
      qc.invalidateQueries({ queryKey: ['tax-invoice', invoiceId] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not save the invoice'),
  })

  if (isLoading || !invoice) {
    return (
      <FormLayout title="Edit invoice" subtitle="GST tax invoice" subtitleIcon="pencil-outline" card={false}>
        <LoadingState label="Loading invoice…" variant="form" />
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="Edit invoice"
      subtitle={invoice.invoiceNumber}
      subtitleIcon="pencil-outline"
      card={false}
      footer={
        <Button
          title="Save invoice"
          onPress={() => {
            if (!String(value('invoiceNumber') || '').trim()) {
              setError('An invoice number is required')
              return
            }
            setError('')
            save.mutate()
          }}
          loading={save.isPending}
          fullWidth
        />
      }
    >
      <SegmentedControl options={SECTIONS} value={section} onChange={setSection} inset={false} />

      {section === 'items' ? (
        <>
          <View style={styles.row}>
            <Input
              label="Invoice number"
              value={String(value('invoiceNumber') || '')}
              onChangeText={(v) => set('invoiceNumber', v)}
              containerStyle={styles.flex}
            />
            <Input
              label="Invoice date"
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              value={dateInput(value('invoiceDate'))}
              onChangeText={(v) => set('invoiceDate', v)}
              containerStyle={styles.flex}
            />
          </View>

          <Text style={styles.label}>Document type</Text>
          <SegmentedControl
            options={TYPES}
            value={(value('invoiceType') || 'tax') as TaxInvoiceType}
            onChange={(v) => set('invoiceType', v)}
            inset={false}
          />

          <Text style={styles.label}>Line items</Text>
          {items.map((item, i) => (
            <SurfaceCard key={item._id || i}>
              <View style={styles.lineHead}>
                <Text style={styles.lineIndex}>Item {i + 1}</Text>
                {items.length > 1 ? (
                  <Pressable
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove item ${i + 1}`}
                    onPress={() =>
                      set(
                        'items',
                        items.filter((_, index) => index !== i),
                      )
                    }
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <Input
                label="Description"
                value={item.description}
                onChangeText={(v) => setItem(i, { description: v })}
                multiline
              />
              <View style={styles.row}>
                <Input
                  label="HSN / SAC"
                  value={item.hsnSac}
                  onChangeText={(v) => setItem(i, { hsnSac: v })}
                  containerStyle={styles.flex}
                />
                <Input
                  label="GST %"
                  keyboardType="numeric"
                  value={String(item.gstRate ?? '')}
                  onChangeText={(v) => setItem(i, { gstRate: Number(v) || 0 })}
                  containerStyle={styles.flex}
                />
              </View>
              <View style={styles.row}>
                <Input
                  label="Quantity"
                  keyboardType="numeric"
                  value={String(item.qty ?? '')}
                  onChangeText={(v) => setItem(i, { qty: Number(v) || 0 })}
                  containerStyle={styles.flex}
                />
                <Input
                  label="Unit"
                  value={item.unit}
                  onChangeText={(v) => setItem(i, { unit: v })}
                  containerStyle={styles.flex}
                />
                <Input
                  label="Rate"
                  keyboardType="numeric"
                  value={String(item.rate ?? '')}
                  onChangeText={(v) => setItem(i, { rate: Number(v) || 0 })}
                  containerStyle={styles.flex}
                />
              </View>
              <Text style={styles.lineAmount}>
                {formatInr((Number(item.qty) || 0) * (Number(item.rate) || 0))}
              </Text>
            </SurfaceCard>
          ))}

          <Pressable style={styles.addLine} onPress={() => set('items', [...items, { ...EMPTY_LINE }])}>
            <Ionicons name="add-outline" size={16} color={colors.accentHover} />
            <Text style={styles.addLineText}>Add line item</Text>
          </Pressable>

          <Text style={styles.label}>GST treatment</Text>
          <SegmentedControl options={GST_MODES} value={mode} onChange={(v) => set('gstMode', v)} inset={false} />
          {mode === 'igst' ? (
            <Input
              label="IGST %"
              keyboardType="numeric"
              value={String(igstPercent)}
              onChangeText={(v) => set('igstPercent', Number(v) || 0)}
            />
          ) : (
            <View style={styles.row}>
              <Input
                label="CGST %"
                keyboardType="numeric"
                value={String(cgstPercent)}
                onChangeText={(v) => set('cgstPercent', Number(v) || 0)}
                containerStyle={styles.flex}
              />
              <Input
                label="SGST %"
                keyboardType="numeric"
                value={String(sgstPercent)}
                onChangeText={(v) => set('sgstPercent', Number(v) || 0)}
                containerStyle={styles.flex}
              />
            </View>
          )}

          <SurfaceCard>
            <Row label="Taxable" value={formatInr(totals.taxable)} styles={styles} />
            {mode === 'igst' ? (
              <Row label={`IGST ${igstPercent}%`} value={formatInr(totals.igstAmount)} styles={styles} />
            ) : (
              <>
                <Row label={`CGST ${cgstPercent}%`} value={formatInr(totals.cgstAmount)} styles={styles} />
                <Row label={`SGST ${sgstPercent}%`} value={formatInr(totals.sgstAmount)} styles={styles} />
              </>
            )}
            <View style={styles.divider} />
            <Row label="Grand total" value={formatInr(totals.grand)} styles={styles} strong />
            <Text style={styles.words}>{amountInWords(totals.grand)}</Text>
          </SurfaceCard>
        </>
      ) : null}

      {section === 'parties' ? (
        <>
          <Text style={styles.label}>Buyer (Bill to)</Text>
          <PartyFields party={(value('buyer') || {}) as TaxInvoiceParty} onChange={(f, v) => setParty('buyer', f, v)} />

          <View style={styles.copyRow}>
            <Pressable
              style={styles.copy}
              onPress={() => set('consignee', { ...((value('buyer') || {}) as TaxInvoiceParty) })}
            >
              <Ionicons name="copy-outline" size={14} color={colors.accentHover} />
              <Text style={styles.copyText}>Same as buyer</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Consignee (Ship to)</Text>
          <PartyFields
            party={(value('consignee') || {}) as TaxInvoiceParty}
            onChange={(f, v) => setParty('consignee', f, v)}
          />
        </>
      ) : null}

      {section === 'meta' ? (
        <>
          <Input
            label="Buyer's order no."
            value={String(value('buyersOrderNo') || '')}
            onChangeText={(v) => set('buyersOrderNo', v)}
          />
          <Input
            label="Buyer's order date"
            value={String(value('buyersOrderDate') || '')}
            onChangeText={(v) => set('buyersOrderDate', v)}
          />
          <Input
            label="Delivery note"
            value={String(value('deliveryNote') || '')}
            onChangeText={(v) => set('deliveryNote', v)}
          />
          <Input
            label="Mode / terms of payment"
            value={String(value('modeOfPayment') || '')}
            onChangeText={(v) => set('modeOfPayment', v)}
          />
          <Input
            label="Reference no."
            value={String(value('referenceNo') || '')}
            onChangeText={(v) => set('referenceNo', v)}
          />
          <Input
            label="Dispatch doc no."
            value={String(value('dispatchDocNo') || '')}
            onChangeText={(v) => set('dispatchDocNo', v)}
          />
          <Input
            label="Dispatched through"
            value={String(value('dispatchedThrough') || '')}
            onChangeText={(v) => set('dispatchedThrough', v)}
          />
          <Input
            label="Destination"
            value={String(value('destination') || '')}
            onChangeText={(v) => set('destination', v)}
          />
          <Input label="Notes" value={String(value('notes') || '')} onChangeText={(v) => set('notes', v)} multiline />
        </>
      ) : null}

      {section === 'company' ? (
        <>
          <Input
            label="Company name"
            value={String(value('companyName') || '')}
            onChangeText={(v) => set('companyName', v)}
          />
          <Input
            label="Company address"
            value={String(value('companyAddress') || '')}
            onChangeText={(v) => set('companyAddress', v)}
            multiline
          />
          <View style={styles.row}>
            <Input
              label="GSTIN / UIN"
              autoCapitalize="characters"
              value={String(value('companyGstin') || '')}
              onChangeText={(v) => set('companyGstin', v)}
              containerStyle={styles.flex}
            />
            <Input
              label="State code"
              value={String(value('companyStateCode') || '')}
              onChangeText={(v) => set('companyStateCode', v)}
              containerStyle={styles.flex}
            />
          </View>
          <Input
            label="State name"
            value={String(value('companyStateName') || '')}
            onChangeText={(v) => set('companyStateName', v)}
          />
          <View style={styles.row}>
            <Input
              label="Phone"
              value={String(value('companyPhone') || '')}
              onChangeText={(v) => set('companyPhone', v)}
              containerStyle={styles.flex}
            />
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={String(value('companyEmail') || '')}
              onChangeText={(v) => set('companyEmail', v)}
              containerStyle={styles.flex}
            />
          </View>
          <Input
            label="Website"
            autoCapitalize="none"
            value={String(value('companyWebsite') || '')}
            onChangeText={(v) => set('companyWebsite', v)}
          />

          <Text style={styles.label}>Bank details</Text>
          <Input
            label="A/c holder's name"
            value={String(value('bank')?.accountName || '')}
            onChangeText={(v) => set('bank', { ...(value('bank') || {}), accountName: v })}
          />
          <Input
            label="Bank name"
            value={String(value('bank')?.bankName || '')}
            onChangeText={(v) => set('bank', { ...(value('bank') || {}), bankName: v })}
          />
          <View style={styles.row}>
            <Input
              label="A/c no."
              value={String(value('bank')?.accountNo || '')}
              onChangeText={(v) => set('bank', { ...(value('bank') || {}), accountNo: v })}
              containerStyle={styles.flex}
            />
            <Input
              label="IFSC"
              autoCapitalize="characters"
              value={String(value('bank')?.ifsc || '')}
              onChangeText={(v) => set('bank', { ...(value('bank') || {}), ifsc: v })}
              containerStyle={styles.flex}
            />
          </View>
          <Input
            label="Branch"
            value={String(value('bank')?.branch || '')}
            onChangeText={(v) => set('bank', { ...(value('bank') || {}), branch: v })}
          />

          <Text style={styles.label}>Signature & footer</Text>
          <Input
            label="Signatory name"
            value={String(value('signatoryName') || '')}
            onChangeText={(v) => set('signatoryName', v)}
          />
          <Input
            label="Signatory title"
            value={String(value('signatoryTitle') || '')}
            onChangeText={(v) => set('signatoryTitle', v)}
          />
          <Input
            label="Declaration"
            value={String(value('declaration') || '')}
            onChangeText={(v) => set('declaration', v)}
            multiline
          />
          <Input
            label="Jurisdiction"
            value={String(value('jurisdiction') || '')}
            onChangeText={(v) => set('jurisdiction', v)}
          />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function PartyFields({
  party,
  onChange,
}: {
  party: TaxInvoiceParty
  onChange: (field: keyof TaxInvoiceParty, value: string) => void
}) {
  return (
    <>
      <Input label="Name" value={party.name || ''} onChangeText={(v) => onChange('name', v)} />
      <Input
        label="Address"
        value={party.address || ''}
        onChangeText={(v) => onChange('address', v)}
        multiline
      />
      <Input
        label="GSTIN / UIN"
        autoCapitalize="characters"
        value={party.gstin || ''}
        onChangeText={(v) => onChange('gstin', v)}
      />
      <Input label="State name" value={party.stateName || ''} onChangeText={(v) => onChange('stateName', v)} />
      <Input label="State code" value={party.stateCode || ''} onChangeText={(v) => onChange('stateCode', v)} />
    </>
  )
}

function Row({
  label,
  value,
  strong,
  styles,
}: {
  label: string
  value: string
  strong?: boolean
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={strong ? styles.totalStrong : styles.totalLabel}>{label}</Text>
      <Text style={strong ? styles.totalStrong : styles.totalValue}>{value}</Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    label: { ...typography.captionStrong, color: c.textSecondary, marginTop: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    flex: { flex: 1 },
    lineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lineIndex: { ...typography.captionStrong, color: c.textMuted },
    lineAmount: { ...typography.bodyStrong, color: c.textPrimary, textAlign: 'right', marginTop: 4 },
    addLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
    },
    addLineText: { ...typography.captionStrong, color: c.accentHover },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    totalLabel: { ...typography.caption, color: c.textSecondary },
    totalValue: { ...typography.caption, color: c.textPrimary },
    totalStrong: { ...typography.bodyStrong, color: c.textPrimary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.sm },
    words: { ...typography.micro, color: c.textMuted, marginTop: 6, fontStyle: 'italic' },
    copyRow: { flexDirection: 'row' },
    copy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
    },
    copyText: { ...typography.micro, fontWeight: '600', color: c.accentHover },
    error: { ...typography.caption, color: c.danger },
  })
}
