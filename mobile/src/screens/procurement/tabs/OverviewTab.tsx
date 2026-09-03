import { useMemo } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { StatCard } from '../../../components/StatCard'
import { SectionLabel } from '../../../components/SectionLabel'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { NavRow } from '../../../components/NavRow'
import { ErrorState, LoadingState } from '../../../components/States'
import { spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import { PROCUREMENT_STAGES, type ProcurementTab } from '../../../components/ProcurementTabs'
import type { TabProps } from './types'

/** Counts that mean "someone has to do something" — mirrors the web overview. */
const QUEUES: { key: ProcurementTab; label: string; field: string; tone?: 'warning' | 'danger' }[] = [
  { key: 'rfqs', label: 'RFQs in play', field: 'rfqs' },
  { key: 'pos', label: 'Draft POs', field: 'draftPos' },
  { key: 'pos', label: 'In transit', field: 'inTransitPos' },
  { key: 'qc', label: 'Awaiting QC', field: 'grnQc', tone: 'warning' },
  { key: 'debit', label: 'Open debit notes', field: 'debitNotes', tone: 'warning' },
  { key: 'requests', label: 'Material requests', field: 'materialRequests' },
  { key: 'invoices', label: 'Unpaid invoices', field: 'unpaidInvoices', tone: 'warning' },
  { key: 'payments', label: 'Payments queued', field: 'payments' },
  { key: 'payments', label: 'Overdue payments', field: 'overduePayments', tone: 'danger' },
]

export function OverviewTab({ onChangeTab }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['procurement-dashboard'],
    queryFn: procurementFlowApi.dashboard,
  })

  if (isLoading) return <LoadingState label="Loading procurement…" variant="dashboard" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const pending = data?.pending
  const counts = (pending || {}) as unknown as Record<string, number>
  const totalOpen = QUEUES.reduce((sum, q) => sum + (counts[q.field] || 0), 0)

  return (
    <ScrollView
      contentContainerStyle={listContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />}
    >
      <SurfaceCard style={styles.hero}>
        <View style={styles.heroRow}>
          <Ionicons name="speedometer-outline" size={18} color={colors.accent} />
          <Text style={styles.heroTitle}>Where things stand</Text>
        </View>
        <Text style={styles.heroBody}>
          {totalOpen === 0
            ? 'Nothing waiting on procurement right now.'
            : `${totalOpen} item${totalOpen === 1 ? '' : 's'} across the chain need attention.`}
        </Text>
      </SurfaceCard>

      <SectionLabel>Queues</SectionLabel>
      <View style={styles.stats}>
        {QUEUES.map((q) => (
          <StatCard
            key={`${q.key}-${q.field}`}
            label={q.label}
            value={counts[q.field] ?? 0}
            tone={counts[q.field] ? q.tone || 'default' : 'default'}
            onPress={() => onChangeTab(q.key)}
          />
        ))}
      </View>

      <SectionLabel>Jump to a stage</SectionLabel>
      {PROCUREMENT_STAGES.filter((s) => s.step).map((stage) => (
        <NavRow
          key={stage.id}
          icon="arrow-forward-circle-outline"
          label={`${stage.step}. ${stage.title}`}
          hint={stage.hint}
          onPress={() => onChangeTab(stage.tabs[0])}
        />
      ))}
    </ScrollView>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    hero: { gap: 6 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heroTitle: { ...typography.h3, color: c.textPrimary },
    heroBody: { ...typography.caption, color: c.textSecondary },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  })
}
