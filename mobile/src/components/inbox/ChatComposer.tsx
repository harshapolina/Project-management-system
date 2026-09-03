import { useMemo } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { radius, spacing, typography, type AppColors, type ChatColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useChatColors } from '../../theme/useChatColors'
import { useResponsive } from '../../theme/useResponsive'
import { TAB_BAR_CLEARANCE } from '../GlassyTabBar'
import { isKeyboardOpen, useKeyboardInset } from '../../hooks/useKeyboardInset'

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  sending,
  placeholder = 'Message…',
  bottomInset,
}: {
  value: string
  onChangeText: (t: string) => void
  onSend: () => void
  sending?: boolean
  placeholder?: string
  bottomInset?: number
}) {
  const colors = useColors()
  const chat = useChatColors()
  const insets = useSafeAreaInsets()
  const { pagePadding } = useResponsive()
  const keyboardInset = useKeyboardInset()
  const keyboardOpen = isKeyboardOpen(keyboardInset)
  const styles = useMemo(() => createStyles(colors, chat, pagePadding), [colors, chat, pagePadding])

  const canSend = value.trim().length > 0 && !sending
  const padBottom =
    bottomInset ??
    (keyboardOpen ? Math.max(insets.bottom, spacing.sm) : TAB_BAR_CLEARANCE)

  return (
    <View style={[styles.wrap, { paddingBottom: padBottom }]}>
      <View style={[styles.inputShell, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary }]}
          multiline
          maxLength={4000}
          blurOnSubmit={false}
          returnKeyType="default"
          onSubmitEditing={() => {
            if (canSend) onSend()
          }}
        />
      </View>
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={({ pressed }) => [
          styles.send,
          { backgroundColor: canSend ? colors.accent : colors.surfaceRaised },
          pressed && canSend && { opacity: 0.88, transform: [{ scale: 0.96 }] },
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.textOnAccent} />
        ) : (
          <Ionicons
            name="arrow-up"
            size={22}
            color={canSend ? colors.textOnAccent : colors.textMuted}
          />
        )}
      </Pressable>
    </View>
  )
}

function createStyles(c: AppColors, chat: ChatColors, pagePadding: number) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: pagePadding,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: chat.listBg,
    },
    inputShell: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
      minHeight: 44,
      maxHeight: 120,
      justifyContent: 'center',
    },
    input: {
      ...typography.body,
      /**
       * Mobile browsers zoom into an input whose text is under 16px, which
       * throws the whole layout off when the keyboard opens. Native has no such
       * behaviour, so the bump is web-only and the app's type scale is
       * unchanged on device.
       */
      ...(Platform.OS === 'web' ? { fontSize: 16 } : null),
      lineHeight: 20,
      maxHeight: 96,
      paddingTop: 0,
      paddingBottom: 0,
    },
    send: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
}
