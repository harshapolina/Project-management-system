import { useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Fab } from '../../../components/Fab'
import { Pill } from '../../../components/Badge'
import { SurfaceCard } from '../../../components/SurfaceCard'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { radius, spacing, typography, type AppColors } from '../../../constants/theme'
import { useColors } from '../../../theme/useColors'
import { useResponsive } from '../../../theme/useResponsive'
import { procurementFlowApi } from '../../../api/procurementFlow'
import { isApiError } from '../../../api/client'
import { REQUEST_STATUS_LABELS, refId, refName, requestStatusColor, shortDate } from '../procurementMeta'
import type { MaterialRequestStatus } from '../../../types/procurementFlow'
import type { TabProps } from './types'

type Filter = 'open' | 'approved' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Needs a decision' },
  { key: 'approved', label: 'Ready to issue' },
  { key: 'all', label: 'All' },
]

/** Material requested from site, before anything leaves the store. */
export function MaterialRequestsTab({ projectId, navigation }: TabProps) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('open')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['material-requests', projectId],
    queryFn: () => procurementFlowApi.materialRequests(projectId ? { projectId } : undefined),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaterialRequestStatus }) =>
      procurementFlowApi.updateMaterialRequest(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-requests'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
    },
    onError: (err) => Alert.alert('Could not update', isApiError(err) ? err.message : 'Try again'),
  })

  if (isLoading) return <LoadingState label="Loading requests…" variant="list" />
  if (isError) {
    return <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
  }

  const all = data || []
  const requests = all.filter((r) => {
    if (filter === 'open') return r.status === 'submitted' || r.status === 'draft'
    if (filter === 'approved') return r.status === 'approved'
    return true
  })

  return (
    <>
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        data={requests}
        keyExtractor={(r) => r._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
        renderItem={({ item }) => {
          const color = requestStatusColor(colors, item.status)
          const pending = item.status === 'submitted' || item.status === 'draft'
          return (
            <SurfaceCard>
              <View style={styles.row}>
                <Text style={styles.number} numberOfLines={1}>
                  {item.requestNumber}
                </Text>
                <Pill label={REQUEST_STATUS_LABELS[item.status]} color={color} bg={`${color}18`} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  refName(item.projectId),
                  refName(item.requestedBy),
                  item.requiredBy ? `needed ${shortDate(item.requiredBy)}` : '',
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>

              {item.items.map((line, i) => (
                <Text key={line._id || i} style={styles.line} numberOfLines={1}>
                  {line.description} · {line.qty} {line.unit}
                  {line.remarks ? ` · ${line.remarks}` : ''}
                </Text>
              ))}

              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

              <View style={styles.actions}>
                {pending ? (
                  <>
                    <Pressable
                      style={[styles.action, styles.approve]}
                      disabled={setStatus.isPending}
                      onPress={() => setStatus.mutate({ id: item._id, status: 'approved' })}
                    >
                      <Ionicons name="checkmark-outline" size={13} color={colors.success} />
                      <Text style={[styles.actionText, { color: colors.success }]}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.action, styles.reject]}
                      disabled={setStatus.isPending}
                      onPress={() =>
                        Alert.alert('Reject request', `Reject ${item.requestNumber}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reject',
                            style: 'destructive',
                            onPress: () => setStatus.mutate({ id: item._id, status: 'rejected' }),
                          },
                        ])
                      }
                    >
                      <Ionicons name="close-outline" size={13} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>Reject</Text>
                    </Pressable>
                  </>
                ) : null}
                {item.status === 'approved' ? (
                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      navigation.navigate('CreateMaterialIssue', {
                        projectId: refId(item.projectId) || projectId,
                        materialRequestId: item._id,
                        requestNumber: item.requestNumber,
                      })
                    }
                  >
                    <Ionicons name="exit-outline" size={13} color={colors.accentHover} />
                    <Text style={styles.actionText}>Issue to site</Text>
                  </Pressable>
                ) : null}
              </View>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title={all.length ? 'Nothing in this filter' : 'No material requests'}
            body={
              all.length
                ? 'Switch filters to see the rest.'
                : 'Site raises a request for what it needs; the store issues against it.'
            }
            action={all.length ? undefined : 'Raise request'}
            onAction={
              all.length ? undefined : () => navigation.navigate('CreateMaterialRequest', { projectId })
            }
          />
        }
      />
      <Fab
        label="Raise request"
        icon="clipboard-outline"
        onPress={() => navigation.navigate('CreateMaterialRequest', { projectId })}
      />
    </>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    number: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
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
    approve: { backgroundColor: c.successSoft },
    reject: { backgroundColor: c.dangerSoft },
    actionText: { ...typography.micro, fontWeight: '600', color: c.accentHover },
  })
}
