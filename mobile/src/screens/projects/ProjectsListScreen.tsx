import { useState } from 'react'
import { FlatList, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { ProjectCard } from '../../components/ProjectCard'
import { SearchField } from '../../components/SearchField'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectsList'>

export function ProjectsListScreen({ navigation }: Props) {
  const colors = useColors()
  const { tabListContent } = useResponsive()

  const [search, setSearch] = useState('')
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  })

  const filtered = (data || []).filter((p) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
  })

  const chromeProps = {
    title: 'Projects',
    subtitle: data ? `${data.length} live spaces` : 'Your active workspaces',
    subtitleIcon: 'folder-outline' as const,
    right: caps.createProject ? (
      <IconButton
        icon="add-outline"
        label="Create project"
        tone="ghost"
        onPress={() => navigation.navigate('CreateProject')}
      />
    ) : undefined,
  }

  return (
    <NestedChrome {...chromeProps} showBack={false}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search projects or clients" />

      {isLoading ? (
        <LoadingState label="Loading projects…" variant="cards" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p._id}
          contentContainerStyle={tabListContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => navigation.navigate('ProjectOverview', { projectId: item._id, projectName: item.name })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="folder-open-outline"
              title={search ? 'No matching projects' : 'No projects yet'}
              body={search ? 'Try a different name or client.' : 'New projects will appear here.'}
            />
          }
        />
      )}
    </NestedChrome>
  )
}
