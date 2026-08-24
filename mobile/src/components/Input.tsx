import { forwardRef, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  containerStyle?: StyleProp<ViewStyle>
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, containerStyle, onFocus, onBlur, ...props }, ref) => {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const [focused, setFocused] = useState(false)

    return (
      <View style={[styles.wrap, containerStyle]}>
        {label ? (
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            focused && styles.inputFocused,
            !!error && styles.inputError,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          allowFontScaling
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...props}
        />
        {error ? (
          <Text style={styles.error} numberOfLines={3}>
            {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint} numberOfLines={3}>
            {hint}
          </Text>
        ) : null}
      </View>
    )
  },
)
Input.displayName = 'Input'

function createStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 6, alignSelf: 'stretch' },
    label: { ...typography.captionStrong, color: c.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 13,
      fontSize: 16,
      color: c.textPrimary,
      backgroundColor: c.surface,
      minHeight: 50,
    },
    inputFocused: { borderColor: c.accent, backgroundColor: c.accentSoft },
    inputError: { borderColor: c.danger, backgroundColor: c.dangerSoft },
    error: { ...typography.caption, color: c.danger },
    hint: { ...typography.caption, color: c.textMuted },
  })
}
