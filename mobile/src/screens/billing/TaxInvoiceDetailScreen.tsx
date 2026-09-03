import { useMemo, useState } from 'react'
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { IconButton } from '../../components/IconButton'
import { Pill } from '../../components/Badge'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { taxInvoicesApi } from '../../api/taxInvoices'
import { isApiError } from '../../api/client'
import { amountInWords } from '../../lib/amountInWords'
import { printTaxInvoice, shareTaxInvoicePdf } from '../../lib/taxInvoicePdf'
import { useAuthStore } from '../../store/authStore'
import { statusColor } from './TaxInvoicesScreen'
import type { TaxInvoiceParty, TaxInvoiceStatus } from '../../types/taxInvoice'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'TaxInvoiceDetail'>

const NEXT_STATUS: Partial<Record<TaxInvoiceStatus, { to: TaxInvoiceStatus; label: string }[]>> = {
  draft: [{ to: 'issued', label: 'Mark issued' }],
  issued: [
    { to: 'paid', label: 'Mark paid' },
    { to: 'cancelled', label: 'Cancel' },
  ],
  paid: [{ to: 'issued', label: 'Reopen' }],
  cancelled: [{ to: 'draft', label: 'Back to draft' }],
}

function fmtDate(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function Party({ title, party, styles }: { title: string; party?: TaxInvoiceParty; styles: Styles }) {
  return (
    <SurfaceCard>
      <Text style={styles.partyTitle}>{title}</Text>
      <Text style={styles.partyName}>{party?.name || '—'}</Text>
      {party?.address ? <Text style={styles.partyLine}>{party.address}</Text> : null}
      {party?.gstin ? <Text style={styles.partyLine}>GSTIN/UIN: {party.gstin}</Text> : null}
      {party?.stateName ? (
        <Text style={styles.partyLine}>
          State: {party.stateName}
          {party.stateCode ? `, code ${party.stateCode}` : ''}
        </Text>
      ) : null}
    </SurfaceCard>
  )
}

/** A single GST invoice, with the same print output as the web document. */
export function TaxInvoiceDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const tenant = useAuthStore((s) => s.tenant)
  const { invoiceId } = route.params
  const [busy, setBusy] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tax-invoice', invoiceId],
    queryFn: () => taxInvoicesApi.get(invoiceId),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tax-invoices'] })
    qc.invalidateQueries({ queryKey: ['tax-invoice', invoiceId] })
  }

  const setStatus = useMutation({
    mutationFn: (status: TaxInvoiceStatus) => taxInvoicesApi.update(invoiceId, { status }),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not update', isApiError(err) ? err.message : 'Try again'),
  })

  const remove = useMutation({
    mutationFn: () => taxInvoicesApi.remove(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-invoices'] })
      navigation.goBack()
    },
    onError: (err) => Alert.alert('Could not delete', isApiError(err) ? err.message : 'Try again'),
  })

  const run = async (label: string, work: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await work()
    } catch (err) {
      Alert.alert(`Could not ${label}`, err instanceof Error ? err.message : 'Try again')
    } finally {
      setBusy(false)
    }
  }

  const actions = [
    {
      label: 'Share PDF',
      run: () => run('share', () => shareTaxInvoicePdf({ invoice: data!, tenant })),
    },
    { label: 'Print', run: () => run('print', () => printTaxInvoice({ invoice: data!, tenant })) },
    { label: 'Edit invoice', run: () => navigation.navigate('EditTaxInvoice', { invoiceId }) },
    {
      label: 'Delete invoice',
      destructive: true,
      run: () =>
        Alert.alert('Delete invoice', `Delete ${data?.invoiceNumber}? This cannot be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
        ]),
    },
  ]

  const openActions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((a) => a.label), 'Cancel'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
        },
        (index) => actions[index]?.run(),
      )
      return
    }
    Alert.alert('Invoice actions', undefined, [
      ...actions.map((a) => ({
        text: a.label,
        style: a.destructive ? ('destructive' as const) : undefined,
        onPress: a.run,
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  const chromeProps = {
    title: 'Tax invoice',
    subtitle: data?.invoiceNumber || 'Invoice',
    subtitleIcon: 'document-text-outline' as const,
    right: data ? (
      <IconButton
        icon={busy ? 'hourglass-outline' : 'ellipsis-horizontal'}
        label="Invoice actions"
        tone="ghost"
        onPress={() => {
          if (!busy) openActions()
        }}
      />
    ) : null,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading invoice…" variant="form" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState
          message={isApiError(error) ? error.message : 'Invoice not found'}
          onRetry={() => refetch()}
        />
      </NestedChrome>
    )
  }

  const invoice = data
  const color = statusColor(colors, invoice.status)
  const isIgst = invoice.gstMode === 'igst'
  const transitions = NEXT_STATUS[invoice.status] || []

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView contentContainerStyle={listContent} showsVerticalScrollIndicator={false}>
        <SurfaceCard>
          <View style={styles.row}>
            <Text style={styles.number}>{invoice.invoiceNumber}</Text>
            <Pill label={invoice.status} color={color} bg={`${color}18`} />
          </View>
          <Text style={styles.meta}>
            {[
              invoice.invoiceType === 'proforma' ? 'Proforma' : 'Tax invoice',
              fmtDate(invoice.invoiceDate),
              typeof invoice.projectId === 'object' ? invoice.projectId?.name : '',
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          <Text style={styles.grand}>{formatInr(invoice.grandTotal)}</Text>
          <Text style={styles.words}>{amountInWords(invoice.grandTotal)}</Text>
        </SurfaceCard>

        {transitions.length ? (
          <View style={styles.actions}>
            {transitions.map((t) => (
              <Pressable
                key={t.to}
                style={[styles.action, t.to === 'cancelled' && styles.destructive]}
                disabled={setStatus.isPending}
                onPress={() => setStatus.mutate(t.to)}
              >
                <Text
                  style={[
                    styles.actionText,
                    t.to === 'cancelled' && { color: colors.danger },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <SectionLabel count={invoice.items.length}>Line items</SectionLabel>
        {invoice.items.map((item, i) => (
          <SurfaceCard key={item._id || i}>
            <Text style={styles.itemDesc}>{item.description || `Line ${i + 1}`}</Text>
            <Text style={styles.itemMeta}>
              {item.qty} {item.unit} × {formatInr(item.rate)} · HSN/SAC {item.hsnSac || '—'} · GST{' '}
              {item.gstRate}%
            </Text>
            <Text style={styles.itemAmount}>{formatInr(item.amount)}</Text>
          </SurfaceCard>
        ))}

        <SectionLabel>Tax summary</SectionLabel>
        <SurfaceCard>
          <TotalRow label="Taxable value" value={formatInr(invoice.taxableAmount)} styles={styles} />
          {isIgst ? (
            <TotalRow
              label={`IGST @ ${invoice.igstPercent}%`}
              value={formatInr(invoice.igstAmount)}
              styles={styles}
            />
          ) : (
            <>
              <TotalRow
                label={`CGST @ ${invoice.cgstPercent}%`}
                value={formatInr(invoice.cgstAmount)}
                styles={styles}
              />
              <TotalRow
                label={`SGST @ ${invoice.sgstPercent}%`}
                value={formatInr(invoice.sgstAmount)}
                styles={styles}
              />
            </>
          )}
          <View style={styles.divider} />
          <TotalRow label="Grand total" value={formatInr(invoice.grandTotal)} styles={styles} strong />
        </SurfaceCard>

        <SectionLabel>Parties</SectionLabel>
        <Party title="Buyer (Bill to)" party={invoice.buyer} styles={styles} />
        <Party title="Consignee (Ship to)" party={invoice.consignee} styles={styles} />

        <SectionLabel>Seller</SectionLabel>
        <SurfaceCard>
          <Text style={styles.partyName}>{invoice.companyName || tenant?.name}</Text>
          {invoice.companyAddress ? <Text style={styles.partyLine}>{invoice.companyAddress}</Text> : null}
          {invoice.companyGstin ? <Text style={styles.partyLine}>GSTIN/UIN: {invoice.companyGstin}</Text> : null}
          {invoice.companyStateName ? (
            <Text style={styles.partyLine}>
              State: {invoice.companyStateName}
              {invoice.companyStateCode ? `, code ${invoice.companyStateCode}` : ''}
            </Text>
          ) : null}
          <Text style={styles.partyLine}>
            {[invoice.companyPhone, invoice.companyEmail, invoice.companyWebsite].filter(Boolean).join(' · ')}
          </Text>
        </SurfaceCard>

        {invoice.bank?.bankName || invoice.bank?.accountNo ? (
          <>
            <SectionLabel>Bank details</SectionLabel>
            <SurfaceCard>
              <Text style={styles.partyLine}>A/c holder: {invoice.bank?.accountName || '—'}</Text>
              <Text style={styles.partyLine}>Bank: {invoice.bank?.bankName || '—'}</Text>
              <Text style={styles.partyLine}>A/c no.: {invoice.bank?.accountNo || '—'}</Text>
              <Text style={styles.partyLine}>
                Branch & IFSC: {[invoice.bank?.branch, invoice.bank?.ifsc].filter(Boolean).join(' & ') || '—'}
              </Text>
            </SurfaceCard>
          </>
        ) : null}

        {invoice.notes ? (
          <SurfaceCard>
            <View style={styles.noteRow}>
              <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
              <Text style={styles.partyLine}>{invoice.notes}</Text>
            </View>
          </SurfaceCard>
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function TotalRow({
  label,
  value,
  strong,
  styles,
}: {
  label: string
  value: string
  strong?: boolean
  styles: Styles
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={strong ? styles.totalLabelStrong : styles.totalLabel}>{label}</Text>
      <Text style={strong ? styles.totalValueStrong : styles.totalValue}>{value}</Text>
    </View>
  )
}

type Styles = ReturnType<typeof createStyles>

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    grand: { ...typography.h1, color: c.textPrimary, marginTop: 6 },
    words: { ...typography.micro, color: c.textMuted, marginTop: 4, fontStyle: 'italic' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    action: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 9,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
    },
    destructive: { backgroundColor: c.dangerSoft },
    actionText: { ...typography.captionStrong, color: c.accentHover },
    itemDesc: { ...typography.bodyStrong, color: c.textPrimary },
    itemMeta: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    itemAmount: { ...typography.bodyStrong, color: c.textPrimary, marginTop: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    totalLabel: { ...typography.caption, color: c.textSecondary },
    totalValue: { ...typography.caption, color: c.textPrimary },
    totalLabelStrong: { ...typography.bodyStrong, color: c.textPrimary },
    totalValueStrong: { ...typography.bodyStrong, color: c.textPrimary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.sm },
    partyTitle: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
    partyName: { ...typography.bodyStrong, color: c.textPrimary, marginTop: 2 },
    partyLine: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
    noteRow: { flexDirection: 'row', gap: spacing.sm },
  })
}
