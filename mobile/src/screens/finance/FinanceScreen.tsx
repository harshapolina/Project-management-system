import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatCard } from '../../components/StatCard'
import { Pill } from '../../components/Badge'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
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

type Props = NativeStackScreenProps<MoreStackParamList, 'Finance'>

function expenseStatusColor(c: AppColors) {
  return { pending: c.warning, approved: c.success, rejected: c.danger }
}

export function FinanceScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const summary = useQuery({ queryKey: ['finance-summary'], queryFn: financeApi.summary })
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: () => financeApi.expenses() })
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => financeApi.payments() })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => financeApi.reviewExpense(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })

  if (summary.isLoading || expenses.isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        <AppNavBar />
        <PageHeader
          title="Revenue"
          subtitle="Expenses and payments"
          subtitleIcon="wallet-outline"
          onBack={() => navigation.goBack()}
        />
        <LoadingState label="Loading finance…" variant="dashboard" />
      </Screen>
    )
  }
  if (summary.isError) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        <AppNavBar />
        <PageHeader
          title="Revenue"
          subtitle="Expenses and payments"
          subtitleIcon="wallet-outline"
          onBack={() => navigation.goBack()}
        />
        <ErrorState message={isApiError(summary.error) ? summary.error.message : undefined} onRetry={() => summary.refetch()} />
      </Screen>
    )
  }

  const data = summary.data!

  return (
    <Screen padded={false} edges={['left', 'right']}>
      <AppNavBar />
      <PageHeader
        title="Revenue"
        subtitle="Expenses and payments"
        subtitleIcon="wallet-outline"
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            icon="add-outline"
            label="Add expense"
            tone="ghost"
            onPress={() => navigation.navigate('CreateExpense', undefined)}
          />
        }
      />
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
        <View style={styles.statsGrid}>
          <StatCard label="Total budget" value={formatInr(data.totalBudget)} />
          <StatCard label="Total spent" value={formatInr(data.totalSpent)} />
          <StatCard label="Variance" value={formatInr(data.variance)} tone={data.variance < 0 ? 'danger' : 'success'} />
          <StatCard label="Pending approvals" value={data.pendingExpenseCount} tone={data.pendingExpenseCount ? 'warning' : 'default'} />
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
                    color={row.health === 'over_budget' ? colors.danger : row.health === 'on_track' ? colors.success : colors.textMuted}
                    bg={row.health === 'over_budget' ? colors.dangerSoft : row.health === 'on_track' ? colors.successSoft : colors.surfaceRaised}
                  />
                </View>
                <Text style={styles.pnlMeta}>
                  Quoted {formatInr(row.quoted)} · Costs {formatInr(row.costs)} · Profit {formatInr(row.profit)}
                </Text>
              </SurfaceCard>
            ))
          ) : (
            <EmptyState title="No P&L yet" body="Project financials will appear here." />
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel count={expenses.data?.length}>Expenses</SectionLabel>
          {(expenses.data || []).map((e) => {
            const pName = typeof e.projectId === 'object' ? e.projectId?.name : undefined
            return (
              <SurfaceCard key={e._id}>
                <View style={styles.pnlRow}>
                  <Text style={styles.pnlName} numberOfLines={1}>
                    {e.category || 'Expense'} — {formatInr(e.amount)}
                  </Text>
                  <Pill label={e.status} color={expenseStatusColor(colors)[e.status]} bg={`${expenseStatusColor(colors)[e.status]}22`} />
                </View>
                <Text style={styles.pnlMeta} numberOfLines={1}>
                  {[pName, e.note].filter(Boolean).join(' · ') || 'No note'}
                </Text>
                {e.status === 'pending' && caps.finance ? (
                  <View style={styles.reviewRow}>
                    <Pressable
                      style={[styles.reviewBtn, { backgroundColor: colors.successSoft }]}
                      onPress={() => reviewMutation.mutate({ id: e._id, status: 'approved' })}
                    >
                      <Text style={[styles.reviewText, { color: colors.success }]}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.reviewBtn, { backgroundColor: colors.dangerSoft }]}
                      onPress={() => reviewMutation.mutate({ id: e._id, status: 'rejected' })}
                    >
                      <Text style={[styles.reviewText, { color: colors.danger }]}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </SurfaceCard>
            )
          })}
          {!expenses.data?.length ? <EmptyState title="No expenses yet" body="Recorded expenses will show up here." /> : null}
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
                    color={p.status === 'paid' ? colors.success : p.status === 'due' ? colors.danger : colors.warning}
                  />
                </View>
                <Text style={styles.pnlMeta}>{p.note || name}</Text>
              </SurfaceCard>
            )
          })}
          {!payments.data?.length ? <EmptyState title="No payments yet" body="Vendor payments will show up here." /> : null}
        </View>
      </ScrollView>
    </Screen>
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
  })
}
