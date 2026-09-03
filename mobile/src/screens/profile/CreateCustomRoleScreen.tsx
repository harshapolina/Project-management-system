import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { ACCESS_TOGGLES, defaultPermissionsForRole, ROLE_LABELS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'CreateCustomRole'>

/** The server's CUSTOM_ROLE_BASES — a custom role inherits one of these. */
const BASES: Role[] = ['project_manager', 'designer', 'site_supervisor', 'vendor', 'client']

export function CreateCustomRoleScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const tenant = useAuthStore((s) => s.tenant)
  const setTenant = useAuthStore((s) => s.setTenant)

  const [label, setLabel] = useState('')
  const [basedOn, setBasedOn] = useState<Role>('designer')
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')

  // Start from the base template so the switches show what the role already gets.
  const basePermissions = useMemo(() => defaultPermissionsForRole(basedOn), [basedOn])
  const effective = { ...basePermissions, ...overrides }

  const groups = useMemo(() => {
    const map = new Map<string, typeof ACCESS_TOGGLES>()
    for (const toggle of ACCESS_TOGGLES) {
      if (!map.has(toggle.group)) map.set(toggle.group, [])
      map.get(toggle.group)!.push(toggle)
    }
    return [...map.entries()]
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createCustomRole({
        label: label.trim(),
        basedOn,
        // Only send what differs from the base — the server stores overrides.
        permissions: overrides,
      }),
    onSuccess: (res) => {
      if (tenant) setTenant({ ...tenant, customRoles: res.customRoles })
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] })
      queryClient.invalidateQueries({ queryKey: ['team-summary'] })
      navigation.goBack()
    },
    onError: (err) => {
      Alert.alert('Could not create role', isApiError(err) ? err.message : 'Try again.')
    },
  })

  const submit = () => {
    if (label.trim().length < 2) {
      setError('Give the role a name of at least 2 characters.')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <FormLayout
      title="New custom role"
      subtitle="A named job title with its own access"
      subtitleIcon="shield-outline"
      card={false}
      footer={
        <Button title="Create role" onPress={submit} loading={mutation.isPending} disabled={!label.trim()} />
      }
    >
      <Input
        label="Role name"
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Senior Designer"
        autoCapitalize="words"
        error={error || undefined}
      />

      <View style={styles.block}>
        <Text style={styles.label}>Based on</Text>
        <Text style={styles.hint}>The template this role starts from. You can adjust access below.</Text>
        <View style={styles.chipWrap}>
          {BASES.map((r) => (
            <Pressable
              key={r}
              onPress={() => {
                setBasedOn(r)
                setOverrides({})
              }}
              style={[styles.chip, basedOn === r && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: basedOn === r }}
            >
              <Text style={[styles.chipText, basedOn === r && styles.chipTextActive]}>
                {ROLE_LABELS[r]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {groups.map(([group, toggles]) => (
        <View key={group} style={styles.block}>
          <Text style={styles.groupLabel}>{group}</Text>
          <View style={styles.toggleCard}>
            {toggles.map((toggle, idx) => {
              const on = !!effective[toggle.key]
              const inherited = !!basePermissions[toggle.key] && overrides[toggle.key] === undefined
              return (
                <View key={toggle.key} style={[styles.toggleRow, idx > 0 && styles.rowBorder]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.toggleLabel}>{toggle.label}</Text>
                    {inherited ? (
                      <Text style={styles.hint}>{`From ${ROLE_LABELS[basedOn]}`}</Text>
                    ) : null}
                  </View>
                  <Switch
                    value={on}
                    onValueChange={(next) =>
                      setOverrides((prev) => ({ ...prev, [toggle.key]: next }))
                    }
                    trackColor={{ true: colors.accent, false: colors.border }}
                  />
                </View>
              )
            })}
          </View>
        </View>
      ))}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    block: { gap: spacing.sm },
    label: { ...typography.captionStrong, color: c.textSecondary },
    groupLabel: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    hint: { ...typography.caption, color: c.textMuted },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.canvas },
    toggleCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
    },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11 },
    toggleLabel: { ...typography.body, color: c.textPrimary },
  })
}
