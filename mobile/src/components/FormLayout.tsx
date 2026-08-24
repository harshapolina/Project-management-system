import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen } from './Screen'
import { AppNavBar } from './AppNavBar'
import { PageHeader } from './PageHeader'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

type FormLayoutProps = {
  title: string
  subtitle?: string
  subtitleIcon?: keyof typeof Ionicons.glyphMap
  onBack: () => void
  children: ReactNode
  /** Sticky footer (primary button). */
  footer?: ReactNode
  /** Wrap fields in a surface card (default true). */
  card?: boolean
  /**
   * `sheet` — create popup chrome (title + close).
   * `page` — full-screen page header (edit profile, etc.).
   */
  variant?: 'sheet' | 'page'
}

/**
 * Create/edit chrome. Sheet variant is for modal form-sheet popups.
 */
export function FormLayout({
  title,
  subtitle,
  subtitleIcon,
  onBack,
  children,
  footer,
  card = true,
  variant = 'sheet',
}: FormLayoutProps) {
  const colors = useColors()
  const shadows = useShadows()
  const insets = useSafeAreaInsets()
  const { pagePadding } = useResponsive()
  const styles = useMemo(
    () => createStyles(colors, shadows, pagePadding),
    [colors, shadows, pagePadding],
  )
  const isSheet = variant === 'sheet'
  const footerPad = Math.max(insets.bottom, 12) + spacing.md

  return (
    <Screen
      padded={false}
      edges={['left', 'right']}
      keyboardAvoiding
      background={colors.canvas}
    >
      {isSheet ? (
        <View style={styles.sheetChrome}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitles}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <View style={styles.sheetSubtitleRow}>
                  {subtitleIcon ? (
                    <Ionicons name={subtitleIcon} size={14} color={colors.accentHover} />
                  ) : null}
                  <Text style={styles.sheetSubtitle} numberOfLines={2}>
                    {subtitle}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <AppNavBar />
          <PageHeader title={title} subtitle={subtitle} subtitleIcon={subtitleIcon} onBack={onBack} />
        </>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, !footer && { paddingBottom: footerPad + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {card ? <View style={styles.card}>{children}</View> : children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: footerPad }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Screen>
  )
}

function createStyles(
  c: AppColors,
  sh: ReturnType<typeof useShadows>,
  pagePadding: number,
) {
  return StyleSheet.create({
    flex: { flex: 1 },
    sheetChrome: {
      paddingHorizontal: pagePadding,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      backgroundColor: c.canvas,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    sheetTitles: {
      flex: 1,
      minWidth: 0,
      gap: 4,
      paddingTop: 2,
    },
    sheetTitle: {
      ...typography.h2,
      fontSize: 22,
      color: c.textPrimary,
      letterSpacing: -0.4,
    },
    sheetSubtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sheetSubtitle: {
      ...typography.caption,
      color: c.textSecondary,
      flex: 1,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      paddingHorizontal: pagePadding,
      paddingBottom: spacing.lg,
      gap: spacing.md,
      flexGrow: 1,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: spacing.md,
      ...sh.card,
    },
    footer: {
      paddingHorizontal: pagePadding,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.canvas,
      gap: spacing.sm,
    },
  })
}
