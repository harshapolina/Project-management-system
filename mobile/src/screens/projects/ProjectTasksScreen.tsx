import { useLayoutEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { TaskRow } from '../../components/TaskRow'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, STATUS_LABELS, typography } from '../../constants/theme'
import { tasksApi } from '../../api/tasks'
import { homeApi } from '../../api/home'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'
import type { TaskStatus } from '../../types/models'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectTasks'>

const STATUS_FILTERS: (TaskStatus | 'all')[] = ['all', 'todo', 'in_progress', 'review', 'done']

export function ProjectTasksScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const queryClient = useQueryClient()

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Tasks` : 'Tasks' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list({ projectId }),
  })

  const filtered = (data || []).filter((t) => status === 'all' || t.status === status)

  const toggleTask = async (id: string) => {
    await homeApi.toggleTask(id)
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
  }

  return (
    <Screen padded={false}>
      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(s) => s}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => {
            const active = status === item
            return (
              <Text
                onPress={() => setStatus(item)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
              >
                {item === 'all' ? 'All' : STATUS_LABELS[item]}
              </Text>
            )
          }}
        />
      </View>

      {isLoading ? (
        <LoadingState label="Loading tasks…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
              onToggle={() => toggleTask(item._id)}
            />
          )}
          ListEmptyComponent={<EmptyState title="No tasks" body="Tasks in this project will show up here." />}
        />
      )}

      {caps.createTask ? (
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('CreateTask', { projectId })}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  filters: { paddingVertical: spacing.sm },
  chip: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.rail, color: '#fff' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl * 2 },
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
