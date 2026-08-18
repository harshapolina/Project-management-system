import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, shadows, spacing, typography } from '../constants/theme'

const ICON_TONES = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#0891B2', '#E11D48']

export function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

export function NavRow({
  icon,
  label,
  hint,
  onPress,
  tone = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  hint?: string
  onPress: () => void
  tone?: number
}) {
  const color = ICON_TONES[tone % ICON_TONES.length]
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[styles.iconWell, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: {
    ...typography.captionStrong,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  sectionBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textMuted },
})
