import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import type { InboxTab } from './InboxTabs'

const COPY: Record<InboxTab, string> = {
  primary: 'Workspace notifications',
  mail: 'Team messages',
  later: 'Snoozed for later',
  cleared: 'Recently cleared',
}

export function InboxContextBar({
  tab,
  unreadCount,
  onMarkAllRead,
  onCompose,
}: {
  tab: InboxTab
  unreadCount?: number
  onMarkAllRead?: () => void
  onCompose?: () => void
}) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.hint}>{COPY[tab]}</Text>
        {tab === 'primary' && unreadCount && unreadCount > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{unreadCount} new</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        {tab === 'primary' && onMarkAllRead ? (
          <Pressable onPress={onMarkAllRead} style={styles.chip} hitSlop={6}>
            <Text style={styles.chipText}>Mark all read</Text>
          </Pressable>
        ) : null}
        {tab === 'mail' && onCompose ? (
          <Pressable onPress={onCompose} style={[styles.compose, { backgroundColor: colors.accent }]} hitSlop={6}>
            <Ionicons name="add" size={16} color={colors.textOnAccent} />
            <Text style={[styles.composeText, { color: colors.textOnAccent }]}>New message</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: pagePadding,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      flexShrink: 0,
    },
    left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
    hint: { ...typography.micro, color: c.textMuted, flexShrink: 1 },
    countPill: {
      backgroundColor: c.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    countText: { ...typography.micro, color: c.accent, fontWeight: '700' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: c.surface,
    },
    chipText: { ...typography.micro, color: c.textSecondary, fontWeight: '600' },
    compose: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    composeText: { ...typography.micro, fontWeight: '700' },
  })
}
