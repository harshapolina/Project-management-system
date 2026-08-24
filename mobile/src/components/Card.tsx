import { useMemo } from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'
import { radius, spacing } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'

export function Card({ style, ...props }: ViewProps) {
  const colors = useColors()
  const shadows = useShadows()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          width: '100%',
          ...shadows.card,
        },
      }),
    [colors, shadows],
  )
  return <View style={[styles.card, style]} {...props} />
}
