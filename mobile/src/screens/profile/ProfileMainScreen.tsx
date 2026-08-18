import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { PageHeader } from '../../components/PageHeader'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { colors, radius, shadows, spacing, typography } from '../../constants/theme'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'
import { capabilitiesForUser, ROLE_LABELS } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>

export function ProfileMainScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const logout = useAuthStore((s) => s.logout)
  const caps = capabilitiesForUser(user)

  const doLogout = () => {
    Alert.alert('Log out', 'You’ll need to sign in again to see your work.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout(refreshToken)
          } finally {
            logout()
          }
        },
      },
    ])
  }

  const menu: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; onPress: () => void; visible?: boolean }[] = [
    { icon: 'person-outline', label: 'Edit profile', hint: 'Name and photo', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'lock-closed-outline', label: 'Password', hint: 'Update sign-in', onPress: () => navigation.navigate('ChangePassword') },
    {
      icon: 'people-outline',
      label: 'People',
      hint: 'Teammates in this company',
      onPress: () => navigation.navigate('People'),
      visible: caps.people || caps.managePeople,
    },
  ]

  return (
    <Screen padded={false}>
      <PageHeader title="You" subtitle="Account and company" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Avatar name={user?.name} uri={user?.avatar} size={72} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.pillRow}>
            <Pill label={ROLE_LABELS[user?.role || 'client'] || user?.role || ''} bg={colors.accentSoft} color={colors.accent} />
            {tenant?.name ? <Pill label={tenant.name} /> : null}
          </View>
        </View>

        <View style={styles.menu}>
          {menu
            .filter((m) => m.visible !== false)
            .map((item, i) => (
              <Pressable
                key={item.label}
                style={[styles.menuRow, i === 0 && styles.menuRowFirst]}
                onPress={item.onPress}
                accessibilityRole="button"
              >
                <View style={styles.iconWell}>
                  <Ionicons name={item.icon} size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuHint}>{item.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
        </View>

        <Pressable style={styles.logoutRow} onPress={doLogout} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  identity: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  name: { ...typography.h2, color: colors.textPrimary, marginTop: 6 },
  email: { ...typography.caption, color: colors.textSecondary },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  menuRowFirst: { borderTopWidth: 0 },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  menuHint: { ...typography.caption, color: colors.textMuted },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
  },
  logoutLabel: { ...typography.bodyStrong, color: colors.danger },
})
