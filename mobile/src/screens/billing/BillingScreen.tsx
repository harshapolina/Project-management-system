import { useMemo, useState } from 'react'
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { Fab } from '../../components/Fab'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SectionLabel } from '../../components/SectionLabel'
import { StatCard } from '../../components/StatCard'
import { Pill } from '../../components/Badge'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
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

function statusColorMap(c: AppColors): Record<string, string> {
  return {
    unpaid: c.warning,
    overdue: c.danger,
    paid: c.success,
    cancelled: c.textMuted,
  }
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
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

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

  const pageHeader = (
    <PageHeader
      title="Billing"
      subtitle="Vendor invoices"
      subtitleIcon="receipt-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (summary.isLoading && list.isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading invoices…" variant="dashboard" />
      </Screen>
    )
  }
  if (summary.isError) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
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
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <ScrollView
        contentContainerStyle={listContent}
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

        <SegmentedControl options={FILTERS} value={status} onChange={setStatus} inset={false} />
        <SearchField value={search} onChangeText={setSearch} placeholder="Search invoice, vendor, PO" inset={false} />

        <SectionLabel count={invoices.length}>Invoices</SectionLabel>

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
            const color = statusColorMap(colors)[inv.status] || colors.textMuted
            return (
              <SurfaceCard key={inv._id}>
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
                      <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
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
              </SurfaceCard>
            )
          })
        )}
      </ScrollView>

      <Fab label="Add invoice" onPress={() => navigation.navigate('CreateInvoice')} />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    amount: { ...typography.h3, color: c.textPrimary, marginTop: 4 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    payBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.successSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    payText: { ...typography.micro, color: c.success },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
}
