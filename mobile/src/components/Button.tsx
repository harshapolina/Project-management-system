import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import { colors, radius, spacing, typography } from '../constants/theme'

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
  const isDisabled = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        variantStyles[variant],
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        isDisabled && { opacity: 0.45 },
      ]}
      disabled={isDisabled}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.accent : '#fff'} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[styles.label, size === 'sm' && { fontSize: 13 }, labelColor[variant]]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  md: { paddingVertical: 14, paddingHorizontal: spacing.lg },
  sm: { paddingVertical: 9, paddingHorizontal: spacing.md, minHeight: 38 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...typography.bodyStrong },
})

const variantStyles: Record<Variant, object> = {
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
}

const labelColor: Record<Variant, object> = {
  primary: { color: '#ffffff' },
  secondary: { color: colors.textPrimary },
  ghost: { color: colors.accent },
  danger: { color: '#ffffff' },
}
