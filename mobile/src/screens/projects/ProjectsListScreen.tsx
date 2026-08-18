import { useState } from 'react'
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { ProjectCard } from '../../components/ProjectCard'
import { Input } from '../../components/Input'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectsList'>

export function ProjectsListScreen({ navigation }: Props) {
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

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Projects</Text>
        {caps.createProject ? (
          <Pressable
            onPress={() => navigation.navigate('CreateProject')}
            style={styles.addButton}
            accessibilityRole="button"
            accessibilityLabel="Create project"
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Input placeholder="Search projects or clients…" value={search} onChangeText={setSearch} />
      </View>

      {isLoading ? (
        <LoadingState label="Loading projects…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p._id}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => navigation.navigate('ProjectOverview', { projectId: item._id, projectName: item.name })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={search ? 'No matching projects' : 'No projects yet'}
              body={search ? 'Try a different search.' : 'Projects your team creates will show up here.'}
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.md : spacing.sm,
    paddingBottom: spacing.sm,
  },
  heading: { ...typography.h2, color: colors.textPrimary },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
})
