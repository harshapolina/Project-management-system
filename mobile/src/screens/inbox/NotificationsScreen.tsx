import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
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

function metaId(n: AppNotification, keys: string[]) {
  for (const key of keys) {
    const v = n.meta?.[key]
    if (typeof v === 'string' && v) return v
  }
  return null
}

function openNotification(
  n: AppNotification,
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<MoreStackParamList, 'Notifications'>,
    BottomTabNavigationProp<RootTabParamList>
  >,
) {
  const taskId = taskIdFrom(n)
  if (taskId) {
    navigation.navigate('Home', { screen: 'TaskDetail', params: { taskId } })
    return
  }

  const projectId = metaId(n, ['projectId'])
  if (projectId) {
    navigation.navigate('Projects', {
      screen: 'ProjectOverview',
      params: { projectId },
    })
    return
  }

  const link = String(n.link || '')
  if (link.includes('/inbox') || link.includes('mail')) {
    navigation.navigate('Inbox')
    return
  }
  if (link.includes('/leads') || link.includes('enquiry')) {
    navigation.navigate('Leads')
    return
  }
  if (link.includes('/snag')) {
    navigation.navigate('Snags')
    return
  }
  if (link.includes('/billing') || link.includes('invoice')) {
    navigation.navigate('Billing')
    return
  }
  if (link.includes('/finance') || link.includes('expense')) {
    navigation.navigate('Finance')
    return
  }
  if (link.includes('/projects/') || link.includes('project=')) {
    const m = link.match(/projects\/([a-f0-9]{24})|project=([a-f0-9]{24})/i)
    const id = m?.[1] || m?.[2]
    if (id) {
      navigation.navigate('Projects', {
        screen: 'ProjectOverview',
        params: { projectId: id },
      })
      return
    }
    navigation.navigate('Projects')
  }
}

export function NotificationsScreen() {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

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

  const chromeProps = {
    title: "Alerts",
    subtitle: "Assignments and mentions",
    subtitleIcon: 'notifications-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading alerts…" variant="rows" />
      </NestedChrome>
    )
  }
  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const items = data || []
  const unread = items.filter((n) => !n.read).length

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView
        contentContainerStyle={listContent}
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
            <SurfaceCard
              key={n._id}
              onPress={() => {
                if (!n.read) readOne.mutate(n._id)
                openNotification(n, navigation)
              }}
              style={!n.read ? styles.unread : undefined}
            >
              <View style={styles.top}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
              </View>
              {n.body ? (
                <Text style={styles.body} numberOfLines={3}>
                  {n.body}
                </Text>
              ) : null}
            </SurfaceCard>
          ))
        )}
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    markAll: { alignSelf: 'flex-end' },
    markAllText: { ...typography.captionStrong, color: c.accent },
    unread: { borderColor: c.accent, backgroundColor: c.accentSoft },
    top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    time: { ...typography.caption, color: c.textMuted },
    body: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
  })
}
