import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { Avatar } from '../../components/Avatar'
import { PriorityBadge, StatusBadge } from '../../components/Badge'
import { StatCard } from '../../components/StatCard'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { tasksApi } from '../../api/tasks'
import { isApiError } from '../../api/client'
import type { LiveBoardTask } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'LiveBoard'>

type View_ = 'people' | 'tasks'

const VIEWS: { key: View_; label: string }[] = [
  { key: 'people', label: 'By person' },
  { key: 'tasks', label: 'All open work' },
]

type TaskFilter = 'all' | 'urgent' | 'overdue' | 'unassigned'

const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'unassigned', label: 'Unassigned' },
]

function dueLabel(task: LiveBoardTask): string {
  if (!task.dueDate) return 'No due date'
  try {
    const label = new Date(task.dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
    return task.overdue ? `Overdue · ${label}` : `Due ${label}`
  } catch {
    return ''
  }
}

/**
 * Live operations board — who is carrying what, refreshed every 12 seconds
 * like the web page, so a supervisor on site sees the same picture as the office.
 */
export function LiveBoardScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [view, setView] = useState<View_>('people')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['live-board'],
    queryFn: tasksApi.liveBoard,
    refetchInterval: 12_000,
  })

  const chromeProps = {
    title: 'Live board',
    subtitle: dataUpdatedAt
      ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        })}`
      : 'Live team workload',
    subtitleIcon: 'pulse-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading the board…" variant="dashboard" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const q = search.trim().toLowerCase()
  const tasks = data.tasks.filter((task) => {
    if (filter === 'urgent' && task.priority !== 'urgent') return false
    if (filter === 'overdue' && !task.overdue) return false
    if (filter === 'unassigned' && task.assignee) return false
    if (!q) return true
    return [task.title, task.project?.name, task.assignee?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const team = data.team.filter((row) => {
    if (!q) return true
    return [row.user.name, row.user.title, row.user.role]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const header = (
    <View style={styles.header}>
      <View style={styles.stats}>
        <StatCard label="Open" value={data.counts.open} />
        <StatCard
          label="Overdue"
          value={data.counts.overdue}
          tone={data.counts.overdue ? 'danger' : 'default'}
        />
        <StatCard
          label="Urgent"
          value={data.counts.urgent}
          tone={data.counts.urgent ? 'warning' : 'default'}
        />
        <StatCard label="In progress" value={data.counts.in_progress} />
        <StatCard label="In review" value={data.counts.review} />
        <StatCard
          label="Unassigned"
          value={data.counts.unassigned}
          tone={data.counts.unassigned ? 'warning' : 'default'}
          onPress={() => {
            setView('tasks')
            setFilter('unassigned')
          }}
        />
      </View>
      <Text style={styles.caption}>
        {data.counts.peopleWithWork} {data.counts.peopleWithWork === 1 ? 'person has' : 'people have'}{' '}
        open work. Refreshes every 12 seconds.
      </Text>
    </View>
  )

  const refresh = (
    <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />
  )

  return (
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder={view === 'people' ? 'Search people' : 'Search tasks or projects'}
      />
      {view === 'tasks' ? (
        <SegmentedControl options={TASK_FILTERS} value={filter} onChange={setFilter} />
      ) : null}

      {view === 'people' ? (
        <FlatList
          data={team}
          keyExtractor={(row) => row.user._id}
          contentContainerStyle={listContent}
          refreshControl={refresh}
          ListHeaderComponent={header}
          renderItem={({ item }) => {
            const open = expanded === item.user._id
            const theirs = data.tasks.filter((t) => t.assignee?._id === item.user._id)
            return (
              <SurfaceCard
                onPress={() => setExpanded(open ? null : item.user._id)}
              >
                <View style={styles.personRow}>
                  <Avatar name={item.user.name} uri={item.user.avatar} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {item.user.name}
                    </Text>
                    <Text style={styles.personMeta} numberOfLines={1}>
                      {item.open} open · {item.in_progress} running · {item.review} in review
                    </Text>
                  </View>
                  <View style={styles.countBox}>
                    <Text style={styles.countValue}>{item.open}</Text>
                  </View>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>

                <View style={styles.loadTrack}>
                  <View
                    style={[
                      styles.loadFill,
                      {
                        width: `${item.load}%`,
                        backgroundColor: item.overdue ? colors.danger : colors.accent,
                      },
                    ]}
                  />
                </View>

                {item.urgent || item.overdue ? (
                  <View style={styles.flags}>
                    {item.urgent ? (
                      <Text style={[styles.flag, { color: colors.warning }]}>{item.urgent} urgent</Text>
                    ) : null}
                    {item.overdue ? (
                      <Text style={[styles.flag, { color: colors.danger }]}>{item.overdue} overdue</Text>
                    ) : null}
                  </View>
                ) : null}

                {open ? (
                  <View style={styles.taskList}>
                    {theirs.length === 0 ? (
                      <Text style={styles.personMeta}>Nothing open right now.</Text>
                    ) : (
                      theirs.map((task) => (
                        <Pressable
                          key={task._id}
                          style={styles.miniTask}
                          onPress={() => navigation.navigate('TaskDetail', { taskId: task._id })}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.miniTitle} numberOfLines={1}>
                              {task.title}
                            </Text>
                            <Text
                              style={[styles.miniMeta, task.overdue && { color: colors.danger }]}
                              numberOfLines={1}
                            >
                              {[task.project?.name, dueLabel(task)].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                          <PriorityBadge priority={task.priority} />
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : null}
              </SurfaceCard>
            )
          }}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Nobody matches" body="Try another search." />
          }
        />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => task._id}
          contentContainerStyle={listContent}
          refreshControl={refresh}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <SurfaceCard onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}>
              <View style={styles.taskTop}>
                <Text style={styles.taskTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <PriorityBadge priority={item.priority} />
              </View>
              <View style={styles.taskMetaRow}>
                <StatusBadge status={item.status} />
                <Text style={[styles.taskMeta, item.overdue && { color: colors.danger }]} numberOfLines={1}>
                  {dueLabel(item)}
                </Text>
              </View>
              <Text style={styles.taskMeta} numberOfLines={1}>
                {[
                  item.project?.name,
                  item.assignee ? item.assignee.name : 'Unassigned',
                  item.assignedBy ? `set by ${item.assignedBy.name}` : null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
            </SurfaceCard>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-outline"
              title="Nothing here"
              body={
                filter === 'all'
                  ? 'No open work matches that search.'
                  : 'Nothing in this filter right now.'
              }
            />
          }
        />
      )}
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    header: { gap: spacing.md, marginBottom: spacing.sm },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    caption: { ...typography.micro, color: c.textMuted },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    personName: { ...typography.bodyStrong, color: c.textPrimary },
    personMeta: { ...typography.micro, color: c.textMuted, marginTop: 2 },
    countBox: {
      minWidth: 34,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.md,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
    },
    countValue: { ...typography.bodyStrong, color: c.textPrimary },
    loadTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    loadFill: { height: 4, borderRadius: 2 },
    flags: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    flag: { ...typography.micro, fontWeight: '600' },
    taskList: { marginTop: spacing.md, gap: spacing.sm },
    miniTask: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    miniTitle: { ...typography.caption, color: c.textPrimary },
    miniMeta: { ...typography.micro, color: c.textMuted, marginTop: 2 },
    taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    taskTitle: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    taskMeta: { ...typography.micro, color: c.textMuted, flex: 1 },
  })
}
