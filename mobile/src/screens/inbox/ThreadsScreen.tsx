import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { PageHeader } from '../../components/PageHeader'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { colors, radius, shadows, spacing, typography } from '../../constants/theme'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'Threads'>

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function ThreadsScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['mail-threads'],
    queryFn: mailApi.threads,
  })

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <PageHeader
        title="Inbox"
        subtitle="Messages with your team"
        right={
          <IconButton
            icon="create-outline"
            label="New message"
            onPress={() => navigation.navigate('NewMessage')}
          />
        }
      />

      {isLoading ? (
        <LoadingState label="Loading messages…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t.user._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
              onPress={() => navigation.navigate('Conversation', { userId: item.user._id, userName: item.user.name })}
              accessibilityRole="button"
            >
              <Avatar name={item.user.name} uri={item.user.avatar} size={46} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.user.name}
                  </Text>
                  <Text style={styles.time}>{timeAgo(item.lastMessage.createdAt)}</Text>
                </View>
                <Text style={[styles.preview, item.unread > 0 && styles.previewUnread]} numberOfLines={1}>
                  {item.lastMessage.body}
                </Text>
              </View>
              {item.unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No messages yet"
              body="Start a conversation with a teammate."
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    ...shadows.card,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  time: { ...typography.caption, color: colors.textMuted },
  preview: { ...typography.caption, color: colors.textSecondary },
  previewUnread: { color: colors.textPrimary, fontWeight: '600' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
