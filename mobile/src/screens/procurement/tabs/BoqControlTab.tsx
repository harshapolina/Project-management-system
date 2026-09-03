import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { StatCard } from '../../../components/StatCard'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { SearchField } from '../../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import type { BoqControlLine } from '../../../types/procurementFlow'
import type { TabProps } from './types'

type Filter = 'open' | 'short' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Still to buy' },
  { key: 'short', label: 'Fully covered' },
  { key: 'all', label: 'All lines' },
]

function qty(n?: number): string {
  const value = Number(n) || 0
  return Number(value.toFixed(3)).toLocaleString('en-IN')
}

export function BoqControlTab({ projectId, projectName, onPickProject }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [filter, setFilter] = useState<Filter>('open')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['boq-control', projectId],
    queryFn: () => procurementFlowApi.boqControl(projectId),
    enabled: !!projectId,
  })

  if (!projectId) {
    return (
      <EmptyState
        icon="grid-outline"
        title="Pick a project"
        body="BOQ control compares an approved BOQ against what has been ordered, so it needs one project at a time."
        action="Choose project"
        onAction={onPickProject}
      />
    )
  }

  if (isLoading) return <LoadingState label="Loading BOQ control…" variant="dashboard" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const lines = data?.lines || []
  const q = search.trim().toLowerCase()
  const visible = lines.filter((line) => {
    if (filter === 'open' && line.availableQty <= 0) return false
    if (filter === 'short' && line.availableQty > 0) return false
    if (!q) return true
    return [line.description, line.room, line.quotationTitle]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  // Group by room so a site buyer reads the sheet the way the BOQ is written.
  const grouped = new Map<string, BoqControlLine[]>()
  for (const line of visible) {
    const key = line.room?.trim() || 'Unassigned'
    grouped.set(key, [...(grouped.get(key) || []), line])
  }
  const sections = [...grouped.entries()].map(([title, data2]) => ({ title, data: data2 }))

  const openValue = lines
    .filter((l) => l.availableQty > 0)
    .reduce((sum, l) => sum + l.availableQty * (Number(l.rate) || 0), 0)

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, i) => `${item.boqItemId || item.description}-${i}`}
      contentContainerStyle={listContent}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable onPress={onPickProject} style={styles.projectChip}>
            <Ionicons name="business-outline" size={14} color={colors.accent} />
            <Text style={styles.projectText} numberOfLines={1}>
              {projectName || 'Project'}
            </Text>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.textMuted} />
          </Pressable>

          <View style={styles.stats}>
            <StatCard label="BOQ lines" value={data?.summary.lineCount ?? 0} />
            <StatCard label="Still to buy" value={data?.summary.openLines ?? 0} tone="warning" />
            <StatCard label="Covered" value={data?.summary.shortLines ?? 0} tone="success" />
            <StatCard label="Open value" value={formatInr(openValue)} />
          </View>

          {data?.quotations.length ? (
            <SurfaceCard>
              <Text style={styles.sourceLabel}>Approved BOQs feeding this view</Text>
              {data.quotations.map((quotation) => (
                <Text key={quotation._id} style={styles.sourceRow} numberOfLines={1}>
                  {quotation.title}
                  {quotation.versionLabel ? ` · ${quotation.versionLabel}` : ''} ·{' '}
                  {formatInr(quotation.grandTotal || 0)}
                </Text>
              ))}
            </SurfaceCard>
          ) : null}

          <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} inset={false} />
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search item or room"
            inset={false}
          />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>
          {section.title} · {section.data.length}
        </Text>
      )}
      renderItem={({ item }) => {
        const covered = item.availableQty <= 0
        return (
          <SurfaceCard>
            <Text style={styles.desc}>{item.description || 'Untitled line'}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.quotationTitle, item.versionLabel].filter(Boolean).join(' · ')}
            </Text>
            <View style={styles.qtyRow}>
              <QtyCell label="BOQ" value={qty(item.boqQty)} unit={item.unit} colors={colors} />
              <QtyCell label="Ordered" value={qty(item.orderedQty)} colors={colors} />
              <QtyCell label="Received" value={qty(item.purchasedQty)} colors={colors} />
              <QtyCell
                label="Available"
                value={qty(item.availableQty)}
                colors={colors}
                tone={covered ? colors.success : colors.warning}
              />
            </View>
            {item.rate ? (
              <Text style={styles.rate}>
                {formatInr(item.rate)} / {item.unit || 'unit'} · open{' '}
                {formatInr(item.availableQty * (Number(item.rate) || 0))}
              </Text>
            ) : null}
          </SurfaceCard>
        )
      }}
      ListEmptyComponent={
        <EmptyState
          icon="grid-outline"
          title={lines.length ? 'Nothing in this filter' : 'No approved BOQ yet'}
          body={
            lines.length
              ? 'Try another filter or clear the search.'
              : 'BOQ control reads approved quotations. Approve a BOQ for this project first.'
          }
        />
      }
    />
  )
}

function QtyCell({
  label,
  value,
  unit,
  tone,
  colors,
}: {
  label: string
  value: string
  unit?: string
  tone?: string
  colors: AppColors
}) {
  return (
    <View style={{ flex: 1, minWidth: 64 }}>
      <Text style={{ ...typography.micro, color: colors.textMuted }}>{label}</Text>
      <Text style={{ ...typography.bodyStrong, color: tone || colors.textPrimary }}>
        {value}
        {unit ? <Text style={{ ...typography.micro, color: colors.textMuted }}> {unit}</Text> : null}
      </Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    header: { gap: spacing.md },
    projectChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
    },
    projectText: { ...typography.captionStrong, color: c.accentHover, maxWidth: 200 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    sourceLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
    sourceRow: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    sectionHeader: {
      ...typography.captionStrong,
      color: c.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    desc: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.micro, color: c.textMuted, marginTop: 2 },
    qtyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    rate: { ...typography.caption, color: c.textSecondary, marginTop: spacing.sm },
  })
}
