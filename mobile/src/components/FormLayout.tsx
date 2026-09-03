import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation, useRoute, type NavigationProp, type ParamListBase } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen } from './Screen'
import { PageHeader } from './PageHeader'
import { KeyboardAwareView } from './KeyboardAwareView'
import { TAB_BAR_CLEARANCE } from './GlassyTabBar'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'
import { isKeyboardOpen, useKeyboardInset } from '../hooks/useKeyboardInset'
import { smartGoBack } from '../navigation/openProject'

type FormLayoutProps = {
  title: string
  subtitle?: string
  subtitleIcon?: keyof typeof Ionicons.glyphMap
  /** Defaults to smartGoBack (stack root fallback). */
  onBack?: () => void
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
  /** Reserve space above the bottom tab bar (default true when a footer is shown). */
  tabBarClearance?: boolean
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
  tabBarClearance,
}: FormLayoutProps) {
  const navigation = useNavigation()
  const route = useRoute()
  const colors = useColors()
  const shadows = useShadows()
  const insets = useSafeAreaInsets()
  const keyboardInset = useKeyboardInset()
  const keyboardOpen = isKeyboardOpen(keyboardInset)
  const { pagePadding } = useResponsive()
  const handleBack = onBack ?? (() => smartGoBack(navigation as NavigationProp<ParamListBase>, route))
  const styles = useMemo(
    () => createStyles(colors, shadows, pagePadding),
    [colors, shadows, pagePadding],
  )
  const isSheet = variant === 'sheet'
  // Tab bar is absolute on every main tab screen — always lift footers above it.
  const reserveTabBar = tabBarClearance ?? !!footer
  const baseFooterPad =
    Math.max(insets.bottom, 12) +
    spacing.md +
    (reserveTabBar && !keyboardOpen ? TAB_BAR_CLEARANCE : 0)
  const footerPad = keyboardOpen
    ? Math.max(insets.bottom, spacing.sm)
    : baseFooterPad
  const scrollBottomPad = footer
    ? spacing.sm + (keyboardOpen ? keyboardInset : 0)
    : (keyboardOpen ? keyboardInset : 0) + footerPad + spacing.lg

  return (
    <Screen
      padded={false}
      edges={isSheet ? ['left', 'right'] : ['top', 'left', 'right']}
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
              onPress={handleBack}
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
        <PageHeader title={title} subtitle={subtitle} subtitleIcon={subtitleIcon} onBack={handleBack} />
      )}

      <KeyboardAwareView
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            !footer && styles.scrollFill,
            { paddingBottom: scrollBottomPad },
            keyboardOpen && styles.scrollWithKeyboard,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {card ? <View style={styles.card}>{children}</View> : children}
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { paddingBottom: footerPad }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAwareView>
    </Screen>
  )
}

function createStyles(
  c: AppColors,
  sh: ReturnType<typeof useShadows>,
  pagePadding: number,
) {
  return StyleSheet.create({
    flex: { flex: 1, minHeight: 0 },
    scrollView: { flex: 1, minHeight: 0 },
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
      gap: spacing.md,
    },
    scrollFill: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    scrollWithKeyboard: {
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
      flexShrink: 0,
      paddingHorizontal: pagePadding,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.canvas,
      gap: spacing.sm,
      zIndex: 2,
      elevation: 4,
    },
  })
}
