import { useMemo, useState } from 'react'
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { TaskRow } from '../../components/TaskRow'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { Avatar } from '../../components/Avatar'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { homeApi } from '../../api/home'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import type { HomeStackParamList } from '../../navigation/types'
import type { Task } from '../../types/models'

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>

type FilterKey = 'assigned' | 'today' | 'personal' | 'done'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'assigned', label: 'Assigned' },
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

export function HomeScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterKey>('assigned')
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['home'],
    queryFn: homeApi.get,
  })

  const sections = useMemo(() => {
    if (!data) return []
    if (filter === 'today') {
      return data.tasks.today.length ? [{ title: 'Today', data: data.tasks.today }] : []
    }
    if (filter === 'personal') {
      return data.tasks.personal.length ? [{ title: 'Personal', data: data.tasks.personal }] : []
    }
    if (filter === 'done') {
      return data.tasks.done.length ? [{ title: 'Finished', data: data.tasks.done }] : []
    }
    // assigned — group open tasks by stage, like the web board
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

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.greeting} numberOfLines={1}>
            {data?.greeting || 'Hi'}
          </Text>
          <Text style={styles.subGreeting}>Cubic · your day, aligned</Text>
        </View>
        <Avatar name={user?.name} uri={user?.avatar} size={40} />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <Text
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {f.label}
            </Text>
          )
        })}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>
            {section.title} · {section.data.length}
          </Text>
        )}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
            onToggle={filter !== 'done' ? () => toggleTask(item._id) : undefined}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            title="Nothing here"
            body={
              filter === 'today'
                ? "No tasks due today. Enjoy the breathing room."
                : filter === 'personal'
                  ? 'No personal tasks yet.'
                  : filter === 'done'
                    ? 'Nothing finished yet.'
                    : "You're all caught up."
            }
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  greeting: { ...typography.h2, color: colors.textPrimary },
  subGreeting: { ...typography.caption, color: colors.textSecondary },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  filterChipActive: { backgroundColor: colors.rail, color: '#fff' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: {
    ...typography.captionStrong,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
})
