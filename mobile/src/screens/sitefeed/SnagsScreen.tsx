import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fab } from '../../components/Fab'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { siteFeedApi } from '../../api/siteFeed'
import { isApiError } from '../../api/client'
import type { SnagStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'
import { smartGoBack } from '../../navigation/openProject'

type Props = NativeStackScreenProps<MoreStackParamList, 'Snags'>

function statusColorMap(c: AppColors): Record<SnagStatus, string> {
  return {
    open: c.danger,
    fixed: c.warning,
    verified: c.success,
  }
}

const NEXT: Record<SnagStatus, SnagStatus | null> = { open: 'fixed', fixed: 'verified', verified: null }

export function SnagsScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params || {}
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['snags', projectId ?? 'all'],
    queryFn: () => siteFeedApi.snags(projectId ? { projectId } : undefined),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SnagStatus }) => siteFeedApi.updateSnag(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snags'] }),
  })

  const chromeProps = {
    title: "Snags",
    subtitle: "Issues to fix",
    subtitleIcon: 'alert-circle-outline' as const,
    onBack: () => smartGoBack(navigation, route),
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading snags…" variant="list" />
      </NestedChrome>
    )
  }
  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={data}
        keyExtractor={(s) => s._id}
        contentContainerStyle={listContent}
        renderItem={({ item }) => {
          const next = NEXT[item.status]
          return (
            <SurfaceCard>
              <View style={styles.cardTop}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Pill label={item.status} color={statusColorMap(colors)[item.status]} bg={`${statusColorMap(colors)[item.status]}22`} />
              </View>
              {item.assignee ? (
                <View style={styles.assigneeRow}>
                  <Avatar name={item.assignee.name} uri={item.assignee.avatar} size={22} />
                  <Text style={styles.assigneeName}>{item.assignee.name}</Text>
                </View>
              ) : null}
              {next ? (
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => statusMutation.mutate({ id: item._id, status: next })}
                  disabled={statusMutation.isPending}
                >
                  <Text style={styles.actionText}>Mark {next}</Text>
                </Pressable>
              ) : null}
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            title="No snags logged"
            body="Quality issues found on site will show up here."
            action="Log snag"
            onAction={() => navigation.navigate('CreateSnag', { projectId, projectName })}
          />
        }
      />
      <Fab
        label="Log snag"
        onPress={() => navigation.navigate('CreateSnag', { projectId, projectName })}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    assigneeName: { ...typography.caption, color: c.textSecondary },
    actionBtn: {
      alignSelf: 'flex-start',
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      marginTop: spacing.sm,
    },
    actionText: { ...typography.micro, color: c.textSecondary, textTransform: 'capitalize' },
  })
}
