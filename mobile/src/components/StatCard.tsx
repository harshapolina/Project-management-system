import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'
import type { Glyph } from '../icons'
import { Icon } from './Icon'

export function StatCard({
  label,
  value,
  tone = 'default',
  icon,
  onPress,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'danger' | 'success' | 'warning'
  icon?: Glyph
  onPress?: () => void
}) {
  const colors = useColors()
  const shadows = useShadows()
  const { statsColumns, isCompact } = useResponsive()
  const styles = useMemo(
    () => createStyles(colors, shadows, statsColumns, isCompact),
    [colors, shadows, statsColumns, isCompact],
  )
  const toneColor = {
    default: colors.accentHover,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
  }[tone]
  const toneSoft = {
    default: colors.accentSoft,
    danger: colors.dangerSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
  }[tone]

  const body = (
    <>
      {icon ? (
        <View style={[styles.iconWell, { backgroundColor: toneSoft }]}>
          <Icon name={icon} size="inline" color={toneColor} decorative />
        </View>
      ) : null}
      <Text
        style={[styles.value, tone !== 'default' && { color: toneColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        {body}
      </Pressable>
    )
  }

  return <View style={styles.card}>{body}</View>
}

function createStyles(
  c: AppColors,
  shadows: ReturnType<typeof useShadows>,
  statsColumns: number,
  isCompact: boolean,
) {
  const basis = statsColumns === 1 ? '100%' : '46%'
  return StyleSheet.create({
    card: {
      flexGrow: 1,
      flexBasis: basis,
      minWidth: statsColumns === 1 ? '100%' : '42%',
      maxWidth: statsColumns === 1 ? '100%' : '100%',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      padding: isCompact ? spacing.sm : spacing.md,
      gap: 6,
      ...shadows.card,
    },
    iconWell: {
      width: 28,
      height: 28,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    value: { ...typography.h2, fontSize: isCompact ? 20 : 22, color: c.textPrimary },
    label: { ...typography.caption, color: c.textSecondary },
  })
}
