import { forwardRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { colors, radius, spacing, typography } from '../constants/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  /** Style for the outer wrapper (label + input + error). Use this — not
   * `style` — to size the field within a row layout (e.g. `{ flex: 1 }`
   * next to a Send button); `style` only reaches the inner TextInput. */
  containerStyle?: StyleProp<ViewStyle>
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, containerStyle, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false)

    return (
      <View style={[styles.wrap, containerStyle]}>
        {label ? (
          <Text style={styles.label} numberOfLines={2}>
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
  // alignSelf: 'stretch', not width: '100%' — in a column layout (every
  // form on this app) they're equivalent, but width:'100%' also overflows
  // a row layout (e.g. the comment composer next to its Send button)
  // because it's resolved against the parent's full width regardless of
  // siblings. `containerStyle={{ flex: 1 }}` is how callers opt into a row.
  wrap: { gap: 6, alignSelf: 'stretch' },
  label: { ...typography.captionStrong, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  inputFocused: { borderColor: colors.accent, borderWidth: 1.5 },
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
})
