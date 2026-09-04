import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, typography, radius, type AppColors, type ChatColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useChatColors } from '../../theme/useChatColors'
import { useResponsive } from '../../theme/useResponsive'

export type InboxTab = 'primary' | 'mail' | 'later' | 'cleared'

const TABS: { key: InboxTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'primary', label: 'Primary', icon: 'mail-outline' },
  { key: 'mail', label: 'Messages', icon: 'chatbubbles-outline' },
  { key: 'later', label: 'Later', icon: 'time-outline' },
  { key: 'cleared', label: 'Cleared', icon: 'checkmark-done-outline' },
]

export function InboxTabs({
  value,
  onChange,
  variant = 'default',
}: {
  value: InboxTab
  onChange: (v: InboxTab) => void
  variant?: 'default' | 'hero'
}) {
  const colors = useColors()
  const chat = useChatColors()
  const { pagePadding } = useResponsive()
  const isHero = variant === 'hero'
  const styles = useMemo(
    () => createStyles(colors, chat, pagePadding, isHero),
    [colors, chat, pagePadding, isHero],
  )

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {TABS.map((tab) => {
        const active = tab.key === value
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={isHero ? (active ? chat.headerText : chat.headerTextMuted) : active ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function createStyles(c: AppColors, chat: ChatColors, pagePadding: number, isHero: boolean) {
  return StyleSheet.create({
    scroll: { flexGrow: 0, flexShrink: 0 },
    row: {
      flexDirection: 'row',
      paddingHorizontal: pagePadding,
      gap: spacing.xs,
      paddingBottom: isHero ? spacing.xs : 0,
      borderBottomWidth: isHero ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: isHero ? 6 : spacing.md,
      paddingHorizontal: isHero ? spacing.sm : spacing.sm,
      borderRadius: isHero ? radius.full : 0,
      backgroundColor: isHero ? chat.headerChipBg : 'transparent',
    },
    tabActive: isHero
      ? { backgroundColor: chat.headerChipActive }
      : {},
    label: {
      ...typography.captionStrong,
      color: isHero ? chat.headerTextMuted : c.textMuted,
    },
    labelActive: {
      color: isHero ? chat.headerText : c.textPrimary,
    },
  })
}
