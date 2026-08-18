import { useState } from 'react'
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { Pill } from '../../components/Badge'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, typography } from '../../constants/theme'
import { billingApi } from '../../api/billing'
import { assetUrl } from '../../constants/env'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'
import type { InvoiceStatus } from '../../types/ops'

type Props = NativeStackScreenProps<MoreStackParamList, 'Billing'>

const FILTERS: { key: 'all' | InvoiceStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
]

const STATUS_COLOR: Record<string, string> = {
  unpaid: colors.warning,
  overdue: colors.danger,
  paid: colors.success,
  cancelled: colors.textMuted,
}

function formatDate(value?: string) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export function BillingScreen({ navigation }: Props) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all')
  const [search, setSearch] = useState('')

  const summary = useQuery({ queryKey: ['billing-summary'], queryFn: billingApi.summary })
  const list = useQuery({
    queryKey: ['billing-invoices', status, search],
    queryFn: () =>
      billingApi.invoices({
        status: status === 'all' ? undefined : status,
        q: search.trim() || undefined,
      }),
  })

  const pay = useMutation({
    mutationFn: (id: string) => billingApi.update(id, { status: 'paid' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
    },
  })

  const remove = useMutation({
    mutationFn: billingApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
    },
  })

  if (summary.isLoading && list.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading invoices…" />
      </Screen>
    )
  }
  if (summary.isError) {
    return (
      <Screen>
        <ErrorState
          message={isApiError(summary.error) ? summary.error.message : undefined}
          onRetry={() => summary.refetch()}
        />
      </Screen>
    )
  }

  const s = summary.data
  const invoices = list.data || []

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || list.isRefetching}
            onRefresh={() => {
              summary.refetch()
              list.refetch()
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.stats}>
          <StatCard label="Stored" value={s?.total || 0} />
          <StatCard label="Unpaid" value={formatInr(s?.unpaidAmount || 0)} tone="warning" />
          <StatCard label="Paid this month" value={formatInr(s?.paidThisMonth || 0)} tone="success" />
          <StatCard label="Overdue" value={s?.overdueCount || 0} tone={s?.overdueCount ? 'danger' : 'default'} />
        </View>

        <SegmentedControl options={FILTERS} value={status} onChange={setStatus} />
        <SearchField value={search} onChangeText={setSearch} placeholder="Search invoice, vendor, PO" />

        {!invoices.length ? (
          <EmptyState
            icon="receipt-outline"
            title="No invoices yet"
            body="Store vendor bills for material orders here."
            action="Add invoice"
            onAction={() => navigation.navigate('CreateInvoice')}
          />
        ) : (
          invoices.map((inv) => {
            const vendorName = typeof inv.vendor === 'object' ? inv.vendor?.name : 'Vendor'
            const po = typeof inv.purchaseOrder === 'object' ? inv.purchaseOrder?.poNumber : null
            const color = STATUS_COLOR[inv.status] || colors.textMuted
            return (
              <Card key={inv._id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.number} numberOfLines={1}>
                    {inv.invoiceNumber}
                  </Text>
                  <Pill label={inv.status} color={color} bg={`${color}18`} />
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {[vendorName, po ? `PO ${po}` : null, formatDate(inv.invoiceDate)].filter(Boolean).join('  ·  ')}
                </Text>
                <Text style={styles.amount}>{formatInr(inv.amount)}</Text>
                <View style={styles.actions}>
                  {inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                    <Pressable style={styles.payBtn} onPress={() => pay.mutate(inv._id)}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.payText}>Mark paid</Text>
                    </Pressable>
                  ) : null}
                  {inv.fileUrl ? (
                    <Pressable style={styles.iconBtn} onPress={() => Linking.openURL(assetUrl(inv.fileUrl))}>
                      <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() =>
                      Alert.alert('Delete invoice', `Remove ${inv.invoiceNumber}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(inv._id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </Card>
            )
          })
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('CreateInvoice')} accessibilityLabel="Add invoice">
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120, gap: spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  card: { marginHorizontal: spacing.lg, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  number: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
  amount: { ...typography.h3, color: colors.textPrimary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  payText: { ...typography.micro, color: colors.success },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
