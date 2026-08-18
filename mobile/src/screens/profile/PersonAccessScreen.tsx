import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { ACCESS_TOGGLES, ROLE_LABELS, capabilitiesForUser } from '../../utils/roles'
import { useAuthStore } from '../../store/authStore'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'PersonAccess'>

export function PersonAccessScreen({ route }: Props) {
  const { userId } = route.params
  const me = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(me)
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const [tempPassword, setTempPassword] = useState('')

  const summary = useQuery({
    queryKey: ['admin-team-summary'],
    queryFn: adminApi.teamSummary,
  })

  useEffect(() => {
    const found = (summary.data?.members || []).find((m) => m.user._id === userId)
    if (!found) return
    setDraft(found.user.effectivePermissions || {})
  }, [summary.data, userId])

  const member = (summary.data?.members || []).find((m) => m.user._id === userId)

  const groups = useMemo(() => {
    const map: Record<string, typeof ACCESS_TOGGLES> = {}
    for (const item of ACCESS_TOGGLES) {
      map[item.group] = [...(map[item.group] || []), item]
    }
    return map
  }, [])

  const save = useMutation({
    mutationFn: () => adminApi.updatePermissions(userId, { permissions: draft }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team-summary'] })
      Alert.alert('Access saved', 'Their app modules update on next refresh.')
    },
    onError: (err) => Alert.alert('Could not save', isApiError(err) ? err.message : 'Try again'),
  })

  const reset = useMutation({
    mutationFn: () => adminApi.resetPassword(userId),
    onSuccess: (res) => setTempPassword(res.tempPassword),
    onError: (err) => Alert.alert('Could not reset', isApiError(err) ? err.message : 'Try again'),
  })

  if (summary.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading access…" />
      </Screen>
    )
  }
  if (summary.isError || !member) {
    return (
      <Screen>
        <ErrorState
          message={isApiError(summary.error) ? summary.error.message : 'Person not found'}
          onRetry={() => summary.refetch()}
        />
      </Screen>
    )
  }

  const user = member.user

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.identity}>
          <Avatar name={user.name} uri={user.avatar} size={56} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.pills}>
            <Pill label={ROLE_LABELS[user.role] || user.role} />
            <Pill
              label={user.isActive === false ? 'Inactive' : 'Active'}
              color={user.isActive === false ? colors.danger : colors.success}
            />
          </View>
          <Text style={styles.meta}>
            {member.open} open · {member.overdue} overdue · {member.done} done
          </Text>
        </Card>

        {Object.entries(groups).map(([group, items]) => (
          <View key={group} style={styles.group}>
            <Text style={styles.groupTitle}>{group}</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {items.map((item, i) => (
                <View key={item.key} style={[styles.toggleRow, i === 0 && { borderTopWidth: 0 }]}>
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                  <Switch
                    value={!!draft[item.key]}
                    onValueChange={(v) => setDraft((prev) => ({ ...prev, [item.key]: v }))}
                    disabled={!caps.managePeople}
                    trackColor={{ true: colors.accent }}
                  />
                </View>
              ))}
            </Card>
          </View>
        ))}

        {caps.managePeople ? (
          <Button title="Save access" onPress={() => save.mutate()} loading={save.isPending} fullWidth />
        ) : null}

        {caps.managePeople && ['admin', 'owner'].includes(me?.role || '') ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Reset password"
              variant="secondary"
              onPress={() =>
                Alert.alert('Reset password', `Create a temporary password for ${user.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', onPress: () => reset.mutate() },
                ])
              }
              loading={reset.isPending}
              fullWidth
            />
            {tempPassword ? (
              <Card>
                <Text style={styles.tempLabel}>Temporary password</Text>
                <Text selectable style={styles.tempValue}>
                  {tempPassword}
                </Text>
                <Text style={styles.meta}>Share this once. They’ll be asked to change it on sign-in.</Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {caps.managePeople && userId !== me?.id ? (
          <Pressable
            onPress={() =>
              Alert.alert(
                user.isActive === false ? 'Reactivate' : 'Deactivate',
                user.isActive === false
                  ? `Let ${user.name} sign in again?`
                  : `Stop ${user.name} from signing in?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: user.isActive === false ? 'Reactivate' : 'Deactivate',
                    style: user.isActive === false ? 'default' : 'destructive',
                    onPress: () =>
                      adminApi.updatePermissions(userId, { isActive: user.isActive === false }).then(() => {
                        qc.invalidateQueries({ queryKey: ['admin-team-summary'] })
                      }),
                  },
                ],
              )
            }
            style={styles.dangerRow}
          >
            <Text style={styles.dangerText}>{user.isActive === false ? 'Reactivate account' : 'Deactivate account'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  identity: { alignItems: 'center', gap: 4 },
  name: { ...typography.h2, color: colors.textPrimary, marginTop: 8 },
  email: { ...typography.caption, color: colors.textSecondary },
  pills: { flexDirection: 'row', gap: 8, marginTop: 6 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  group: { gap: 8 },
  groupTitle: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggleLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  tempLabel: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase' },
  tempValue: { ...typography.h3, color: colors.textPrimary, marginTop: 4 },
  dangerRow: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
  },
  dangerText: { ...typography.bodyStrong, color: colors.danger },
})
