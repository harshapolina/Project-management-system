import { useState } from 'react'
import { RefreshControl, ScrollView } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Fab } from '../../components/Fab'
import { TaskRow } from '../../components/TaskRow'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { STATUS_LABELS } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { smartGoBack } from '../../navigation/openProject'
import { tasksApi } from '../../api/tasks'
import { homeApi } from '../../api/home'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'
import type { TaskStatus } from '../../types/models'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectTasks'>

const STATUS_OPTIONS: { key: TaskStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: STATUS_LABELS.todo },
  { key: 'in_progress', label: STATUS_LABELS.in_progress },
  { key: 'review', label: STATUS_LABELS.review },
  { key: 'done', label: STATUS_LABELS.done },
]

export function ProjectTasksScreen({ route, navigation }: Props) {
  useColors()
  const { listContent } = useResponsive()

  const { projectId, projectName } = route.params
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list({ projectId }),
  })

  const filtered = (data || []).filter((t) => status === 'all' || t.status === status)
  const colors = useColors()

  const toggleTask = async (id: string) => {
    await homeApi.toggleTask(id)
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
  }

  return (
    <NestedChrome title="Tasks"
        subtitle={projectName || 'Project tasks'}
        subtitleIcon="checkbox-outline"
        onBack={() => smartGoBack(navigation, route)}>
<SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      {isLoading ? (
        <LoadingState label="Loading tasks…" variant="rows" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        >
          <SectionLabel count={filtered.length}>Tasks</SectionLabel>
          {filtered.length === 0 ? (
            <EmptyState
              title="No tasks"
              body="Tasks in this project will show up here."
              action={caps.createTask ? 'Add task' : undefined}
              onAction={caps.createTask ? () => navigation.navigate('CreateTask', { projectId }) : undefined}
            />
          ) : (
            <SurfaceCard padded={false}>
              {filtered.map((item) => (
                <TaskRow
                  key={item._id}
                  task={item}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
                  onToggle={() => toggleTask(item._id)}
                />
              ))}
            </SurfaceCard>
          )}
        </ScrollView>
      )}

      {caps.createTask ? (
        <Fab label="Add task" onPress={() => navigation.navigate('CreateTask', { projectId })} />
      ) : null}
    </NestedChrome>
  )
}
