import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { radius, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { outlineName } from './IconWell'

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'accent',
  badge = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  label: string
  tone?: 'accent' | 'muted' | 'ghost'
  badge?: number
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const glyph = tone === 'accent' ? icon : outlineName(icon)
  const iconColor =
    tone === 'accent' ? colors.textOnAccent : tone === 'ghost' ? colors.textPrimary : colors.textPrimary

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        tone === 'muted' && styles.muted,
        tone === 'ghost' && styles.ghost,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons name={glyph} size={tone === 'ghost' ? 22 : 20} color={iconColor} />
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    btn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    muted: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    /**
     * Header action chip. `ghost` is the tone every page header uses for its
     * trailing action, so it's matched to PageHeader's back button — same 42dp
     * circle, surface fill and hairline border — and the two sit on the same
     * row looking like a pair rather than one button and one bare glyph.
     */
    ghost: {
      width: 42,
      height: 42,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: { color: c.textOnDanger, fontSize: 9, fontWeight: '800' },
  })
}
