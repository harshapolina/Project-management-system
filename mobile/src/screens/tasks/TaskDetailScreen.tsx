import { useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { StatusBadge, PriorityBadge } from '../../components/Badge'
import { LoadingState, ErrorState } from '../../components/States'
import { colors, radius, spacing, STATUS_LABELS, typography } from '../../constants/theme'
import { tasksApi } from '../../api/tasks'
import { isApiError } from '../../api/client'
import type { TaskStatus } from '../../types/models'
import type { RouteProp } from '@react-navigation/native'
import type { HomeStackParamList } from '../../navigation/types'

const STATUS_FLOW: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

// Mounted identically in HomeStackParamList and ProjectStackParamList (both
// declare `TaskDetail: { taskId: string }`), so either stack's route type
// describes the params correctly regardless of which navigator pushed it.
type Props = { route: RouteProp<HomeStackParamList, 'TaskDetail'> }

export function TaskDetailScreen({ route }: Props) {
  const { taskId } = route.params
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    queryClient.invalidateQueries({ queryKey: ['home'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(taskId, { status }),
    onSuccess: invalidate,
  })

  const commentMutation = useMutation({
    mutationFn: (body: string) => tasksApi.addComment(taskId, body),
    onSuccess: () => {
      setComment('')
      invalidate()
    },
  })

  const assigneeName = useMemo(() => {
    const a = data?.task.assignee
    if (a && typeof a === 'object') return a.name
    return 'Unassigned'
  }, [data])

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading task…" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const { task, comments, activity } = data

  return (
    <Screen keyboardAvoiding padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={{ gap: spacing.lg }}>
              <View>
                <Text style={styles.title}>{task.title}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </View>
              </View>

              {task.description ? <Text style={styles.description}>{task.description}</Text> : null}

              <Card style={{ gap: spacing.sm }}>
                <Text style={styles.cardLabel}>Assignee</Text>
                <View style={styles.assigneeRow}>
                  <Avatar name={assigneeName} uri={typeof task.assignee === 'object' ? task.assignee?.avatar : undefined} size={28} />
                  <Text style={styles.assigneeName}>{assigneeName}</Text>
                </View>
                {task.dueDate ? (
                  <>
                    <Text style={styles.cardLabel}>Due</Text>
                    <Text style={styles.assigneeName}>{new Date(task.dueDate).toDateString()}</Text>
                  </>
                ) : null}
              </Card>

              <View>
                <Text style={styles.sectionTitle}>Move to</Text>
                <View style={styles.statusRow}>
                  {STATUS_FLOW.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => statusMutation.mutate(s)}
                      disabled={statusMutation.isPending}
                      style={[styles.statusOption, task.status === s && styles.statusOptionActive]}
                    >
                      <Text
                        style={[styles.statusOptionText, task.status === s && styles.statusOptionTextActive]}
                        numberOfLines={1}
                      >
                        {STATUS_LABELS[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>Activity</Text>
                {activity.length === 0 ? (
                  <Text style={styles.muted}>No activity yet.</Text>
                ) : (
                  activity.slice(0, 6).map((a) => (
                    <Text key={a._id} style={styles.activityLine} numberOfLines={2}>
                      {a.message}
                    </Text>
                  ))
                )}
              </View>

              <Text style={styles.sectionTitle}>
                Comments {comments.length ? `· ${comments.length}` : ''}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Avatar name={item.author?.name} uri={item.author?.avatar} size={28} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.commentAuthor}>{item.author?.name || 'Someone'}</Text>
                <Text style={styles.commentBody}>{item.body}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>Be the first to comment.</Text>}
        />

        <View style={styles.composer}>
          <Input
            placeholder="Add a comment…"
            value={comment}
            onChangeText={setComment}
            containerStyle={{ flex: 1 }}
            multiline
          />
          <Button
            title="Send"
            size="sm"
            onPress={() => comment.trim() && commentMutation.mutate(comment.trim())}
            loading={commentMutation.isPending}
            disabled={!comment.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  cardLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase' },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assigneeName: { ...typography.bodyStrong, color: colors.textPrimary },
  sectionTitle: { ...typography.captionStrong, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
  },
  statusOptionActive: { backgroundColor: colors.rail },
  statusOptionText: { ...typography.caption, color: colors.textSecondary },
  statusOptionTextActive: { color: '#fff', fontWeight: '700' },
  muted: { ...typography.caption, color: colors.textMuted },
  activityLine: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  commentRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  commentAuthor: { ...typography.captionStrong, color: colors.textPrimary },
  commentBody: { ...typography.body, color: colors.textSecondary },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
})
