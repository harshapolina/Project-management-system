import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { glyphs, type Glyph } from '../icons'
import { Icon } from './Icon'
import { IconWell, type IconTone } from './IconWell'

const TONE_BY_INDEX: IconTone[] = ['accent', 'success', 'warning', 'accent', 'muted', 'danger']

export function NavSection({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors()
  const shadows = useShadows()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])

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
  last = false,
}: {
  icon: Glyph
  label: string
  hint?: string
  onPress: () => void
  tone?: number
  /** Hide bottom hairline (last row in a section). */
  last?: boolean
}) {
  const colors = useColors()
  const shadows = useShadows()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])
  const iconTone = TONE_BY_INDEX[tone % TONE_BY_INDEX.length]

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        last && styles.rowLast,
        pressed && { backgroundColor: colors.surfaceRaised, transform: [{ scale: 0.99 }] },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <IconWell name={icon} tone={iconTone} size={18} well={36} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Icon name={glyphs.chevronForward} size="inline" color={colors.textMuted} decorative />
    </Pressable>
  )
}

function createStyles(c: AppColors, shadows: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    section: { gap: 10 },
    sectionTitle: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 4,
    },
    sectionBody: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
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
      borderBottomColor: c.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    label: { ...typography.bodyStrong, color: c.textPrimary },
    hint: { ...typography.caption, color: c.textMuted },
  })
}
