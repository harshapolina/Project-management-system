import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Pill } from '../../../components/Badge'
import { SectionLabel } from '../../../components/SectionLabel'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { PhotoStrip } from '../../../components/PhotoStrip'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { radius, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import { QC_STATUS_LABELS, qcStatusColor, refName, shortDate } from '../procurementMeta'
import type { TabProps } from './types'

/**
 * Quality checks. The top block is the actual work queue — GRNs that have
 * arrived but not been inspected — because that is what blocks payment.
 */
export function QcTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const params = projectId ? { projectId } : undefined

  const inspections = useQuery({
    queryKey: ['qc-inspections', projectId],
    queryFn: () => procurementFlowApi.inspections(params),
  })
  const grns = useQuery({
    queryKey: ['grns', projectId],
    queryFn: () => procurementFlowApi.grns(params),
  })

  if (inspections.isLoading || grns.isLoading) {
    return <LoadingState label="Loading quality checks…" variant="list" />
  }
  if (inspections.isError) {
    return (
      <ErrorState
        message={isApiError(inspections.error) ? inspections.error.message : undefined}
        onRetry={() => inspections.refetch()}
      />
    )
  }

  const pending = (grns.data || []).filter((grn) => grn.status === 'qc_pending' || grn.status === 'received')
  const done = inspections.data || []

  return (
    <ScrollView
      contentContainerStyle={listContent}
      refreshControl={
        <RefreshControl
          refreshing={inspections.isRefetching || grns.isRefetching}
          onRefresh={() => {
            inspections.refetch()
            grns.refetch()
          }}
          tintColor={colors.accent}
        />
      }
    >
      <SectionLabel count={pending.length}>Awaiting check</SectionLabel>
      {pending.length === 0 ? (
        <SurfaceCard>
          <Text style={styles.clear}>Every received GRN has been checked.</Text>
        </SurfaceCard>
      ) : (
        pending.map((grn) => (
          <SurfaceCard key={grn._id}>
            <View style={styles.row}>
              <Text style={styles.number} numberOfLines={1}>
                {grn.grnNumber}
              </Text>
              <Pill label="QC pending" color={colors.warning} bg={`${colors.warning}18`} />
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[refName(grn.vendor), refName(grn.projectId), shortDate(grn.receivedAt)]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
            <Pressable
              style={styles.cta}
              onPress={() =>
                navigation.navigate('CreateQc', { grnId: grn._id, grnNumber: grn.grnNumber })
              }
            >
              <Ionicons name="checkmark-done-outline" size={14} color={colors.textOnAccent} />
              <Text style={styles.ctaText}>Run quality check</Text>
            </Pressable>
          </SurfaceCard>
        ))
      )}

      <SectionLabel count={done.length}>Checked</SectionLabel>
      {done.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="No inspections yet"
          body="A quality check records accepted, damaged and short quantities — and drafts a debit note when something is wrong."
        />
      ) : (
        done.map((qc) => {
          const color = qcStatusColor(colors, qc.overallStatus)
          const accepted = qc.items.reduce((sum, line) => sum + (Number(line.acceptedQty) || 0), 0)
          const rejected = qc.items.reduce(
            (sum, line) => sum + (Number(line.rejectedQty) || 0) + (Number(line.damagedQty) || 0),
            0,
          )
          return (
            <SurfaceCard key={qc._id}>
              <View style={styles.row}>
                <Text style={styles.number} numberOfLines={1}>
                  {refName(qc.grn, 'grnNumber') || 'GRN'}
                </Text>
                <Pill label={QC_STATUS_LABELS[qc.overallStatus]} color={color} bg={`${color}18`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[refName(qc.vendor), refName(qc.checkedBy), shortDate(qc.checkedAt)]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
              <Text style={styles.qty}>
                {accepted} accepted · {rejected} rejected or damaged
              </Text>
              {qc.siteRemarks ? <Text style={styles.remarks}>{qc.siteRemarks}</Text> : null}
              {qc.photos?.length ? <PhotoStrip photos={qc.photos} size={56} /> : null}
            </SurfaceCard>
          )
        })
      )}
    </ScrollView>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    qty: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    remarks: { ...typography.caption, color: c.textSecondary, marginTop: 6, fontStyle: 'italic' },
    clear: { ...typography.caption, color: c.textSecondary },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.full,
      backgroundColor: c.accent,
    },
    ctaText: { ...typography.captionStrong, color: c.textOnAccent },
  })
}
