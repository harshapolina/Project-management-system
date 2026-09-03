import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatCard } from '../../components/StatCard'
import { Pill } from '../../components/Badge'
import { SectionLabel } from '../../components/SectionLabel'
import { SegmentedControl } from '../../components/SegmentedControl'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { financeApi } from '../../api/finance'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'
import type { Expense } from '../../types/ops'

type Props = NativeStackScreenProps<MoreStackParamList, 'Finance'>

type Tab = 'overview' | 'expenses' | 'approvals' | 'commitments'
type ExpenseFilter = 'all' | 'mine' | 'pending' | 'approved' | 'rejected'

const EXPENSE_FILTERS: { key: ExpenseFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

function expenseStatusColor(c: AppColors) {
  return { pending: c.warning, approved: c.success, rejected: c.danger }
}

function projectNameOf(value: Expense['projectId']): string | undefined {
  return value && typeof value === 'object' ? value.name : undefined
}

export function FinanceScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  // Only a reviewer gets the Approvals tab; everyone else sees their own queue.
  const canReview = caps.finance

  const [tab, setTab] = useState<Tab>('overview')
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('all')

  const summary = useQuery({ queryKey: ['finance-summary'], queryFn: financeApi.summary })
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: () => financeApi.expenses() })
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => financeApi.payments() })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      financeApi.reviewExpense(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })

  const allExpenses = useMemo(() => expenses.data || [], [expenses.data])

  const pendingApprovals = useMemo(
    () => allExpenses.filter((e) => e.status === 'pending'),
    [allExpenses],
  )

  const visibleExpenses = useMemo(() => {
    if (expenseFilter === 'all') return allExpenses
    if (expenseFilter === 'mine') {
      return allExpenses.filter((e) => e.submittedBy?._id === user?.id)
    }
    return allExpenses.filter((e) => e.status === expenseFilter)
  }, [allExpenses, expenseFilter, user?.id])

  const tabs = useMemo(() => {
    const list: { key: Tab; label: string }[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'expenses', label: 'Expenses' },
    ]
    if (canReview) {
      list.push({
        key: 'approvals',
        label: pendingApprovals.length ? `Approvals (${pendingApprovals.length})` : 'Approvals',
      })
    }
    list.push({ key: 'commitments', label: 'Commitments' })
    return list
  }, [canReview, pendingApprovals.length])

  const chromeProps = {
    title: 'Revenue',
    subtitle: 'Expenses and payments',
    subtitleIcon: 'wallet-outline' as const,
    right: (
      <IconButton
        icon="add-outline"
        label="Add expense"
        tone="ghost"
        onPress={() => navigation.navigate('CreateExpense', undefined)}
      />
    ),
  }

  if (summary.isLoading || expenses.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading finance…" variant="dashboard" />
      </NestedChrome>
    )
  }
  if (summary.isError) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState
          message={isApiError(summary.error) ? summary.error.message : undefined}
          onRetry={() => summary.refetch()}
        />
      </NestedChrome>
    )
  }

  const data = summary.data!

  const renderExpense = (e: Expense, { showReview }: { showReview: boolean }) => {
    const statusColor = expenseStatusColor(colors)[e.status]
    return (
      <SurfaceCard key={e._id}>
        <View style={styles.pnlRow}>
          <Text style={styles.pnlName} numberOfLines={1}>
            {e.category || 'Expense'} — {formatInr(e.amount)}
          </Text>
          <Pill label={e.status} color={statusColor} bg={`${statusColor}22`} />
        </View>
        <Text style={styles.pnlMeta} numberOfLines={2}>
          {[projectNameOf(e.projectId), e.submittedBy?.name, e.note].filter(Boolean).join(' · ') ||
            'No note'}
        </Text>
        {showReview && e.status === 'pending' && canReview ? (
          <View style={styles.reviewRow}>
            <Pressable
              style={[styles.reviewBtn, { backgroundColor: colors.successSoft }]}
              onPress={() => reviewMutation.mutate({ id: e._id, status: 'approved' })}
              disabled={reviewMutation.isPending}
              accessibilityRole="button"
            >
              <Text style={[styles.reviewText, { color: colors.success }]}>Approve</Text>
            </Pressable>
            <Pressable
              style={[styles.reviewBtn, { backgroundColor: colors.dangerSoft }]}
              onPress={() => reviewMutation.mutate({ id: e._id, status: 'rejected' })}
              disabled={reviewMutation.isPending}
              accessibilityRole="button"
            >
              <Text style={[styles.reviewText, { color: colors.danger }]}>Reject</Text>
            </Pressable>
          </View>
        ) : null}
      </SurfaceCard>
    )
  }

  return (
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={tabs} value={tab} onChange={setTab} />

      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || expenses.isRefetching || payments.isRefetching}
            onRefresh={() => {
              summary.refetch()
              expenses.refetch()
              payments.refetch()
            }}
            tintColor={colors.accent}
          />
        }
      >
        {tab === 'overview' ? (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Total budget" value={formatInr(data.totalBudget)} />
              <StatCard label="Total spent" value={formatInr(data.totalSpent)} />
              <StatCard
                label="Variance"
                value={formatInr(data.variance)}
                tone={data.variance < 0 ? 'danger' : 'success'}
              />
              <StatCard
                label="Pending approvals"
                value={data.pendingExpenseCount}
                tone={data.pendingExpenseCount ? 'warning' : 'default'}
                onPress={canReview ? () => setTab('approvals') : undefined}
              />
            </View>

            <View style={styles.section}>
              <SectionLabel count={data.pnl.length}>Project P&L</SectionLabel>
              {data.pnl.length ? (
                data.pnl.map((row) => (
                  <SurfaceCard key={row.id}>
                    <View style={styles.pnlRow}>
                      <Text style={styles.pnlName} numberOfLines={1}>
                        {row.name}
                      </Text>
                      <Pill
                        label={row.health.replace('_', ' ')}
                        color={
                          row.health === 'over_budget'
                            ? colors.danger
                            : row.health === 'on_track'
                              ? colors.success
                              : colors.textMuted
                        }
                        bg={
                          row.health === 'over_budget'
                            ? colors.dangerSoft
                            : row.health === 'on_track'
                              ? colors.successSoft
                              : colors.surfaceRaised
                        }
                      />
                    </View>
                    <Text style={styles.pnlMeta}>
                      Quoted {formatInr(row.quoted)} · Costs {formatInr(row.costs)} · Profit{' '}
                      {formatInr(row.profit)}
                    </Text>
                  </SurfaceCard>
                ))
              ) : (
                <EmptyState title="No P&L yet" body="Project financials will appear here." />
              )}
            </View>

            <View style={styles.section}>
              <SectionLabel count={payments.data?.length}>Payments</SectionLabel>
              {(payments.data || []).map((p) => {
                const name = typeof p.projectId === 'object' ? p.projectId?.name : 'Payment'
                const vendor = typeof p.vendorId === 'object' ? p.vendorId?.name : null
                return (
                  <SurfaceCard key={p._id}>
                    <View style={styles.pnlRow}>
                      <Text style={styles.pnlName} numberOfLines={1}>
                        {vendor || name} — {formatInr(p.amount)}
                      </Text>
                      <Pill
                        label={p.status}
                        color={
                          p.status === 'paid'
                            ? colors.success
                            : p.status === 'due'
                              ? colors.danger
                              : colors.warning
                        }
                      />
                    </View>
                    <Text style={styles.pnlMeta}>{p.note || name}</Text>
                  </SurfaceCard>
                )
              })}
              {!payments.data?.length ? (
                <EmptyState title="No payments yet" body="Vendor payments will show up here." />
              ) : null}
            </View>
          </>
        ) : null}

        {tab === 'expenses' ? (
          <>
            <SegmentedControl
              options={EXPENSE_FILTERS}
              value={expenseFilter}
              onChange={setExpenseFilter}
              inset={false}
              style={{ paddingHorizontal: 0 }}
            />
            <SectionLabel count={visibleExpenses.length}>
              {`${EXPENSE_FILTERS.find((f) => f.key === expenseFilter)?.label || 'All'} expenses`}
            </SectionLabel>
            {visibleExpenses.length ? (
              visibleExpenses.map((e) => renderExpense(e, { showReview: true }))
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="Nothing here"
                body={
                  expenseFilter === 'all'
                    ? 'Recorded expenses will show up here.'
                    : 'No expenses match this filter.'
                }
              />
            )}
          </>
        ) : null}

        {tab === 'approvals' ? (
          <>
            <SectionLabel count={pendingApprovals.length}>Waiting on you</SectionLabel>
            {pendingApprovals.length ? (
              pendingApprovals.map((e) => renderExpense(e, { showReview: true }))
            ) : (
              <EmptyState
                icon="checkmark-done-outline"
                title="Nothing to approve"
                body="Every submitted expense has been reviewed."
              />
            )}
          </>
        ) : null}

        {tab === 'commitments' ? (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="PO committed" value={formatInr(data.committedAmount)} icon="cart-outline" />
              <StatCard label="Total budget" value={formatInr(data.totalBudget)} icon="wallet-outline" />
            </View>

            <SectionLabel count={data.pnl.length}>Budget vs commitment</SectionLabel>
            {data.pnl.length ? (
              data.pnl.map((row) => {
                const overspent = row.profit < 0
                return (
                  <SurfaceCard key={row.id}>
                    <Text style={styles.pnlName} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <View style={styles.ledger}>
                      <LedgerRow label="Budget" value={formatInr(row.quoted)} />
                      <LedgerRow label="Recorded costs" value={formatInr(row.recordedCosts)} />
                      <LedgerRow label="Approved expenses" value={formatInr(row.approvedExpenses)} />
                      <LedgerRow
                        label="Pending expenses"
                        value={formatInr(row.pendingExpenses)}
                        tone={row.pendingExpenses ? colors.warning : undefined}
                      />
                      <LedgerRow label="PO committed" value={formatInr(row.committed)} />
                      <LedgerRow
                        label="Balance"
                        value={formatInr(row.profit)}
                        tone={overspent ? colors.danger : colors.success}
                        strong
                      />
                      <LedgerRow
                        label="Margin"
                        value={row.margin == null ? '—' : `${row.margin}%`}
                        tone={row.margin != null && row.margin < 0 ? colors.danger : undefined}
                        strong
                      />
                    </View>
                  </SurfaceCard>
                )
              })
            ) : (
              <EmptyState
                icon="cart-outline"
                title="No commitments yet"
                body="Approve a quote and raise a purchase order to see committed spend."
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function LedgerRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string
  value: string
  tone?: string
  strong?: boolean
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  return (
    <View style={styles.ledgerRow}>
      <Text style={styles.ledgerLabel}>{label}</Text>
      <Text
        style={[
          strong ? styles.ledgerValueStrong : styles.ledgerValue,
          tone ? { color: tone } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    section: { gap: spacing.md },
    pnlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    pnlName: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    pnlMeta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    reviewRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 8 },
    reviewBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
    reviewText: { ...typography.micro, fontWeight: '700' },
    ledger: { marginTop: spacing.sm },
    ledgerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 7,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    ledgerLabel: { ...typography.caption, color: c.textSecondary },
    ledgerValue: { ...typography.caption, color: c.textPrimary },
    ledgerValueStrong: { ...typography.captionStrong, color: c.textPrimary },
  })
}
