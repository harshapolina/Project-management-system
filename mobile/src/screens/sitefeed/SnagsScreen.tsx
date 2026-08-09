import { useLayoutEffect } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { siteFeedApi } from '../../api/siteFeed'
import { isApiError } from '../../api/client'
import type { SnagStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Snags'>

const STATUS_COLOR: Record<SnagStatus, string> = {
  open: colors.danger,
  fixed: colors.warning,
  verified: colors.success,
}

const NEXT: Record<SnagStatus, SnagStatus | null> = { open: 'fixed', fixed: 'verified', verified: null }

export function SnagsScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params || {}
  const queryClient = useQueryClient()

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Snags` : 'Snags' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['snags', projectId ?? 'all'],
    queryFn: () => siteFeedApi.snags(projectId ? { projectId } : undefined),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SnagStatus }) => siteFeedApi.updateSnag(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snags'] }),
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading snags…" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(s) => s._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const next = NEXT[item.status]
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Pill label={item.status} color={STATUS_COLOR[item.status]} bg={`${STATUS_COLOR[item.status]}22`} />
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
            </View>
          )
        }}
        ListEmptyComponent={<EmptyState title="No snags logged" body="Quality issues found on site will show up here." />}
      />
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CreateSnag', { projectId, projectName })}
        accessibilityLabel="Log snag"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeName: { ...typography.caption, color: colors.textSecondary },
  actionBtn: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  actionText: { ...typography.micro, color: colors.textSecondary, textTransform: 'capitalize' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
})
