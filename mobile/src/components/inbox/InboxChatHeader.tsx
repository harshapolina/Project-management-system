import { useMemo } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { radius, spacing, typography, type ChatColors } from '../../constants/theme'
import { useChatColors } from '../../theme/useChatColors'
import { useResponsive } from '../../theme/useResponsive'
import { Avatar } from '../Avatar'
import { InboxTabs, type InboxTab } from './InboxTabs'

export type ChatContact = {
  id: string
  name: string
  avatar?: string
  unread?: number
}

type InboxChatHeaderProps = {
  title: string
  tab: InboxTab
  onTabChange: (tab: InboxTab) => void
  contacts?: ChatContact[]
  onAddContact?: () => void
  onContactPress?: (contact: ChatContact) => void
  onMenuPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function InboxChatHeader({
  title,
  tab,
  onTabChange,
  contacts = [],
  onAddContact,
  onContactPress,
  onMenuPress,
  style,
}: InboxChatHeaderProps) {
  const chat = useChatColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(chat, pagePadding), [chat, pagePadding])
  const showContacts = tab === 'mail'

  return (
    <View style={[styles.shell, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="inboxChatGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={chat.headerFrom} />
              <Stop offset="1" stopColor={chat.headerTo} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#inboxChatGrad)" />
        </Svg>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.hero}>{title}</Text>
        <View style={styles.titleActions}>
          {showContacts && onAddContact ? (
            <Pressable
              onPress={onAddContact}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="New message"
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="create-outline" size={22} color={chat.headerText} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onMenuPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Chat options"
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={chat.headerText} />
          </Pressable>
        </View>
      </View>

      <InboxTabs value={tab} onChange={onTabChange} variant="hero" />

      {showContacts ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contactsRow}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={onAddContact}
            style={({ pressed }) => [styles.contactItem, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="New message"
          >
            <View style={styles.addCircle}>
              <Ionicons name="add" size={24} color={chat.headerText} />
            </View>
            <Text style={styles.contactName}>New</Text>
          </Pressable>
          {contacts.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onContactPress?.(c)}
              style={({ pressed }) => [styles.contactItem, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <View style={styles.avatarRing}>
                <Avatar name={c.name} uri={c.avatar} size={48} />
                {(c.unread ?? 0) > 0 ? <View style={styles.onlineDot} /> : null}
              </View>
              <Text style={styles.contactName} numberOfLines={1}>
                {c.name.split(' ')[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  )
}

function createStyles(chat: ChatColors, pagePadding: number) {
  return StyleSheet.create({
    shell: {
      flexShrink: 0,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
      overflow: 'hidden',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: pagePadding,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    titleActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 0,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: chat.headerChipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      ...typography.h2,
      fontSize: 24,
      lineHeight: 30,
      color: chat.headerText,
      flex: 1,
    },
    contactsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingHorizontal: pagePadding,
      paddingTop: spacing.md,
    },
    contactItem: {
      alignItems: 'center',
      width: 64,
      gap: 6,
    },
    addCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: chat.headerChipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
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
      borderColor: chat.headerTo,
    },
    contactName: {
      ...typography.micro,
      fontWeight: '500',
      letterSpacing: 0,
      color: chat.headerTextMuted,
      textAlign: 'center',
      width: '100%',
    },
  })
}
