import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Screen } from './Screen'
import { KeyboardAwareView } from './KeyboardAwareView'
import { isKeyboardOpen, useKeyboardInset } from '../hooks/useKeyboardInset'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  /** Optional brand mark above the title (login). */
  brand?: ReactNode
}

/**
 * Shared chrome for sign-in / onboarding / password gates.
 * Matches FormLayout card language so auth feels like the rest of the app.
 */
export function AuthLayout({ title, subtitle, children, footer, brand }: AuthLayoutProps) {
  const colors = useColors()
  const shadows = useShadows()
  const keyboardInset = useKeyboardInset()
  const keyboardOpen = isKeyboardOpen(keyboardInset)
  const { pagePadding } = useResponsive()
  const styles = useMemo(
    () => createStyles(colors, shadows, pagePadding),
    [colors, shadows, pagePadding],
  )

  return (
    <Screen padded={false} edges={['top', 'left', 'right', 'bottom']} background={colors.canvas}>
      <KeyboardAwareView style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            keyboardOpen && styles.scrollWithKeyboard,
            { paddingBottom: Math.max(keyboardInset, spacing.xl) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {brand}
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.fields}>{children}</View>
            {footer}
          </View>
        </ScrollView>
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
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: pagePadding,
      paddingVertical: spacing.xl,
      gap: spacing.lg,
    },
    scrollWithKeyboard: {
      justifyContent: 'flex-start',
      paddingTop: spacing.lg,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: spacing.md,
      width: '100%',
      ...sh.card,
    },
    title: {
      ...typography.h2,
      fontSize: 22,
      color: c.textPrimary,
      letterSpacing: -0.4,
    },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: -4,
    },
    fields: { gap: spacing.md },
  })
}
