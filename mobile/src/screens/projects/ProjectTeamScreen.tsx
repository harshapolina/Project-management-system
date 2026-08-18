import { useLayoutEffect } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import { ROLE_LABELS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectTeam'>

export function ProjectTeamScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Team` : 'Team' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading team…" />
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

  return (
    <Screen padded={false}>
      <FlatList
        data={data.project.members || []}
        keyExtractor={(m) => m.user._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.user.name} uri={item.user.avatar} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.user.name}
              </Text>
              <Text style={styles.role} numberOfLines={1}>
                {ROLE_LABELS[(item.role || item.user.role) as Role] || item.role || item.user.role}
              </Text>
              {item.user.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {item.user.email}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No team members yet" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  role: { ...typography.caption, color: colors.accent, textTransform: 'capitalize' },
  email: { ...typography.caption, color: colors.textSecondary },
})
