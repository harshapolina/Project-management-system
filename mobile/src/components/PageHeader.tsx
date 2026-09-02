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
}: {
  title: ReactNode
  subtitle?: string
  subtitleIcon?: keyof typeof Ionicons.glyphMap
  right?: ReactNode
  onBack?: () => void
  backLabel?: string
}) {
  const colors = useColors()
  const { pagePadding, titleSize, isCompact } = useResponsive()
  const styles = useMemo(
    () => createStyles(colors, pagePadding, titleSize, isCompact),
    [colors, pagePadding, titleSize, isCompact],
  )

  return (
    <View style={styles.wrap}>
      {onBack ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            style={styles.topIconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          {typeof title === 'string' ? (
            <Text style={styles.topTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View style={styles.topTitleWrap}>{title}</View>
          )}
          {right ? <View style={styles.rightSlot}>{right}</View> : <View style={styles.topIconBtn} />}
        </View>
      ) : null}

      <View style={styles.titleBlock}>
        {!onBack && right ? (
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
              {title}
            </Text>
            <View style={styles.rightSlot}>{right}</View>
          </View>
        ) : !onBack ? (
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <View style={styles.statusRow}>
            {subtitleIcon ? (
              <Ionicons name={subtitleIcon} size={16} color={colors.accentHover} />
            ) : null}
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function createStyles(c: AppColors, pagePadding: number, titleSize: number, isCompact: boolean) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: pagePadding,
      paddingTop: spacing.xs,
      paddingBottom: isCompact ? spacing.sm : spacing.md,
      gap: spacing.sm,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 40,
    },
    topIconBtn: {
      width: 40,
      height: 40,
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
    titleBlock: { gap: 6 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    title: {
      ...typography.h1,
      fontSize: titleSize,
      color: c.textPrimary,
      letterSpacing: -0.6,
      flex: 1,
      minWidth: 0,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: -2,
    },
    subtitle: { ...typography.caption, color: c.textSecondary, flex: 1 },
  })
}
