import { useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { IconButton } from '../../components/IconButton'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
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
  const colors = useColors()
  const { tabListContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['mail-threads'],
    queryFn: mailApi.threads,
  })

  return (
    <Screen padded={false} edges={['left', 'right']}>
      <AppNavBar />
      <PageHeader
        title="Inbox"
        subtitle="Messages with your team"
        subtitleIcon="chatbubbles-outline"
        right={
          <IconButton
            icon="create-outline"
            label="New message"
            tone="ghost"
            onPress={() => navigation.navigate('NewMessage')}
          />
        }
      />

      {isLoading ? (
        <LoadingState label="Loading messages…"  variant="rows" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t.user._id}
          contentContainerStyle={tabListContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <SurfaceCard
              onPress={() => navigation.navigate('Conversation', { userId: item.user._id, userName: item.user.name })}
            >
              <View style={styles.row}>
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
              </View>
            </SurfaceCard>
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

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    name: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    time: { ...typography.caption, color: c.textMuted },
    preview: { ...typography.caption, color: c.textSecondary },
    previewUnread: { color: c.textPrimary, fontWeight: '600' },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    unreadText: { color: c.textOnAccent, fontSize: 11, fontWeight: '700' },
  })
}
