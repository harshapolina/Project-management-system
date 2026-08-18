import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../constants/theme'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.text}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: {
    ...typography.micro,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { ...typography.h1, fontSize: 28, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  right: { paddingTop: 4 },
})
