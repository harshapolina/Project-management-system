import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

/**
 * Home-aligned page chrome: large title + status subtitle.
 * Nested screens pass `onBack` for a top action row (back + optional right).
 * Tab roots pass `right` beside the title.
 */
export function PageHeader({
  title,
  subtitle,
  subtitleIcon,
  right,
  onBack,
  backLabel = 'Back',
  compact = false,
}: {
  title: ReactNode
  subtitle?: string
  subtitleIcon?: keyof typeof Ionicons.glyphMap
  right?: ReactNode
  onBack?: () => void
  backLabel?: string
  /** Chat-style: name sits in the back row instead of a large page title. */
  compact?: boolean
}) {
  const colors = useColors()
  const { pagePadding, titleSize, isCompact } = useResponsive()
  const styles = useMemo(
    () => createStyles(colors, pagePadding, titleSize, isCompact),
    [colors, pagePadding, titleSize, isCompact],
  )
  const useCompactBar = compact && !!onBack

  return (
    <View style={styles.wrap}>
      {onBack ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            style={styles.topIconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          {useCompactBar ? (
            typeof title === 'string' ? (
              <Text style={styles.topTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <View style={styles.topTitleWrap}>{title}</View>
            )
          ) : (
            <View style={styles.topSpacer} />
          )}
          {right ? <View style={styles.rightSlot}>{right}</View> : <View style={styles.topIconBtn} />}
        </View>
      ) : null}

      {useCompactBar ? (
        subtitle ? (
          <Text style={styles.compactSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null
      ) : (
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            {typeof title === 'string' ? (
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            ) : (
              <View style={{ flex: 1 }}>{title}</View>
            )}
            {!onBack && right ? <View style={styles.rightSlot}>{right}</View> : null}
          </View>
          {subtitle ? (
            <View style={styles.statusRow}>
              {subtitleIcon ? (
                <Ionicons name={subtitleIcon} size={15} color={colors.accentHover} />
              ) : null}
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}

function createStyles(c: AppColors, pagePadding: number, titleSize: number, isCompact: boolean) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: pagePadding,
      paddingTop: spacing.xs,
      paddingBottom: isCompact ? spacing.xs : spacing.sm,
      gap: spacing.xs,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 38,
      marginBottom: 2,
    },
    topIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topSpacer: { flex: 1 },
    topTitle: {
      ...typography.h3,
      fontSize: 17,
      color: c.textPrimary,
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
    },
    topTitleWrap: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightSlot: { flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center' },
    titleBlock: { gap: 4, paddingHorizontal: 2 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    title: {
      ...typography.h1,
      fontSize: Math.min(titleSize, 28),
      color: c.textPrimary,
      fontWeight: '700',
      letterSpacing: -0.5,
      flex: 1,
      minWidth: 0,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 1,
    },
    subtitle: {
      ...typography.caption,
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
    },
    compactSubtitle: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: -4,
    },
  })
}
