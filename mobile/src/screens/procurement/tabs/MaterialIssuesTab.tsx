import { useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Fab } from '../../../components/Fab'
import { Pill } from '../../../components/Badge'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import { refName, shortDate } from '../procurementMeta'
import type { TabProps } from './types'

/** Material issued out of the store — this is what actually reduces stock. */
export function MaterialIssuesTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['material-issues', projectId],
    queryFn: () => procurementFlowApi.materialIssues(projectId ? { projectId } : undefined),
  })

  if (isLoading) return <LoadingState label="Loading issues…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const issues = data || []

  return (
    <>
      <FlatList
        data={issues}
        keyExtractor={(issue) => issue._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        renderItem={({ item }) => {
          const cancelled = item.status === 'cancelled'
          const color = cancelled ? colors.textMuted : colors.success
          const total = item.items.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
          return (
            <SurfaceCard>
              <View style={styles.row}>
                <Text style={styles.number} numberOfLines={1}>
                  {item.issueNumber}
                </Text>
                <Pill label={cancelled ? 'Cancelled' : 'Issued'} color={color} bg={`${color}18`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  refName(item.projectId),
                  refName(item.materialRequest, 'requestNumber'),
                  item.receivedByName && `to ${item.receivedByName}`,
                  shortDate(item.issuedAt),
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
              <Text style={styles.qty}>
                {item.items.length} line{item.items.length === 1 ? '' : 's'} · {total} issued
              </Text>
              {item.items.map((line, i) => (
                <Text key={line._id || i} style={styles.line} numberOfLines={1}>
                  {line.description} · {line.qty} {line.unit}
                  {line.batchNo ? ` · batch ${line.batchNo}` : ''}
                </Text>
              ))}
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="exit-outline"
            title="Nothing issued yet"
            body="Issuing material to site reduces inventory and logs a stock movement."
            action="Issue material"
            onAction={() => navigation.navigate('CreateMaterialIssue', { projectId })}
          />
        }
      />
      <Fab
        label="Issue material"
        icon="exit-outline"
        onPress={() => navigation.navigate('CreateMaterialIssue', { projectId })}
      />
    </>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    qty: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    line: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    notes: { ...typography.caption, color: c.textSecondary, marginTop: 6, fontStyle: 'italic' },
  })
}
