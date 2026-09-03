import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { procurementFlowApi, type UpdateVendorPaymentPayload } from '../../api/procurementFlow'
import { isApiError } from '../../api/client'
import {
  AGING_LABELS,
  MATCH_LABELS,
  PAYMENT_STATUS_LABELS,
  agingColor,
  paymentStatusColor,
  refName,
  shortDate,
} from './procurementMeta'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'VendorPaymentDetail'>

const CHANNELS = ['call', 'whatsapp', 'email', 'visit']

/** Adjust deductions, log a follow-up, and record how the vendor was paid. */
export function VendorPaymentDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const { paymentId, paymentNumber } = route.params

  const [debitAmount, setDebitAmount] = useState<string | null>(null)
  const [tdsAmount, setTdsAmount] = useState<string | null>(null)
  const [otherDeductions, setOtherDeductions] = useState<string | null>(null)
  const [mode, setMode] = useState<string | null>(null)
  const [utr, setUtr] = useState<string | null>(null)
  const [bankAccount, setBankAccount] = useState<string | null>(null)
  const [followUpNote, setFollowUpNote] = useState('')
  const [followUpChannel, setFollowUpChannel] = useState('call')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['vendor-payments', ''],
    queryFn: () => procurementFlowApi.payments(),
  })
  const payment = (data || []).find((p) => p._id === paymentId)

  const patch = useMutation({
    mutationFn: (body: UpdateVendorPaymentPayload) => procurementFlowApi.updatePayment(paymentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-payments'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
      setFollowUpNote('')
    },
    onError: (err) => Alert.alert('Could not save', isApiError(err) ? err.message : 'Try again'),
  })

  const chromeProps = {
    title: 'Payment',
    subtitle: paymentNumber || 'Vendor payment',
    subtitleIcon: 'wallet-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading payment…" variant="form" />
      </NestedChrome>
    )
  }
  if (isError || !payment) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState
          message={isApiError(error) ? error.message : 'That payment is no longer available'}
          onRetry={() => refetch()}
        />
      </NestedChrome>
    )
  }

  // Null drafts fall back to the stored value, so nothing is seeded in an effect.
  const debit = debitAmount ?? String(payment.debitAmount || '')
  const tds = tdsAmount ?? String(payment.tdsAmount || '')
  const other = otherDeductions ?? String(payment.otherDeductions || '')
  const payMode = mode ?? payment.mode ?? ''
  const payUtr = utr ?? payment.utr ?? ''
  const payBank = bankAccount ?? payment.bankAccount ?? ''

  const net = Math.max(
    0,
    (Number(payment.invoiceAmount) || 0) - (Number(debit) || 0) - (Number(tds) || 0) - (Number(other) || 0),
  )
  const settled = payment.status === 'paid' || payment.status === 'cancelled'
  const statusColor = paymentStatusColor(colors, payment.status)
  const aging = agingColor(colors, payment.agingBucket)

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView contentContainerStyle={listContent} showsVerticalScrollIndicator={false}>
        <SurfaceCard>
          <View style={styles.row}>
            <Text style={styles.number}>{payment.paymentNumber}</Text>
            <Pill label={PAYMENT_STATUS_LABELS[payment.status]} color={statusColor} bg={`${statusColor}18`} />
          </View>
          <Text style={styles.meta}>
            {[
              refName(payment.vendor),
              refName(payment.purchaseOrder, 'poNumber') && `PO ${refName(payment.purchaseOrder, 'poNumber')}`,
              refName(payment.vendorInvoice, 'invoiceNumber'),
              refName(payment.projectId),
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          <Text style={styles.amount}>{formatInr(net)}</Text>
          <View style={styles.pills}>
            <Pill
              label={MATCH_LABELS[payment.matchStatus]}
              color={payment.matchStatus === 'mismatch' ? colors.danger : colors.textSecondary}
              bg={payment.matchStatus === 'mismatch' ? `${colors.danger}18` : colors.surfaceRaised}
            />
            <Pill label={AGING_LABELS[payment.agingBucket]} color={aging} bg={`${aging}18`} />
            {payment.dueDate ? (
              <Pill
                label={`Due ${shortDate(payment.dueDate)}`}
                color={colors.textSecondary}
                bg={colors.surfaceRaised}
              />
            ) : null}
          </View>
          {payment.matchNotes ? <Text style={styles.matchNotes}>{payment.matchNotes}</Text> : null}
        </SurfaceCard>

        {!settled ? (
          <>
            <SectionLabel>Deductions</SectionLabel>
            <SurfaceCard>
              <View style={styles.inputRow}>
                <Input
                  label="Debit notes"
                  keyboardType="numeric"
                  value={debit}
                  onChangeText={setDebitAmount}
                  containerStyle={styles.flex}
                />
                <Input
                  label="TDS"
                  keyboardType="numeric"
                  value={tds}
                  onChangeText={setTdsAmount}
                  containerStyle={styles.flex}
                />
                <Input
                  label="Other"
                  keyboardType="numeric"
                  value={other}
                  onChangeText={setOtherDeductions}
                  containerStyle={styles.flex}
                />
              </View>
              <Text style={styles.netHint}>
                {formatInr(payment.invoiceAmount)} invoiced → {formatInr(net)} payable
              </Text>
              <Button
                title="Save deductions"
                variant="secondary"
                onPress={() =>
                  patch.mutate({
                    debitAmount: Number(debit) || 0,
                    tdsAmount: Number(tds) || 0,
                    otherDeductions: Number(other) || 0,
                  })
                }
                loading={patch.isPending}
                fullWidth
              />
            </SurfaceCard>

            <SectionLabel>Payment details</SectionLabel>
            <SurfaceCard>
              <Input label="Mode" placeholder="NEFT, RTGS, cheque…" value={payMode} onChangeText={setMode} />
              <Input label="Bank account" value={payBank} onChangeText={setBankAccount} />
              <Input label="UTR / reference" value={payUtr} onChangeText={setUtr} autoCapitalize="characters" />
              <Button
                title="Save payment details"
                variant="secondary"
                onPress={() =>
                  patch.mutate({ mode: payMode, bankAccount: payBank, utr: payUtr })
                }
                loading={patch.isPending}
                fullWidth
              />
            </SurfaceCard>

            {payment.status === 'approved' ? (
              <Button
                title={`Mark ${formatInr(net)} paid`}
                onPress={() =>
                  Alert.alert('Mark paid', `Record ${formatInr(net)} as paid to ${refName(payment.vendor)}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Mark paid',
                      onPress: () =>
                        patch.mutate({
                          status: 'paid',
                          paidAmount: net,
                          mode: payMode || 'NEFT',
                          utr: payUtr,
                          bankAccount: payBank,
                        }),
                    },
                  ])
                }
                loading={patch.isPending}
                fullWidth
              />
            ) : null}

            <Pressable
              style={styles.cancel}
              onPress={() =>
                Alert.alert('Cancel payment', `Cancel ${payment.paymentNumber}?`, [
                  { text: 'Keep', style: 'cancel' },
                  {
                    text: 'Cancel payment',
                    style: 'destructive',
                    onPress: () => patch.mutate({ status: 'cancelled' }),
                  },
                ])
              }
            >
              <Text style={styles.cancelText}>Cancel this payment</Text>
            </Pressable>
          </>
        ) : (
          <SurfaceCard>
            <Text style={styles.settled}>
              {payment.status === 'paid'
                ? `Paid ${formatInr(payment.paidAmount || payment.netPayable)}${
                    payment.paidAt ? ` on ${shortDate(payment.paidAt)}` : ''
                  }${payment.utr ? ` · UTR ${payment.utr}` : ''}`
                : 'This payment was cancelled.'}
            </Text>
          </SurfaceCard>
        )}

        <SectionLabel count={payment.followUps?.length}>Follow-ups</SectionLabel>
        {(payment.followUps || []).map((f, i) => (
          <SurfaceCard key={f._id || i}>
            <Text style={styles.followNote}>{f.note || 'Contacted the vendor'}</Text>
            <Text style={styles.followMeta}>
              {[f.channel, f.contact, refName(f.by), shortDate(f.at)].filter(Boolean).join('  ·  ')}
            </Text>
          </SurfaceCard>
        ))}

        {!settled ? (
          <SurfaceCard>
            <Text style={styles.label}>Log a follow-up</Text>
            <View style={styles.chipRow}>
              {CHANNELS.map((channel) => (
                <Pressable
                  key={channel}
                  onPress={() => setFollowUpChannel(channel)}
                  style={[styles.chip, followUpChannel === channel && styles.chipActive]}
                >
                  <Text style={[styles.chipText, followUpChannel === channel && styles.chipTextActive]}>
                    {channel}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Input label="What was said" value={followUpNote} onChangeText={setFollowUpNote} multiline />
            <Button
              title="Log follow-up"
              variant="secondary"
              disabled={!followUpNote.trim()}
              onPress={() =>
                patch.mutate({ followUp: { channel: followUpChannel, note: followUpNote.trim() } })
              }
              loading={patch.isPending}
              fullWidth
            />
          </SurfaceCard>
        ) : null}

        {payment.notes ? (
          <SurfaceCard>
            <View style={styles.noteRow}>
              <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
              <Text style={styles.notes}>{payment.notes}</Text>
            </View>
          </SurfaceCard>
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    amount: { ...typography.h1, color: c.textPrimary, marginTop: 6 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    matchNotes: { ...typography.micro, color: c.textSecondary, marginTop: 6 },
    inputRow: { flexDirection: 'row', gap: spacing.sm },
    flex: { flex: 1 },
    netHint: { ...typography.micro, color: c.textMuted, marginVertical: spacing.sm },
    label: { ...typography.captionStrong, color: c.textSecondary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    chipActive: { backgroundColor: c.accent },
    chipText: { ...typography.micro, color: c.textSecondary },
    chipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    followNote: { ...typography.body, color: c.textPrimary },
    followMeta: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    settled: { ...typography.body, color: c.textSecondary },
    cancel: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { ...typography.captionStrong, color: c.danger },
    noteRow: { flexDirection: 'row', gap: spacing.sm },
    notes: { ...typography.caption, color: c.textSecondary, flex: 1 },
  })
}
