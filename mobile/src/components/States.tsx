import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { Button } from './Button'
import { IconWell } from './IconWell'
import { SkeletonScreen, type SkeletonVariant } from './Skeleton'

export type { SkeletonVariant }

/** In-place UI skeleton — replaces spinner loaders. */
export function LoadingState({
  variant = 'list',
  label,
}: {
  /** Kept for a11y / call-site compatibility; not shown as spinner text. */
  label?: string
  variant?: SkeletonVariant
}) {
  return (
    <View style={styles.fill} accessibilityLabel={label || 'Loading'} accessibilityRole="progressbar">
      <SkeletonScreen variant={variant} />
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
  const colors = useColors()
  const stylesLocal = useMemo(() => createStyles(colors), [colors])
  return (
    <View style={stylesLocal.center}>
      <View style={{ marginBottom: 6 }}>
        <IconWell name={icon} tone="accent" size={26} well={56} />
      </View>
      <Text style={stylesLocal.title} numberOfLines={2}>
        {title}
      </Text>
      {body ? (
        <Text style={stylesLocal.muted} numberOfLines={4}>
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
  const colors = useColors()
  const stylesLocal = useMemo(() => createStyles(colors), [colors])
  return (
    <View style={stylesLocal.center}>
      <IconWell name="alert-circle-outline" tone="danger" size={26} well={56} />
      <Text style={stylesLocal.title}>Couldn’t load this</Text>
      <Text style={stylesLocal.muted} numberOfLines={4}>
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

function createStyles(c: AppColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      gap: 8,
    },
    title: { ...typography.h3, color: c.textPrimary, textAlign: 'center' },
    muted: { ...typography.body, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
  })
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
})
