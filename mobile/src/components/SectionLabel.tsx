import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

/** Home-style uppercase section label, optional count + trailing action. */
export function SectionLabel({
  children,
  action,
  onAction,
  count,
  style,
}: {
  children: string
  action?: string
  onAction?: () => void
  count?: number | string
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const label = (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{children}</Text>
      {count != null && count !== '' ? (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  )

  if (action && onAction) {
    return (
      <View style={[styles.row, style]}>
        {label}
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      </View>
    )
  }

  return <View style={[styles.solo, style]}>{label}</View>
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      gap: spacing.md,
    },
    solo: { marginTop: spacing.sm },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
      minWidth: 0,
    },
    label: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    } satisfies TextStyle,
    countPill: {
      minWidth: 20,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
    },
    countText: {
      ...typography.micro,
      color: c.textSecondary,
      fontWeight: '700',
    },
    action: { ...typography.captionStrong, color: c.accentHover },
  })
}
