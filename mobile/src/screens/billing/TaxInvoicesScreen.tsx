import { useMemo, useState } from 'react'
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { Fab } from '../../components/Fab'
import { Pill } from '../../components/Badge'
import { StatCard } from '../../components/StatCard'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { taxInvoicesApi } from '../../api/taxInvoices'
import { isApiError } from '../../api/client'
import type { TaxInvoice, TaxInvoiceStatus } from '../../types/taxInvoice'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'TaxInvoices'>

const FILTERS: { key: TaxInvoiceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'issued', label: 'Issued' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
]

export function statusColor(c: AppColors, status: TaxInvoiceStatus): string {
  return {
    draft: c.textMuted,
    issued: c.warning,
    paid: c.success,
    cancelled: c.danger,
  }[status]
}

function invoiceDate(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
  } catch {
    return ''
  }
}

/** GST tax invoices raised to clients — the counterpart of the web TaxInvoicesPage. */
export function TaxInvoicesScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()

  const [status, setStatus] = useState<TaxInvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['tax-invoices', status, search],
    queryFn: () =>
      taxInvoicesApi.list({
        status: status === 'all' ? undefined : status,
        q: search.trim() || undefined,
      }),
  })

  const createBlank = useMutation({
    mutationFn: () =>
      taxInvoicesApi.create({
        invoiceNumber: `CAPL-${(data?.length || 0) + 1}`,
        items: [
          { description: '', hsnSac: '998391', gstRate: 18, qty: 1, unit: 'LS', rate: 0, amount: 0 },
        ],
      }),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ['tax-invoices'] })
      navigation.navigate('EditTaxInvoice', { invoiceId: invoice._id })
    },
    onError: (err) => Alert.alert('Could not create', isApiError(err) ? err.message : 'Try again'),
  })

  const chromeProps = {
    title: 'Tax invoices',
    subtitle: 'GST invoices to clients',
    subtitleIcon: 'document-text-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading invoices…" variant="list" />
      </NestedChrome>
    )
  }
  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const invoices: TaxInvoice[] = data || []
  const billed = invoices
    .filter((inv) => inv.status !== 'cancelled' && inv.status !== 'draft')
    .reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0)
  const collected = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0)
  const gst = invoices
    .filter((inv) => inv.status !== 'cancelled' && inv.status !== 'draft')
    .reduce(
      (sum, inv) =>
        sum + (Number(inv.cgstAmount) || 0) + (Number(inv.sgstAmount) || 0) + (Number(inv.igstAmount) || 0),
      0,
    )

  return (
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={FILTERS} value={status} onChange={setStatus} />
      <SearchField value={search} onChangeText={setSearch} placeholder="Search invoice or buyer" />
      <FlatList
        data={invoices}
        keyExtractor={(inv) => inv._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          invoices.length ? (
            <View style={styles.stats}>
              <StatCard label="Invoices" value={invoices.length} />
              <StatCard label="Billed" value={formatInr(billed)} />
              <StatCard label="Collected" value={formatInr(collected)} tone="success" />
              <StatCard label="GST charged" value={formatInr(gst)} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const color = statusColor(colors, item.status)
          const project = typeof item.projectId === 'object' ? item.projectId?.name : undefined
          return (
            <SurfaceCard
              onPress={() => navigation.navigate('TaxInvoiceDetail', { invoiceId: item._id })}
            >
              <View style={styles.row}>
                <Text style={styles.number} numberOfLines={1}>
                  {item.invoiceNumber}
                </Text>
                <Pill label={item.status} color={color} bg={`${color}18`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[item.buyer?.name, project, invoiceDate(item.invoiceDate)].filter(Boolean).join('  ·  ')}
              </Text>
              <Text style={styles.amount}>{formatInr(item.grandTotal)}</Text>
              <Text style={styles.tax}>
                {formatInr(item.taxableAmount)} taxable ·{' '}
                {item.gstMode === 'igst'
                  ? `IGST ${item.igstPercent}%`
                  : `CGST ${item.cgstPercent}% + SGST ${item.sgstPercent}%`}
                {item.invoiceType === 'proforma' ? ' · Proforma' : ''}
              </Text>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No tax invoices"
            body="Raise a GST invoice from scratch, or convert an approved BOQ into one."
            action="New tax invoice"
            onAction={() => createBlank.mutate()}
          />
        }
      />
      <Fab
        label="New tax invoice"
        icon="document-text-outline"
        onPress={() => createBlank.mutate()}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    amount: { ...typography.h3, color: c.textPrimary, marginTop: 4 },
    tax: { ...typography.micro, color: c.textMuted, marginTop: 4 },
  })
}
