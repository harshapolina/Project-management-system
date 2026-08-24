import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  /** When false, parent owns horizontal padding. */
  inset = true,
  style,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
  inset?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding, inset), [colors, pagePadding, inset])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // RN Web defaults ScrollView to flexGrow:1, which stretches chips into tall columns.
      style={styles.scroll}
      contentContainerStyle={[styles.row, style]}
    >
      {options.map((opt) => {
        const active = opt.key === value
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function createStyles(c: AppColors, pagePadding: number, inset: boolean) {
  return StyleSheet.create({
    scroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: inset ? pagePadding : 0,
      gap: 8,
      paddingBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    chipActive: {
      backgroundColor: c.textPrimary,
      borderColor: c.textPrimary,
    },
    label: { ...typography.captionStrong, color: c.textSecondary },
    labelActive: { color: c.canvas },
  })
}
