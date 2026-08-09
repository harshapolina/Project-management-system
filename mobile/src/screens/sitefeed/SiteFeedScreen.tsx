import { useLayoutEffect } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { siteFeedApi } from '../../api/siteFeed'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'SiteFeed'>

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'just now'
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function SiteFeedScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params || {}

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Site Feed` : 'Site Feed' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['site-updates', projectId ?? 'all'],
    queryFn: () => siteFeedApi.updates(projectId ? { projectId } : undefined),
  })

  return (
    <Screen padded={false}>
      {isLoading ? (
        <LoadingState label="Loading site feed…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(u) => u._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Avatar name={item.author.name} uri={item.author.avatar} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.author} numberOfLines={1}>
                      {item.author.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[pName, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {item.progress != null ? (
                    <Text style={styles.progress}>{item.progress}%</Text>
                  ) : null}
                </View>
                <Text style={styles.note}>{item.note}</Text>
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState title="No site updates yet" body="Field progress notes will show up here." />}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('PostSiteUpdate', { projectId, projectName })}
        accessibilityLabel="Post update"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  progress: { ...typography.captionStrong, color: colors.accent },
  note: { ...typography.body, color: colors.textPrimary },
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
