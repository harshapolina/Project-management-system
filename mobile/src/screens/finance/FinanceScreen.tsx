import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { Pill } from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, typography } from '../../constants/theme'
import { financeApi } from '../../api/finance'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Finance'>

const EXPENSE_STATUS_COLOR = { pending: colors.warning, approved: colors.success, rejected: colors.danger }

export function FinanceScreen({ navigation }: Props) {
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
      <Screen>
        <LoadingState label="Loading finance…" />
      </Screen>
    )
  }
  if (summary.isError) {
    return (
      <Screen>
        <ErrorState message={isApiError(summary.error) ? summary.error.message : undefined} onRetry={() => summary.refetch()} />
      </Screen>
    )
  }

  const data = summary.data!

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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

        <View>
          <Text style={styles.sectionTitle}>Project P&L</Text>
          {data.pnl.map((row) => (
            <Card key={row.id} style={{ gap: 4, marginBottom: spacing.sm }}>
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
            </Card>
          ))}
        </View>

        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <Pressable onPress={() => navigation.navigate('CreateExpense', undefined)} accessibilityLabel="Add expense">
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
            </Pressable>
          </View>
          {(expenses.data || []).map((e) => {
            const pName = typeof e.projectId === 'object' ? e.projectId?.name : undefined
            return (
              <Card key={e._id} style={{ gap: 4, marginBottom: spacing.sm }}>
                <View style={styles.pnlRow}>
                  <Text style={styles.pnlName} numberOfLines={1}>
                    {e.category || 'Expense'} — {formatInr(e.amount)}
                  </Text>
                  <Pill label={e.status} color={EXPENSE_STATUS_COLOR[e.status]} bg={`${EXPENSE_STATUS_COLOR[e.status]}22`} />
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
              </Card>
            )
          })}
          {!expenses.data?.length ? <Text style={styles.muted}>No expenses recorded yet.</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Payments</Text>
          {(payments.data || []).map((p) => {
            const name = typeof p.projectId === 'object' ? p.projectId?.name : 'Payment'
            const vendor = typeof p.vendorId === 'object' ? p.vendorId?.name : null
            return (
              <Card key={p._id} style={{ gap: 4, marginBottom: spacing.sm }}>
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
              </Card>
            )
          })}
          {!payments.data?.length ? <Text style={styles.muted}>No vendor payments logged yet.</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  pnlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pnlName: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  pnlMeta: { ...typography.caption, color: colors.textSecondary },
  reviewRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  reviewBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  reviewText: { ...typography.micro, fontWeight: '700' },
  muted: { ...typography.caption, color: colors.textMuted },
})
