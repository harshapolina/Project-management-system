import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { colors, radius, spacing, typography } from '../../constants/theme'
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
    Alert.alert('Log out', 'Are you sure you want to log out?', [
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

  const menu: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; visible?: boolean }[] = [
    { icon: 'person-outline', label: 'Edit profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'lock-closed-outline', label: 'Change password', onPress: () => navigation.navigate('ChangePassword') },
    {
      icon: 'people-outline',
      label: 'People directory',
      onPress: () => navigation.navigate('People'),
      visible: caps.people || caps.managePeople,
    },
  ]

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
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
            .map((item) => (
              <Pressable key={item.label} style={styles.menuRow} onPress={item.onPress} accessibilityRole="button">
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
        </View>

        <Pressable style={styles.logoutRow} onPress={doLogout} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>

        <Text style={styles.version}>Cubic Mobile</Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', gap: 4, paddingVertical: spacing.lg },
  name: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.sm },
  email: { ...typography.caption, color: colors.textSecondary },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
  },
  logoutLabel: { ...typography.bodyStrong, color: colors.danger },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
})
