import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SearchField } from '../../components/SearchField'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { commentsApi, type CommentScope } from '../../api/comments'
import { isApiError } from '../../api/client'
import { timeAgo } from '../../utils/time'
import type { AssignedComment } from '../../types/models'
import type { MoreStackParamList } from '../../navigation/types'
import { smartGoBack } from '../../navigation/openProject'

type Props = NativeStackScreenProps<MoreStackParamList, 'AssignedComments'>

const SCOPES: { key: CommentScope; label: string }[] = [
  { key: 'to_me', label: 'To me' },
  { key: 'by_me', label: 'By me' },
]

/** Mirrors the web page's toggle: open only, or open + resolved together. */
const SHOW_RESOLVED_PARAM = 'all' as const

function projectNameOf(comment: AssignedComment) {
  const project = comment.taskId?.projectId
  if (!project) return ''
  return typeof project === 'string' ? '' : project.name
}

export function AssignedCommentsScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const [scope, setScope] = useState<CommentScope>('to_me')
  const [showResolved, setShowResolved] = useState(false)
  const [search, setSearch] = useState('')

  const trimmed = search.trim()

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['assigned-comments', scope, showResolved, trimmed],
    queryFn: () =>
      commentsApi.assigned({
        scope,
        ...(showResolved ? { resolved: SHOW_RESOLVED_PARAM } : null),
        ...(trimmed ? { q: trimmed } : null),
      }),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      commentsApi.setResolved(id, resolved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assigned-comments'] }),
  })

  const chromeProps = {
    title: "Assigned comments",
    subtitle: "Comments waiting on you",
    subtitleIcon: 'chatbubbles-outline' as const,
    onBack: () => smartGoBack(navigation, route),
  }

  const filters = (
    <View style={styles.filters}>
      <SegmentedControl options={SCOPES} value={scope} onChange={setScope} inset={false} />
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search comments"
        inset={false}
      />
      <Pressable
        style={styles.resolvedToggle}
        onPress={() => setShowResolved((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: showResolved }}
      >
        <Ionicons
          name={showResolved ? 'checkbox' : 'square-outline'}
          size={18}
          color={showResolved ? colors.accent : colors.textMuted}
        />
        <Text style={styles.resolvedLabel}>Include resolved</Text>
      </Pressable>
    </View>
  )

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading comments…" variant="list" />
      </NestedChrome>
    )
  }

  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState
          message={isApiError(error) ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </NestedChrome>
    )
  }

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={data}
        keyExtractor={(c) => c._id}
        contentContainerStyle={listContent}
        ListHeaderComponent={filters}
        refreshing={isFetching}
        onRefresh={() => refetch()}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const project = projectNameOf(item)
          const taskTitle = item.taskId?.title
          const meta = [project, timeAgo(item.createdAt)].filter(Boolean).join(' · ')

          return (
            <SurfaceCard>
              <View style={styles.cardTop}>
                <Avatar name={item.author?.name} uri={item.author?.avatar} size={28} />
                <View style={styles.cardHeadText}>
                  <Text style={styles.author} numberOfLines={1}>
                    {item.author?.name || 'Someone'}
                  </Text>
                  {meta ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
                {item.resolved ? (
                  <Pill label="Resolved" color={colors.success} bg={`${colors.success}22`} />
                ) : null}
              </View>

              <Text style={styles.body}>{item.body}</Text>

              {taskTitle ? (
                <Pressable
                  style={styles.taskRow}
                  onPress={() =>
                    item.taskId?._id
                      ? navigation.navigate('TaskDetail', { taskId: item.taskId._id })
                      : undefined
                  }
                  disabled={!item.taskId?._id}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {taskTitle}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                style={styles.actionBtn}
                onPress={() =>
                  resolveMutation.mutate({ id: item._id, resolved: !item.resolved })
                }
                disabled={resolveMutation.isPending}
              >
                <Text style={styles.actionText}>
                  {item.resolved ? 'Reopen' : 'Mark resolved'}
                </Text>
              </Pressable>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            title={scope === 'to_me' ? 'Nothing needs you' : 'Nothing delegated'}
            body={
              scope === 'to_me'
                ? 'Comments that mention you, or land on your tasks, show up here.'
                : 'Comments where you tagged or assigned someone else show up here.'
            }
          />
        }
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    filters: { gap: spacing.sm, marginBottom: spacing.md },
    resolvedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      paddingVertical: 4,
    },
    resolvedLabel: { ...typography.caption, color: c.textSecondary },

    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardHeadText: { flex: 1, minWidth: 0 },
    author: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.micro, color: c.textMuted, marginTop: 1 },

    body: { ...typography.body, color: c.textPrimary, marginTop: spacing.sm },

    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.surfaceRaised,
    },
    taskTitle: { ...typography.caption, color: c.textSecondary, flex: 1 },

    actionBtn: {
      alignSelf: 'flex-start',
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      marginTop: spacing.sm,
    },
    actionText: { ...typography.micro, color: c.textSecondary },
  })
}
