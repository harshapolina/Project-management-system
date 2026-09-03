import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SurfaceCard } from './SurfaceCard'
import { radius, spacing, typography, type AppColors, type ChatColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useChatColors } from '../theme/useChatColors'
import { useResponsive } from '../theme/useResponsive'
import { formatThreadTime } from '../utils/chatUtils'
import type { AppNotification } from '../types/ops'

export function NotificationTriageRow({
  item,
  onPress,
  onLater,
  onClear,
  onRestore,
}: {
  item: AppNotification
  onPress?: () => void
  onLater?: () => void
  onClear?: () => void
  onRestore?: () => void
}) {
  const colors = useColors()
  const chat = useChatColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, chat, pagePadding), [colors, chat, pagePadding])
  const unread = !item.read

  return (
    <View style={styles.wrap}>
      <SurfaceCard onPress={onPress} padded={false} style={unread ? styles.cardUnread : undefined}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: unread ? chat.online : colors.border }]} />
          <View style={styles.body}>
            <View style={styles.top}>
              <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.createdAt ? (
                <Text style={styles.time}>{formatThreadTime(item.createdAt)}</Text>
              ) : null}
            </View>
            {item.body ? (
              <Text style={styles.sub} numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            {onLater ? (
              <Pressable onPress={onLater} style={styles.actionChip} hitSlop={6}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            {onClear ? (
              <Pressable onPress={onClear} style={styles.actionChip} hitSlop={6}>
                <Ionicons name="checkmark-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            {onRestore ? (
              <Pressable onPress={onRestore} style={styles.actionChip} hitSlop={6}>
                <Ionicons name="arrow-undo-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
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
    cardUnread: {
      borderColor: c.accentSoft,
      backgroundColor: c.accentSoft,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 6,
      flexShrink: 0,
    },
    body: { flex: 1, minWidth: 0, gap: 4 },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    title: {
      ...typography.bodyStrong,
      fontSize: 15,
      color: c.textPrimary,
      flex: 1,
    },
    titleUnread: { fontWeight: '700' },
    sub: {
      ...typography.caption,
      fontSize: 14,
      color: chat.rowPreview,
      lineHeight: 19,
    },
    time: {
      ...typography.caption,
      color: chat.rowPreview,
      flexShrink: 0,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
      paddingTop: 2,
    },
    actionChip: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
  })
}
