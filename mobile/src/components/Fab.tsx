import { useMemo } from 'react'
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { radius, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { TAB_BAR_CLEARANCE } from './GlassyTabBar'

type FabProps = {
  icon?: keyof typeof Ionicons.glyphMap
  onPress: () => void
  label: string
  disabled?: boolean
  /** When false, sit above the home indicator only (no tab dock). Default true. */
  aboveTabBar?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Themed floating action button. Clears the glassy tab bar and safe area
 * so it stays tappable on small phones (SE) through large devices.
 */
export function Fab({
  icon = 'add-outline',
  onPress,
  label,
  disabled,
  aboveTabBar = true,
  style,
}: FabProps) {
  const colors = useColors()
  const shadows = useShadows()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])
  const bottom = aboveTabBar
    ? Math.max(TAB_BAR_CLEARANCE - 10, insets.bottom + 72)
    : Math.max(insets.bottom, 16) + 16

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.fab,
        { bottom, right: Math.max(insets.right, 16) },
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.96 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.textOnAccent} />
    </Pressable>
  )
}

function createStyles(c: AppColors, shadows: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      ...shadows.floating,
    },
  })
}
