import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Avatar } from '../Avatar'
import { SurfaceCard } from '../SurfaceCard'
import { spacing, typography, type AppColors, type ChatColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useChatColors } from '../../theme/useChatColors'
import { useResponsive } from '../../theme/useResponsive'
import { formatThreadTime } from '../../utils/chatUtils'

export function ThreadRow({
  name,
  avatar,
  preview,
  time,
  unread = 0,
  online = false,
  onPress,
}: {
  name: string
  avatar?: string
  preview?: string
  time?: string
  unread?: number
  online?: boolean
  onPress: () => void
}) {
  const colors = useColors()
  const chat = useChatColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, chat, pagePadding), [colors, chat, pagePadding])
  const hasUnread = unread > 0

  return (
    <View style={styles.wrap}>
      <SurfaceCard onPress={onPress} padded={false} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatarWrap}>
            <Avatar name={name} uri={avatar} size={48} />
            {online || hasUnread ? <View style={styles.onlineDot} /> : null}
          </View>
          <View style={styles.body}>
            <View style={styles.top}>
              <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
                {name}
              </Text>
              {time ? <Text style={styles.time}>{formatThreadTime(time)}</Text> : null}
            </View>
            {preview ? (
              <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={2}>
                {preview}
              </Text>
            ) : null}
          </View>
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </SurfaceCard>
    </View>
  )
}

function createStyles(c: AppColors, chat: ChatColors, pagePadding: number) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: pagePadding,
      marginBottom: spacing.sm,
    },
    card: {
      marginBottom: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    avatarWrap: {
      position: 'relative',
      flexShrink: 0,
    },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: chat.online,
      borderWidth: 2,
      borderColor: c.surface,
    },
    body: { flex: 1, minWidth: 0, gap: 3 },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: {
      ...typography.bodyStrong,
      fontSize: 15,
      color: c.textPrimary,
      flex: 1,
    },
    nameUnread: { fontWeight: '700' },
    time: {
      ...typography.caption,
      color: chat.rowPreview,
      flexShrink: 0,
    },
    preview: {
      ...typography.caption,
      fontSize: 14,
      color: chat.rowPreview,
      lineHeight: 19,
    },
    previewUnread: {
      color: c.textSecondary,
      fontWeight: '500',
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      flexShrink: 0,
    },
    badgeText: { color: c.textOnAccent, fontSize: 11, fontWeight: '800' },
  })
}
