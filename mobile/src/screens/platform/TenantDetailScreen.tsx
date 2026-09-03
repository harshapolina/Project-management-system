import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import { assetUrl } from '../../constants/env'
import { ROLE_LABELS } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'
import type { Role } from '../../types/models'

type Props = NativeStackScreenProps<PlatformStackParamList, 'TenantDetail'>

function statusColor(c: AppColors) {
  return { trial: c.warning, active: c.success, suspended: c.danger, cancelled: c.danger }
}

export function TenantDetailScreen({ navigation, route }: Props) {
  const { tenantId } = route.params
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('admin')
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
  const [inviteResult, setInviteResult] = useState<{ tempPassword: string; email: string } | null>(null)

  const tenantQuery = useQuery({
    queryKey: ['platform-tenant', tenantId],
    queryFn: () => platformApi.getTenant(tenantId),
  })

  const usersQuery = useQuery({
    queryKey: ['platform-tenant-users', tenantId],
    queryFn: () => platformApi.tenantUsers(tenantId),
    enabled: !!tenantQuery.data,
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string }) => platformApi.uploadLogo(tenantId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
    },
    onError: (err) => Alert.alert('Upload failed', isApiError(err) ? err.message : 'Try again'),
  })

  const removeLogoMutation = useMutation({
    mutationFn: () => platformApi.removeLogo(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
    },
    onError: (err) => Alert.alert('Could not remove logo', isApiError(err) ? err.message : 'Try again'),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      platformApi.inviteTenantUser(tenantId, {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenantId] })
      setInviteResult({ tempPassword: data.tempPassword, email: inviteEmail.trim().toLowerCase() })
      setInviteName('')
      setInviteEmail('')
      setInviteErrors({})
    },
    onError: (err) => setInviteErrors({ form: isApiError(err) ? err.message : 'Could not invite user' }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => platformApi.resetTenantUserPassword(tenantId, userId),
    onSuccess: (data) => {
      Alert.alert('Temporary password', data.tempPassword, [{ text: 'OK' }])
    },
    onError: (err) => Alert.alert('Reset failed', isApiError(err) ? err.message : 'Try again'),
  })

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access in Settings to choose a logo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    uploadLogoMutation.mutate({
      uri: asset.uri,
      name: asset.fileName || 'logo.jpg',
      mimeType: asset.mimeType || 'image/jpeg',
    })
  }

  const tenant = tenantQuery.data
  const usersData = usersQuery.data

  const chromeProps = {
    title: tenant?.name || 'Company',
    subtitle: tenant?.slug || 'Loading…',
    subtitleIcon: 'business-outline' as const,
  }

  if (tenantQuery.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading company…" variant="list" />
      </NestedChrome>
    )
  }
  if (tenantQuery.isError || !tenant) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState
          message={isApiError(tenantQuery.error) ? tenantQuery.error.message : 'Company not found'}
          onRetry={() => tenantQuery.refetch()}
        />
      </NestedChrome>
    )
  }

  const logoBusy = uploadLogoMutation.isPending || removeLogoMutation.isPending
  const users = usersData?.users || []

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl
            refreshing={tenantQuery.isRefetching || usersQuery.isRefetching}
            onRefresh={() => {
              tenantQuery.refetch()
              usersQuery.refetch()
            }}
            tintColor={colors.accent}
          />
        }
      >
        <SurfaceCard style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Pressable
              onPress={pickLogo}
              disabled={logoBusy}
              style={[styles.logoWell, tenant.brandColor ? { backgroundColor: tenant.brandColor } : null]}
            >
              {logoBusy ? (
                <ActivityIndicator color={colors.accent} />
              ) : tenant.logoUrl ? (
                <Image source={{ uri: assetUrl(tenant.logoUrl) }} style={styles.logoImage} resizeMode="contain" />
              ) : (
                <Ionicons name="image-outline" size={28} color={colors.textMuted} />
              )}
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{tenant.name}</Text>
              <Pill
                label={tenant.status}
                color={statusColor(colors)[tenant.status]}
                bg={`${statusColor(colors)[tenant.status]}22`}
              />
              <Text style={styles.meta}>
                {tenant.seatsUsed}/{tenant.seatLimit} seats · {tenant.adminsUsed ?? 0}/{tenant.adminLimit ?? 3} admins
              </Text>
              <Text style={styles.meta}>
                {tenant.userCount ?? users.length} users · {tenant.projectCount ?? 0} projects
                {tenant.subscriptionPlan ? ` · ${tenant.subscriptionPlan}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.logoActions}>
            <Button title="Upload logo" variant="secondary" onPress={pickLogo} loading={uploadLogoMutation.isPending} />
            {tenant.logoUrl ? (
              <Button
                title="Remove"
                variant="danger"
                onPress={() =>
                  Alert.alert('Remove logo?', 'The company will show initials instead.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeLogoMutation.mutate() },
                  ])
                }
                loading={removeLogoMutation.isPending}
              />
            ) : null}
          </View>
        </SurfaceCard>

        <SectionLabel count={users.length}>Users</SectionLabel>
        {usersQuery.isLoading ? (
          <LoadingState label="Loading users…" variant="list" />
        ) : (
          <SurfaceCard style={styles.blockGap}>
            {users.length === 0 ? (
              <Text style={styles.emptyUsers}>No users yet.</Text>
            ) : (
              users.map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <View style={styles.userCopy}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userMeta}>{u.email}</Text>
                    <Text style={styles.userMeta}>{ROLE_LABELS[u.role] || u.role}</Text>
                  </View>
                  <Button
                    title="Reset password"
                    variant="secondary"
                    onPress={() =>
                      Alert.alert('Reset password?', `Generate a new temporary password for ${u.name}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reset', onPress: () => resetPasswordMutation.mutate(u.id) },
                      ])
                    }
                    loading={resetPasswordMutation.isPending}
                  />
                </View>
              ))
            )}
          </SurfaceCard>
        )}

        <SectionLabel>Invite user</SectionLabel>
        {inviteResult ? (
          <SurfaceCard style={styles.blockGap}>
            <Text style={styles.successTitle}>Invite created</Text>
            <Text style={styles.userMeta}>Email: {inviteResult.email}</Text>
            <Text style={styles.userMeta}>Temporary password: {inviteResult.tempPassword}</Text>
            <Button title="Done" onPress={() => setInviteResult(null)} fullWidth />
          </SurfaceCard>
        ) : (
          <SurfaceCard style={styles.blockGap}>
            <Input label="Name" value={inviteName} onChangeText={setInviteName} error={inviteErrors.name} />
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              error={inviteErrors.email}
            />
            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['admin', 'owner', 'project_manager'] as Role[]).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setInviteRole(role)}
                  style={[styles.roleChip, inviteRole === role && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, inviteRole === role && styles.roleChipTextActive]}>
                    {ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              ))}
            </View>
            {inviteErrors.form ? <Text style={styles.formError}>{inviteErrors.form}</Text> : null}
            <Button
              title="Send invite"
              onPress={() => {
                const next: Record<string, string> = {}
                if (!inviteName.trim()) next.name = 'Required'
                if (!/^\S+@\S+\.\S+$/.test(inviteEmail.trim())) next.email = 'Enter a valid email'
                setInviteErrors(next)
                if (Object.keys(next).length === 0) inviteMutation.mutate()
              }}
              loading={inviteMutation.isPending}
              fullWidth
            />
          </SurfaceCard>
        )}
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    headerCard: { gap: spacing.md },
    headerTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    logoWell: {
      width: 72,
      height: 72,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoImage: { width: '100%', height: '100%' },
    headerCopy: { flex: 1, gap: 4 },
    title: { ...typography.h3, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    logoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    blockGap: { gap: spacing.md },
    emptyUsers: { ...typography.caption, color: c.textMuted },
    userRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    userCopy: { flex: 1, gap: 2 },
    userName: { ...typography.bodyStrong, color: c.textPrimary },
    userMeta: { ...typography.caption, color: c.textSecondary },
    roleLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    roleChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    roleChipActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
    roleChipText: { ...typography.captionStrong, color: c.textSecondary },
    roleChipTextActive: { color: c.accent },
    formError: { ...typography.caption, color: c.danger },
    successTitle: { ...typography.bodyStrong, color: c.textPrimary },
  })
}
