import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { useAuthStore } from '../../store/authStore'
import { API_ORIGIN } from '../../constants/env'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<PlatformStackParamList, 'PlatformSettings'>

export function PlatformSettingsScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const user = useAuthStore((s) => s.user)

  const chromeProps = {
    title: "Settings",
    subtitle: "Platform administrator",
    subtitleIcon: 'settings-outline' as const,
  }

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView contentContainerStyle={listContent}>
        <SectionLabel>Your account</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{user?.name || '—'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || '—'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>Platform administrator</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Access</Text>
            <Text style={styles.value}>All companies on EPM</Text>
          </View>
        </SurfaceCard>

        <SectionLabel>Login URLs</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          <View style={styles.field}>
            <Text style={styles.label}>Platform admin</Text>
            <Text style={styles.code}>{API_ORIGIN}/platform/login</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Company workspaces</Text>
            <Text style={styles.code}>{API_ORIGIN}/login</Text>
          </View>
          <Text style={styles.note}>
            Company admins sign in with their workspace slug. They never receive platform-level access.
          </Text>
        </SurfaceCard>

        <SectionLabel>How it works</SectionLabel>
        <SurfaceCard>
          <Text style={styles.body}>
            You are the single Editco platform admin. Each company is an isolated workspace. Create credentials for
            their admins — they manage their own team inside their workspace. Use Companies to manage users and
            features, Subscriptions to cancel or reactivate billing, and Feature plans to apply Starter / Pro /
            Enterprise bundles.
          </Text>
        </SurfaceCard>
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    blockGap: { gap: spacing.md },
    field: { gap: 2 },
    label: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
    value: { ...typography.bodyStrong, color: c.textPrimary },
    code: { ...typography.captionStrong, color: c.accent, fontFamily: 'Menlo' },
    note: { ...typography.caption, color: c.textSecondary, marginTop: spacing.sm },
    body: { ...typography.body, color: c.textSecondary, lineHeight: 22 },
  })
}
