import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  icon,
  ...pressableProps
}: ButtonProps) {
  const colors = useColors()
  const themed = useMemo(() => createThemed(colors), [colors])
  const isDisabled = disabled || loading
  const spinnerColor =
    variant === 'secondary' || variant === 'ghost' ? colors.accent : colors.textOnAccent

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        themed.variant[variant],
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        isDisabled && { opacity: 0.45 },
      ]}
      disabled={isDisabled}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[styles.label, size === 'sm' && { fontSize: 13 }, themed.label[variant]]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

function createThemed(c: AppColors) {
  return {
    variant: {
      primary: { backgroundColor: c.accent },
      secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
      ghost: { backgroundColor: 'transparent' },
      danger: { backgroundColor: c.danger },
    } as Record<Variant, object>,
    label: {
      primary: { color: c.textOnAccent },
      secondary: { color: c.textPrimary },
      ghost: { color: c.accent },
      danger: { color: c.textOnDanger },
    } as Record<Variant, object>,
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  md: { paddingVertical: 14, paddingHorizontal: spacing.lg },
  sm: { paddingVertical: 9, paddingHorizontal: spacing.md, minHeight: 38 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...typography.bodyStrong },
})
