import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '../constants/theme'
import { Button } from './Button'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  )
}

export function EmptyState({
  title,
  body,
  action,
  onAction,
  icon = 'file-tray-outline',
}: {
  title: string
  body?: string
  action?: string
  onAction?: () => void
  icon?: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconWell}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {body ? (
        <Text style={styles.muted} numberOfLines={4}>
          {body}
        </Text>
      ) : null}
      {action && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={action} variant="secondary" size="sm" onPress={onAction} />
        </View>
      ) : null}
    </View>
  )
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconWell, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="alert-circle-outline" size={26} color={colors.danger} />
      </View>
      <Text style={styles.title}>Couldn’t load this</Text>
      <Text style={styles.muted} numberOfLines={4}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title="Try again" onPress={onRetry} size="sm" />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: 8,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  muted: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
})
