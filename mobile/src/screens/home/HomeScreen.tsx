import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { TaskRow } from '../../components/TaskRow'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { Avatar } from '../../components/Avatar'
import { PageHeader } from '../../components/PageHeader'
import { IconButton } from '../../components/IconButton'
import { SegmentedControl } from '../../components/SegmentedControl'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { colors, radius, shadows, spacing, typography } from '../../constants/theme'
import { homeApi } from '../../api/home'
import { notificationsApi } from '../../api/notifications'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import type { HomeStackParamList, RootTabParamList } from '../../navigation/types'
import type { Task } from '../../types/models'

type Props = {
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
    BottomTabNavigationProp<RootTabParamList>
  >
}

type FilterKey = 'assigned' | 'today' | 'personal' | 'done'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'assigned', label: 'My work' },
  { key: 'today', label: 'Today' },
  { key: 'personal', label: 'Personal' },
  { key: 'done', label: 'Done' },
]

const STAGE_ORDER: Task['status'][] = ['todo', 'in_progress', 'review']
const STAGE_TITLES: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Needs check',
}

function firstName(name?: string, greeting?: string) {
  if (name) return name.split(' ')[0]
  if (greeting) return greeting.replace(/^hi[, ]*/i, '').split(' ')[0] || 'there'
  return 'there'
}

export function HomeScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterKey>('assigned')
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['home'],
    queryFn: homeApi.get,
  })
  const alerts = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 20_000,
  })
  const unread = (alerts.data || []).filter((n) => !n.read).length

  const counts = useMemo(() => {
    const assigned = data?.tasks.assigned || []
    const open = assigned.filter((t) => t.status !== 'done').length
    return {
      open,
      today: data?.tasks.today.length || 0,
      done: data?.tasks.done.length || 0,
    }
  }, [data])

  const sections = useMemo(() => {
    if (!data) return []
    if (filter === 'today') {
      return data.tasks.today.length ? [{ title: 'Due today', data: data.tasks.today }] : []
    }
    if (filter === 'personal') {
      return data.tasks.personal.length ? [{ title: 'Personal', data: data.tasks.personal }] : []
    }
    if (filter === 'done') {
      return data.tasks.done.length ? [{ title: 'Finished', data: data.tasks.done }] : []
    }
    const buckets: Record<string, Task[]> = {}
    for (const t of data.tasks.assigned) {
      const key = STAGE_ORDER.includes(t.status) ? t.status : 'todo'
      buckets[key] = buckets[key] || []
      buckets[key].push(t)
    }
    return STAGE_ORDER.filter((s) => buckets[s]?.length).map((s) => ({
      title: STAGE_TITLES[s],
      data: buckets[s],
    }))
  }, [data, filter])

  const toggleTask = async (id: string) => {
    queryClient.setQueryData(['home'], (prev: typeof data) => {
      if (!prev) return prev
      const bump = (arr: Task[]) => arr.map((t) => (t._id === id ? { ...t, status: 'done' as const } : t))
      return { ...prev, tasks: { ...prev.tasks, assigned: bump(prev.tasks.assigned), today: bump(prev.tasks.today) } }
    })
    try {
      await homeApi.toggleTask(id)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['home'] })
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your work…" />
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

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <PageHeader
        eyebrow={dateLabel}
        title={`Hi, ${firstName(user?.name, data?.greeting)}`}
        subtitle="Here’s what needs you today."
        right={
          <View style={styles.headerRight}>
            <IconButton
              icon="notifications-outline"
              label="Alerts"
              tone="muted"
              badge={unread}
              onPress={() => navigation.navigate('More', { screen: 'Notifications' })}
            />
            <IconButton
              icon="add"
              label="New task"
              onPress={() => navigation.navigate('CreateTask', { isPersonal: filter === 'personal' })}
            />
            <Pressable
              onPress={() => navigation.navigate('More', { screen: 'ProfileHub' })}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Avatar name={user?.name} uri={user?.avatar} size={40} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.stats}>
        <Stat value={counts.open} label="Open" />
        <Stat value={counts.today} label="Today" />
        <Stat value={counts.done} label="Done" />
      </View>

      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>
            {section.title}
            <Text style={styles.sectionCount}>  {section.data.length}</Text>
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.rowWrap,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
            ]}
          >
            <TaskRow
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
              onToggle={filter !== 'done' ? () => toggleTask(item._id) : undefined}
            />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title={filter === 'today' ? 'Nothing due today' : filter === 'personal' ? 'No personal tasks' : filter === 'done' ? 'Nothing finished yet' : 'You’re all caught up'}
            body={
              filter === 'assigned'
                ? 'New assignments will show up here.'
                : 'Switch filters or add a task to get started.'
            }
          />
        }
      />
    </Screen>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  sectionTitle: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    paddingTop: spacing.md,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCount: { color: colors.textMuted, fontWeight: '500' },
  rowWrap: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 4,
  },
})
