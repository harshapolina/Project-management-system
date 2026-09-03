import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useAuthStore } from '../store/authStore'
import type { TenantNotice as Notice } from '../types/models'

/**
 * Dismissal is per-device and per-message.
 *
 * Keyed on the notice's `updatedAt`, so re-wording it brings it back for
 * everyone who waved the previous one away — otherwise a chased customer
 * dismisses once and never sees the follow-up.
 */
const dismissKey = (stamp?: string | null) => `cubic-notice-dismissed:${stamp || 'none'}`

function iconFor(notice: Notice): keyof typeof Ionicons.glyphMap {
  if (notice.blocking) return 'lock-closed'
  return notice.variant === 'info' ? 'information-circle' : 'warning'
}

function toneFor(notice: Notice, c: AppColors) {
  if (notice.variant === 'urgent') return c.danger
  if (notice.variant === 'warning') return c.warning
  return c.textSecondary
}

/**
 * The banner form: sits above the tab content and can usually be dismissed.
 * The blocking form lives in `TenantLockScreen`, because it replaces the app
 * rather than sitting on top of it.
 */
export function TenantNoticeBanner() {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const tenant = useAuthStore((s) => s.tenant)
  const notice = tenant?.notice
  const stamp = notice?.updatedAt || 'none'
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(dismissKey(stamp))
      .then((v) => alive && setDismissed(v === '1'))
      .catch(() => alive && setDismissed(false))
    return () => {
      alive = false
    }
  }, [stamp])

  if (!notice || notice.blocking) return null
  if (!notice.title && !notice.message) return null
  if (dismissed) return null

  const tone = toneFor(notice, colors)

  return (
    <View style={[styles.bar, { borderLeftColor: tone }]}>
      <Ionicons name={iconFor(notice)} size={16} color={tone} style={styles.barIcon} />
      <View style={styles.barText}>
        {!!notice.title && <Text style={styles.title}>{notice.title}</Text>}
        {!!notice.message && <Text style={styles.message}>{notice.message}</Text>}
      </View>
      {notice.dismissible && (
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => {
            // Best effort — if storage fails it simply reappears next launch.
            AsyncStorage.setItem(dismissKey(stamp), '1').catch(() => {})
            setDismissed(true)
          }}
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  )
}

/**
 * The payment wall. Replaces the entire app: they can sign in and read why,
 * but nothing else is reachable until the platform owner lifts it.
 */
export function TenantLockScreen() {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const tenant = useAuthStore((s) => s.tenant)
  const logout = useAuthStore((s) => s.logout)
  const notice = tenant?.notice

  return (
    <View style={[styles.lockRoot, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.lockCard}>
        <View style={styles.lockWell}>
          <Ionicons name="lock-closed" size={22} color={colors.danger} />
        </View>
        <Text style={styles.lockTitle}>
          {notice?.title || 'This workspace is on hold'}
        </Text>
        {!!notice?.message && <Text style={styles.lockMessage}>{notice.message}</Text>}
        <Text style={styles.lockFoot}>
          Access returns as soon as this is lifted. Contact your account manager if
          you believe this is a mistake.
        </Text>
      </View>

      {/* Signing out is the one action left, so a shared device isn't stranded. */}
      <Pressable onPress={logout} hitSlop={8} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderLeftWidth: 3,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    barIcon: { marginTop: 1 },
    barText: { flex: 1, minWidth: 0, gap: 2 },
    title: { ...typography.captionStrong, color: c.textPrimary },
    message: { ...typography.caption, color: c.textSecondary, lineHeight: 18 },

    lockRoot: {
      flex: 1,
      backgroundColor: c.canvas,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    lockCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    lockWell: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: `${c.danger}1f`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    lockTitle: {
      ...typography.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    lockMessage: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    lockFoot: {
      ...typography.micro,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 16,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      width: '100%',
    },
    signOut: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    signOutText: { ...typography.captionStrong, color: c.textSecondary },
  })
}
