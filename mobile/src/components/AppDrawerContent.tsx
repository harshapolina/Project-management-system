import { useEffect, useMemo } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../utils/roles'
import { openTabScreen } from '../navigation/openProject'
import { Avatar } from './Avatar'

type DrawerLink = {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const colors = useColors()
  const shadows = useShadows()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const caps = capabilitiesForUser(user)
  const { navigation } = props
  const drawerStatus = useDrawerStatus()

  /**
   * Esc closes the drawer wherever there's a physical keyboard — web and
   * desktop-class browsers. Native Android already closes it on hardware
   * back via the navigator, so this only fills the keyboard gap. The listener
   * is bound only while the drawer is open, so it can't swallow Esc from
   * anything else.
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || drawerStatus !== 'open') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigation.closeDrawer()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerStatus, navigation])

  const goTab = (
    tab: keyof import('../navigation/types').RootTabParamList,
    screen?: string,
    params?: object,
  ) => {
    navigation.closeDrawer()
    openTabScreen(navigation, tab, screen, params)
  }

  const primary: DrawerLink[] = [
    {
      key: 'home',
      label: 'Home',
      icon: 'home-outline',
      onPress: () => goTab('Home'),
    },
    ...(caps.projects
      ? [
          {
            key: 'projects',
            label: 'Projects',
            icon: 'business-outline' as const,
            onPress: () => goTab('Projects'),
          },
        ]
      : []),
    {
      key: 'inbox',
      label: 'Chat',
      icon: 'chatbubbles-outline',
      onPress: () => goTab('Inbox'),
    },
    {
      key: 'more',
      label: 'More',
      icon: 'grid-outline',
      onPress: () => goTab('More'),
    },
  ]

  const tools: DrawerLink[] = [
    {
      key: 'notifications',
      label: 'Alerts',
      icon: 'notifications-outline',
      onPress: () => goTab('More', 'Notifications'),
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      onPress: () => goTab('More', 'ProfileHub'),
    },
    ...(caps.leads
      ? [
          {
            key: 'leads',
            label: 'New enquiries',
            icon: 'briefcase-outline' as const,
            onPress: () => goTab('More', 'Leads'),
          },
        ]
      : []),
    ...(caps.boq
      ? [
          {
            key: 'boq',
            label: 'BOQ / Quotes',
            icon: 'document-text-outline' as const,
            onPress: () => goTab('More', 'BoqList'),
          },
        ]
      : []),
    ...(caps.procurement
      ? [
          {
            key: 'vendors',
            label: 'Vendors',
            icon: 'business-outline' as const,
            onPress: () => goTab('More', 'Vendors'),
          },
          {
            key: 'pos',
            label: 'Purchase orders',
            icon: 'cart-outline' as const,
            onPress: () => goTab('More', 'PurchaseOrders'),
          },
        ]
      : []),
    ...(caps.finance
      ? [
          {
            key: 'finance',
            label: 'Revenue',
            icon: 'wallet-outline' as const,
            onPress: () => goTab('More', 'Finance'),
          },
          {
            key: 'billing',
            label: 'Billing',
            icon: 'receipt-outline' as const,
            onPress: () => goTab('More', 'Billing'),
          },
          {
            key: 'tax-invoices',
            label: 'Tax invoices',
            icon: 'document-text-outline' as const,
            onPress: () => goTab('More', 'TaxInvoices'),
          },
        ]
      : []),
    ...(caps.siteFeed
      ? [
          {
            key: 'site',
            label: 'Site updates',
            icon: 'camera-outline' as const,
            onPress: () => goTab('More', 'SiteFeed'),
          },
          {
            key: 'snags',
            label: 'Snags',
            icon: 'alert-circle-outline' as const,
            onPress: () => goTab('More', 'Snags'),
          },
        ]
      : []),
    ...(caps.portfolio
      ? [
          {
            key: 'portfolio',
            label: 'Portfolio',
            icon: 'grid-outline' as const,
            onPress: () => goTab('More', 'Portfolio'),
          },
        ]
      : []),
    ...(caps.reports
      ? [
          {
            key: 'reports',
            label: 'Reports',
            icon: 'bar-chart-outline' as const,
            onPress: () => goTab('More', 'Reports'),
          },
        ]
      : []),
    ...(caps.myWork
      ? [
          {
            key: 'live-board',
            label: 'Live board',
            icon: 'pulse-outline' as const,
            onPress: () => goTab('More', 'LiveBoard'),
          },
        ]
      : []),
    ...(caps.inventory
      ? [
          {
            key: 'inventory',
            label: 'Inventory',
            icon: 'cube-outline' as const,
            onPress: () => goTab('More', 'Inventory'),
          },
        ]
      : []),
    ...(caps.companyAdmin
      ? [
          {
            key: 'company',
            label: 'Company dashboard',
            icon: 'speedometer-outline' as const,
            onPress: () => goTab('More', 'CompanyAdminDashboard'),
          },
        ]
      : []),
    ...(caps.impact
      ? [
          {
            key: 'impact',
            label: 'Impact',
            icon: 'trophy-outline' as const,
            onPress: () => goTab('More', 'Impact'),
          },
        ]
      : []),
  ]

  return (
    <View style={styles.root}>
      {/*
        * Pinned rather than scrolled with the header: the tools list is long
        * enough to scroll the top out of view, and a close button you have to
        * scroll back up to find isn't a close button.
        */}
      <Pressable
        onPress={() => navigation.closeDrawer()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Close sidebar"
        style={({ pressed }) => [
          styles.closeBtn,
          { top: insets.top + spacing.sm },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="close" size={20} color={colors.textPrimary} />
      </Pressable>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
      >
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Cubic</Text>
        <Text style={styles.brandHint}>Studio workspace</Text>
      </View>

      <Pressable
        style={styles.profileCard}
        onPress={() => goTab('More', 'ProfileHub')}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <Avatar name={user?.name} uri={user?.avatar} size={44} />
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.name || 'Account'}
          </Text>
          <Text style={styles.profileMeta} numberOfLines={1}>
            {user?.email || 'Signed in'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.sectionLabel}>Navigate</Text>
      {primary.map((item) => (
        <DrawerRow key={item.key} item={item} colors={colors} styles={styles} />
      ))}

      <Text style={[styles.sectionLabel, styles.sectionSpacer]}>Tools</Text>
      {tools.map((item) => (
        <DrawerRow key={item.key} item={item} colors={colors} styles={styles} />
      ))}

      <Pressable
        style={styles.logout}
        onPress={() => {
          navigation.closeDrawer()
          logout()
        }}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>

        {/* Keep ScrollView happy on short drawers */}
        <View style={{ height: spacing.xxl }} />
      </DrawerContentScrollView>
    </View>
  )
}

function DrawerRow({
  item,
  colors,
  styles,
}: {
  item: DrawerLink
  colors: AppColors
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={item.icon} size={20} color={colors.textPrimary} />
      </View>
      <Text style={styles.rowLabel}>{item.label}</Text>
    </Pressable>
  )
}

function createStyles(c: AppColors, shadows: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    root: { flex: 1 },
    brandBlock: {
      paddingHorizontal: spacing.sm,
      // Clears the pinned close button floating in the top-right corner.
      paddingRight: 52,
      marginBottom: spacing.lg,
      gap: 2,
    },
    closeBtn: {
      position: 'absolute',
      right: spacing.lg,
      zIndex: 2,
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: {
      ...typography.h2,
      fontSize: 26,
      color: c.accentHover,
      letterSpacing: -0.5,
    },
    brandHint: {
      ...typography.caption,
      color: c.textSecondary,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.xl,
      ...shadows.card,
    },
    profileText: { flex: 1, minWidth: 0, gap: 2 },
    profileName: { ...typography.bodyStrong, color: c.textPrimary },
    profileMeta: { ...typography.caption, color: c.textSecondary },
    sectionLabel: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    sectionSpacer: { marginTop: spacing.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 12,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
    },
    rowPressed: { backgroundColor: c.accentSoft },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceRaised,
    },
    rowLabel: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    logoutText: { ...typography.bodyStrong, color: c.danger },
  })
}
