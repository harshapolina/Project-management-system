import { forwardRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { colors, radius, spacing, typography } from '../constants/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  containerStyle?: StyleProp<ViewStyle>
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, containerStyle, onFocus, onBlur, ...props }, ref) => {
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

const styles = StyleSheet.create({
  wrap: { gap: 6, alignSelf: 'stretch' },
  label: { ...typography.captionStrong, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 50,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
})
