import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, shadows, spacing, typography } from '../constants/theme'

export function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'danger' | 'success' | 'warning'
}) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, tone !== 'default' && { color: toneColor[tone] }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  )
}

const toneColor = {
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    ...shadows.card,
  },
  value: { ...typography.h2, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary },
})
