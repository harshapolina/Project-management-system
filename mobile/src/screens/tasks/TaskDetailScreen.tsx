import { useEffect, useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Avatar } from '../../components/Avatar'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { StatusBadge, PriorityBadge } from '../../components/Badge'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { radius, spacing, STATUS_LABELS, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { tasksApi } from '../../api/tasks'
import { isApiError } from '../../api/client'
import { formatTrackedSeconds, liveTrackedSeconds } from '../../utils/time'
import type { ChecklistItem, TaskStatus } from '../../types/models'
import type { RouteProp } from '@react-navigation/native'
import type { HomeStackParamList } from '../../navigation/types'

const STATUS_FLOW: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

type Props = { route: RouteProp<HomeStackParamList, 'TaskDetail'> }

export function TaskDetailScreen({ route }: Props) {
  const colors = useColors()
  const { listContent, pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])
  const navigation = useNavigation()

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
    queryClient.invalidateQueries({ queryKey: ['active-timer'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(taskId, { status }),
    onSuccess: invalidate,
  })

  const checklistMutation = useMutation({
    mutationFn: (checklist: ChecklistItem[]) => tasksApi.update(taskId, { checklist }),
    onSuccess: invalidate,
  })

  const commentMutation = useMutation({
    mutationFn: (body: string) => tasksApi.addComment(taskId, body),
    onSuccess: () => {
      setComment('')
      invalidate()
    },
  })

  const timerMutation = useMutation({
    mutationFn: async () => {
      const task = data?.task
      if (!task) return
      if (task.timeTrackingStartedAt) {
        return tasksApi.update(taskId, {
          timeSpent: liveTrackedSeconds(task.timeSpent, task.timeTrackingStartedAt),
          timeTrackingStartedAt: null,
          timeTrackingUserId: null,
        })
      }
      return tasksApi.update(taskId, { timeTrackingStartedAt: new Date().toISOString() })
    },
    onSuccess: invalidate,
  })

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!data?.task.timeTrackingStartedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [data?.task.timeTrackingStartedAt])

  const assigneeName = useMemo(() => {
    const a = data?.task.assignee
    if (a && typeof a === 'object') return a.name
    return 'Unassigned'
  }, [data])

  const header = (
    <>
      <AppNavBar />
      <PageHeader
        title="Task"
        subtitle="Details & discussion"
        subtitleIcon="checkbox-outline"
        onBack={() => navigation.goBack()}
      />
    </>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <LoadingState label="Loading task…" variant="detail" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const { task, comments, activity } = data

  return (
    <Screen padded={false} edges={['left', 'right']} keyboardAvoiding>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c._id}
          contentContainerStyle={[listContent, styles.listGrow]}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <SurfaceCard>
                <Text style={styles.title}>{task.title}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </View>
                {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
              </SurfaceCard>

              <SectionLabel>Details</SectionLabel>
              <SurfaceCard style={styles.detailsCard}>
                <Text style={styles.cardLabel}>Assignee</Text>
                <View style={styles.assigneeRow}>
                  <Avatar
                    name={assigneeName}
                    uri={typeof task.assignee === 'object' ? task.assignee?.avatar : undefined}
                    size={28}
                  />
                  <Text style={styles.assigneeName}>{assigneeName}</Text>
                </View>
                {task.dueDate ? (
                  <>
                    <Text style={[styles.cardLabel, { marginTop: spacing.sm }]}>Due</Text>
                    <Text style={styles.assigneeName}>{new Date(task.dueDate).toDateString()}</Text>
                  </>
                ) : null}
                <Text style={[styles.cardLabel, { marginTop: spacing.sm }]}>Time tracked</Text>
                <View style={styles.timerRow}>
                  <Text style={styles.assigneeName}>
                    {formatTrackedSeconds(liveTrackedSeconds(task.timeSpent, task.timeTrackingStartedAt, now))}
                  </Text>
                  <Pressable
                    onPress={() => timerMutation.mutate()}
                    disabled={timerMutation.isPending}
                    style={[styles.timerBtn, task.timeTrackingStartedAt && styles.timerBtnStop]}
                  >
                    <Text style={[styles.timerBtnText, task.timeTrackingStartedAt && styles.timerBtnTextStop]}>
                      {task.timeTrackingStartedAt ? 'Stop timer' : 'Start timer'}
                    </Text>
                  </Pressable>
                </View>
              </SurfaceCard>

              {(task.checklist || []).length > 0 ? (
                <>
                  <SectionLabel count={task.checklist!.length}>Checklist</SectionLabel>
                  <SurfaceCard padded={false}>
                    {task.checklist!.map((item, index) => (
                      <Pressable
                        key={item._id || `${item.text}-${index}`}
                        style={styles.checkRow}
                        onPress={() => {
                          const next = (task.checklist || []).map((c, i) =>
                            i === index ? { ...c, done: !c.done } : c,
                          )
                          checklistMutation.mutate(next)
                        }}
                        disabled={checklistMutation.isPending}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.done }}
                      >
                        <View style={[styles.checkBox, item.done && styles.checkBoxDone]}>
                          {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
                        </View>
                        <Text style={[styles.checkText, item.done && styles.checkTextDone]}>{item.text}</Text>
                      </Pressable>
                    ))}
                  </SurfaceCard>
                </>
              ) : null}

              <SectionLabel>Move to</SectionLabel>
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

              <SectionLabel>Activity</SectionLabel>
              <SurfaceCard>
                {activity.length === 0 ? (
                  <Text style={styles.muted}>No activity yet.</Text>
                ) : (
                  activity.slice(0, 6).map((a) => (
                    <Text key={a._id} style={styles.activityLine} numberOfLines={2}>
                      {a.message}
                    </Text>
                  ))
                )}
              </SurfaceCard>

              <SectionLabel count={comments.length || undefined}>Comments</SectionLabel>
            </View>
          }
          renderItem={({ item }) => (
            <SurfaceCard>
              <View style={styles.commentRow}>
                <Avatar name={item.author?.name} uri={item.author?.avatar} size={28} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.commentAuthor}>{item.author?.name || 'Someone'}</Text>
                  <Text style={styles.commentBody}>{item.body}</Text>
                </View>
              </View>
            </SurfaceCard>
          )}
          ListEmptyComponent={
            <EmptyState title="No comments yet" body="Be the first to leave a note on this task." />
          }
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

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    listGrow: { flexGrow: 1 },
    headerBlock: { gap: spacing.md },
    title: { ...typography.h3, color: c.textPrimary },
    badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    description: { ...typography.body, color: c.textSecondary, lineHeight: 21, marginTop: spacing.sm },
    detailsCard: { gap: 0 },
    cardLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase', marginBottom: 4 },
    assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    assigneeName: { ...typography.bodyStrong, color: c.textPrimary },
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    timerBtn: {
      backgroundColor: c.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    timerBtnStop: { backgroundColor: c.dangerSoft },
    timerBtnText: { ...typography.micro, color: c.accent, fontWeight: '700' },
    timerBtnTextStop: { color: c.danger },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    checkBoxDone: { backgroundColor: c.accent, borderColor: c.accent },
    checkMark: { color: c.textOnAccent, fontSize: 12, fontWeight: '700' },
    checkText: { ...typography.body, color: c.textPrimary, flex: 1 },
    checkTextDone: { color: c.textMuted, textDecorationLine: 'line-through' },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statusOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    statusOptionActive: { backgroundColor: c.accent, borderColor: c.accent },
    statusOptionText: { ...typography.caption, color: c.textSecondary },
    statusOptionTextActive: { color: c.textOnAccent, fontWeight: '700' },
    muted: { ...typography.caption, color: c.textMuted },
    activityLine: { ...typography.caption, color: c.textSecondary, marginBottom: 4 },
    commentRow: { flexDirection: 'row', gap: spacing.sm },
    commentAuthor: { ...typography.captionStrong, color: c.textPrimary },
    commentBody: { ...typography.body, color: c.textSecondary },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: pagePadding,
      paddingTop: spacing.md,
      paddingBottom: TAB_BAR_CLEARANCE,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.canvas,
    },
  })
}
