import { useMemo, useState } from 'react'
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'
import { glyphs } from '../icons'
import { Icon } from './Icon'

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  /** When false, parent owns horizontal padding (default true for tab roots). */
  inset = true,
  style,
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  inset?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding, inset), [colors, pagePadding, inset])
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.wrap, focused && { borderColor: colors.accent }, style]}>
      <Icon name={glyphs.search} size="search" color={colors.textMuted} decorative />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  )
}

function createStyles(c: AppColors, pagePadding: number, inset: boolean) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: inset ? pagePadding : 0,
      marginBottom: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      minHeight: 46,
    },
    input: {
      ...typography.body,
      color: c.textPrimary,
      flex: 1,
      paddingVertical: spacing.sm,
      minWidth: 0,
    },
  })
}
