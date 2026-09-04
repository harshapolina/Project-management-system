import { useMemo } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Pill } from '../../../components/Badge'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import { DEBIT_STATUS_LABELS, debitStatusColor, refName, shortDate } from '../procurementMeta'
import type { DebitNoteStatus } from '../../../types/procurementFlow'
import type { TabProps } from './types'

/** Where a debit note can go next — matches the server's allowed transitions. */
const NEXT_STATUS: Partial<Record<DebitNoteStatus, { to: DebitNoteStatus; label: string }[]>> = {
  draft: [{ to: 'sent', label: 'Send to vendor' }],
  sent: [
    { to: 'accepted', label: 'Vendor accepted' },
    { to: 'disputed', label: 'Vendor disputed' },
  ],
  accepted: [{ to: 'closed', label: 'Close' }],
  disputed: [
    { to: 'accepted', label: 'Resolved — accepted' },
    { to: 'closed', label: 'Close' },
  ],
}

export function DebitNotesTab({ projectId }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['debit-notes', projectId],
    queryFn: () => procurementFlowApi.debitNotes(projectId ? { projectId } : undefined),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DebitNoteStatus }) =>
      procurementFlowApi.updateDebitNote(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debit-notes'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
    },
    onError: (err) =>
      Alert.alert('Could not update', isApiError(err) ? err.message : 'Try again'),
  })

  if (isLoading) return <LoadingState label="Loading debit notes…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const notes = data || []
  const openValue = notes
    .filter((n) => n.status !== 'closed')
    .reduce((sum, n) => sum + (Number(n.debitAmount) || 0), 0)

  return (
    <FlatList
      data={notes}
      keyExtractor={(note) => note._id}
      contentContainerStyle={listContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />}
      ListHeaderComponent={
        notes.length ? (
          <SurfaceCard>
            <Text style={styles.summaryLabel}>Open against vendors</Text>
            <Text style={styles.summaryValue}>{formatInr(openValue)}</Text>
            <Text style={styles.summaryHint}>
              Debit notes are deducted from the vendor payment when it is raised.
            </Text>
          </SurfaceCard>
        ) : null
      }
      renderItem={({ item }) => {
        const color = debitStatusColor(colors, item.status)
        const actions = NEXT_STATUS[item.status] || []
        return (
          <SurfaceCard>
            <View style={styles.row}>
              <Text style={styles.number} numberOfLines={1}>
                {item.debitNumber}
              </Text>
              <Pill label={DEBIT_STATUS_LABELS[item.status]} color={color} bg={`${color}18`} />
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[
                refName(item.vendor),
                refName(item.grn, 'grnNumber') && `GRN ${refName(item.grn, 'grnNumber')}`,
                refName(item.projectId),
                shortDate(item.createdAt),
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
            <Text style={styles.amount}>{formatInr(item.debitAmount)}</Text>

            {item.items.map((line, i) => (
              <Text key={line._id || i} style={styles.line} numberOfLines={1}>
                {line.description} · {line.shortQty} {line.reason} · {formatInr(line.amount)}
              </Text>
            ))}

            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

            {actions.length ? (
              <View style={styles.actions}>
                {actions.map((action) => (
                  <Pressable
                    key={action.to}
                    style={styles.action}
                    disabled={setStatus.isPending}
                    onPress={() => setStatus.mutate({ id: item._id, status: action.to })}
                  >
                    <Ionicons name="arrow-forward-outline" size={13} color={colors.accentHover} />
                    <Text style={styles.actionText}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </SurfaceCard>
        )
      }}
      ListEmptyComponent={
        <EmptyState
          icon="return-down-back-outline"
          title="No debit notes"
          body="One is drafted automatically when a quality check finds damage or a shortage."
        />
      }
    />
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    amount: { ...typography.h3, color: c.textPrimary, marginTop: 4 },
    line: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    notes: { ...typography.caption, color: c.textSecondary, marginTop: 6, fontStyle: 'italic' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
    },
    actionText: { ...typography.micro, fontWeight: '600', color: c.accentHover },
    summaryLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
    summaryValue: { ...typography.h2, color: c.textPrimary, marginTop: 2 },
    summaryHint: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
  })
}
