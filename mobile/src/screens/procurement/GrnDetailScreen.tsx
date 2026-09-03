import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { Pill } from '../../components/Badge'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { PhotoStrip } from '../../components/PhotoStrip'
import { ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { procurementFlowApi } from '../../api/procurementFlow'
import { isApiError } from '../../api/client'
import { GRN_STATUS_LABELS, grnStatusColor, refName, shortDate } from './procurementMeta'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'GrnDetail'>

/** One goods receipt, line by line, with the linked quality check if it ran. */
export function GrnDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { grnId, grnNumber } = route.params

  const grns = useQuery({ queryKey: ['grns', ''], queryFn: () => procurementFlowApi.grns() })
  const inspections = useQuery({
    queryKey: ['qc-inspections', ''],
    queryFn: () => procurementFlowApi.inspections(),
  })

  const grn = (grns.data || []).find((g) => g._id === grnId)
  const inspection = (inspections.data || []).find(
    (qc) => (typeof qc.grn === 'object' ? qc.grn?._id : qc.grn) === grnId,
  )

  const chromeProps = {
    title: 'GRN',
    subtitle: grnNumber || 'Goods receipt',
    subtitleIcon: 'download-outline' as const,
  }

  if (grns.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading GRN…" variant="form" />
      </NestedChrome>
    )
  }
  if (grns.isError || !grn) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState
          message={isApiError(grns.error) ? grns.error.message : 'That GRN is no longer available'}
          onRetry={() => grns.refetch()}
        />
      </NestedChrome>
    )
  }

  const color = grnStatusColor(colors, grn.status)
  const value = grn.items.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  const needsQc = grn.status === 'received' || grn.status === 'qc_pending'

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView contentContainerStyle={listContent} showsVerticalScrollIndicator={false}>
        <SurfaceCard>
          <View style={styles.row}>
            <Text style={styles.number}>{grn.grnNumber}</Text>
            <Pill label={GRN_STATUS_LABELS[grn.status]} color={color} bg={`${color}18`} />
          </View>
          <Text style={styles.meta}>
            {[
              refName(grn.vendor),
              refName(grn.purchaseOrder, 'poNumber') && `PO ${refName(grn.purchaseOrder, 'poNumber')}`,
              refName(grn.projectId),
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          <Text style={styles.amount}>{formatInr(value)}</Text>
          <Text style={styles.meta}>
            {[
              grn.receivedAt && `Received ${shortDate(grn.receivedAt)}`,
              grn.warehouse,
              grn.invoiceNo && `Invoice ${grn.invoiceNo}`,
              grn.challanNo && `Challan ${grn.challanNo}`,
              refName(grn.createdBy) && `by ${refName(grn.createdBy)}`,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          {grn.photos?.length ? <PhotoStrip photos={grn.photos} size={64} /> : null}
          {grn.notes ? <Text style={styles.notes}>{grn.notes}</Text> : null}
        </SurfaceCard>

        {needsQc ? (
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('CreateQc', { grnId: grn._id, grnNumber: grn.grnNumber })}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={colors.textOnAccent} />
            <Text style={styles.ctaText}>Run quality check</Text>
          </Pressable>
        ) : null}

        <SectionLabel count={grn.items.length}>Lines</SectionLabel>
        {grn.items.map((line, i) => (
          <SurfaceCard key={line._id || i}>
            <Text style={styles.lineDesc}>{line.description || `Line ${i + 1}`}</Text>
            <View style={styles.qtyRow}>
              <Qty label="Ordered" value={line.orderedQty} colors={colors} />
              <Qty label="Received" value={line.receivedQty} colors={colors} />
              <Qty
                label="Accepted"
                value={line.acceptedQty}
                colors={colors}
                tone={line.acceptedQty > 0 ? colors.success : undefined}
              />
              <Qty
                label="Short"
                value={line.shortageQty}
                colors={colors}
                tone={line.shortageQty > 0 ? colors.warning : undefined}
              />
              <Qty
                label="Damaged"
                value={line.damagedQty}
                colors={colors}
                tone={line.damagedQty > 0 ? colors.danger : undefined}
              />
            </View>
            <Text style={styles.lineMeta}>
              {formatInr(line.rate)} each · {formatInr(line.amount)}
              {line.batchNo ? ` · batch ${line.batchNo}` : ''}
            </Text>
            {line.remarks ? <Text style={styles.notes}>{line.remarks}</Text> : null}
          </SurfaceCard>
        ))}

        {inspection ? (
          <>
            <SectionLabel>Quality check</SectionLabel>
            <SurfaceCard>
              <Text style={styles.lineDesc}>{inspection.overallStatus.toUpperCase()}</Text>
              <Text style={styles.lineMeta}>
                {[refName(inspection.checkedBy), shortDate(inspection.checkedAt)]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
              {inspection.siteRemarks ? <Text style={styles.notes}>{inspection.siteRemarks}</Text> : null}
              {inspection.photos?.length ? <PhotoStrip photos={inspection.photos} size={56} /> : null}
            </SurfaceCard>
          </>
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function Qty({
  label,
  value,
  tone,
  colors,
}: {
  label: string
  value: number
  tone?: string
  colors: AppColors
}) {
  return (
    <View style={{ minWidth: 58 }}>
      <Text style={{ ...typography.micro, color: colors.textMuted }}>{label}</Text>
      <Text style={{ ...typography.bodyStrong, color: tone || colors.textPrimary }}>{value ?? 0}</Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    amount: { ...typography.h2, color: c.textPrimary, marginTop: 6 },
    notes: { ...typography.caption, color: c.textSecondary, marginTop: 6, fontStyle: 'italic' },
    lineDesc: { ...typography.bodyStrong, color: c.textPrimary },
    lineMeta: { ...typography.micro, color: c.textMuted, marginTop: spacing.sm },
    qtyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius.full,
      backgroundColor: c.accent,
    },
    ctaText: { ...typography.bodyStrong, color: c.textOnAccent },
  })
}
