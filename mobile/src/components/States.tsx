import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../constants/theme'
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
}: {
  title: string
  body?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.center}>
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
      <Text style={styles.errorTitle}>Couldn&apos;t load this</Text>
      <Text style={styles.muted} numberOfLines={4}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title="Retry" onPress={onRetry} size="sm" />
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
    gap: 6,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  errorTitle: { ...typography.h3, color: colors.danger, textAlign: 'center' },
  muted: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
})
