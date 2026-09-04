import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import { radius, spacing } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'

type CardPadding = 'none' | 'md' | 'lg'

type CardProps = ViewProps & {
  padding?: CardPadding
  onPress?: () => void
  /** @deprecated Use padding="md" */
  padded?: boolean
}

function paddingFor(padding: CardPadding, padded?: boolean): number {
  if (padding === 'none') return 0
  if (padding === 'lg') return spacing.lg
  if (padding === 'md') return spacing.md
  return padded === false ? 0 : spacing.lg
}

export function Card({ style, padding, padded, onPress, children, ...props }: CardProps) {
  const colors = useColors()
  const shadows = useShadows()
  const pad = paddingFor(padding ?? (padded === false ? 'none' : 'lg'), padded)
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: pad,
          width: '100%',
          overflow: 'hidden',
          ...shadows.card,
        },
      }),
    [colors, shadows, pad],
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] }, style as StyleProp<ViewStyle>]}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  )
}

/** @deprecated Use Card with padding="md" */
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
  return (
    <Card padding={padded ? 'md' : 'none'} onPress={onPress} style={style}>
      {children}
    </Card>
  )
}
