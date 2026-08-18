import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, spacing, typography } from '../../constants/theme'
import { notificationsApi } from '../../api/notifications'
import { isApiError } from '../../api/client'
import type { AppNotification } from '../../types/ops'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'

function timeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function taskIdFrom(n: AppNotification) {
  const metaId = n.meta?.taskId
  if (typeof metaId === 'string' && metaId) return metaId
  const match = String(n.link || '').match(/task=([a-f0-9]{24})/i)
  return match?.[1] || null
}

export function NotificationsScreen() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<MoreStackParamList, 'Notifications'>,
        BottomTabNavigationProp<RootTabParamList>
      >
    >()
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  })

  const readOne = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const readAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading alerts…" />
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

  const items = data || []
  const unread = items.filter((n) => !n.read).length

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {unread ? (
          <Pressable onPress={() => readAll.mutate()} style={styles.markAll}>
            <Text style={styles.markAllText}>Mark all as read ({unread})</Text>
          </Pressable>
        ) : null}

        {!items.length ? (
          <EmptyState icon="notifications-outline" title="No alerts yet" body="Task assignments and mentions will land here." />
        ) : (
          items.map((n) => (
            <Pressable
              key={n._id}
              onPress={() => {
                if (!n.read) readOne.mutate(n._id)
                const taskId = taskIdFrom(n)
                if (taskId) {
                  navigation.navigate('Home', { screen: 'TaskDetail', params: { taskId } })
                } else if (String(n.link || '').includes('/inbox')) {
                  navigation.navigate('Inbox')
                }
              }}
            >
              <Card style={[styles.card, !n.read && styles.unread]}>
                <View style={styles.top}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                </View>
                {n.body ? (
                  <Text style={styles.body} numberOfLines={3}>
                    {n.body}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  markAll: { alignSelf: 'flex-end', marginBottom: 4 },
  markAllText: { ...typography.captionStrong, color: colors.accent },
  card: { gap: 4 },
  unread: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  time: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.caption, color: colors.textSecondary },
})
