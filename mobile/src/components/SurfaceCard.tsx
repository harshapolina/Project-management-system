import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, spacing, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'

/**
 * Home-style list/surface row card used across directories and feeds.
 */
export function SurfaceCard({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  padded?: boolean
}) {
  const colors = useColors()
  const shadows = useShadows()
  const styles = useMemo(() => createStyles(colors, shadows, padded), [colors, shadows, padded])

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }, style]}
      >
        {children}
      </Pressable>
    )
  }

  return <View style={[styles.card, style]}>{children}</View>
}

function createStyles(c: AppColors, sh: ReturnType<typeof useShadows>, padded: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: padded ? spacing.md : 0,
      overflow: 'hidden',
      ...sh.card,
    },
  })
}
