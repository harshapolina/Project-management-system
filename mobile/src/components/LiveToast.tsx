import { useEffect, useMemo, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useToastStore } from '../store/toastStore'

const AUTO_DISMISS_MS = 4500

export function LiveToastHost() {
  const colors = useColors()
  const shadows = useShadows()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])
  const current = useToastStore((s) => s.current)
  const dismiss = useToastStore((s) => s.dismiss)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-12)).current

  useEffect(() => {
    if (!current) return undefined
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 160, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) dismiss()
      })
    }, AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [current, dismiss, opacity, translateY])

  if (!current) return null

  const icon =
    current.type === 'mail'
      ? 'mail-outline'
      : current.type === 'mention'
        ? 'at-outline'
        : 'notifications-outline'

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={colors.accentHover} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {current.title}
            </Text>
            {current.body ? (
              <Text style={styles.body} numberOfLines={2}>
                {current.body}
              </Text>
            ) : null}
          </View>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  )
}

function createStyles(c: AppColors, sh: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    host: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      zIndex: 9999,
      elevation: 20,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      ...sh.card,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    title: { ...typography.captionStrong, color: c.textPrimary },
    body: { ...typography.caption, color: c.textSecondary },
  })
}
