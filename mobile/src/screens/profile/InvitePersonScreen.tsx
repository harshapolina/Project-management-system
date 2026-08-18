import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { INVITE_ROLE_OPTIONS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'InvitePerson'>

export function InvitePersonScreen({ navigation }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('project_manager')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ tempPassword: string } | null>(null)

  const mutation = useMutation({
    mutationFn: () => adminApi.invite({ name: name.trim(), email: email.trim().toLowerCase(), role }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setResult({ tempPassword: data.tempPassword })
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not send invite' }),
  })

  if (result) {
    return (
      <Screen>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Invite created</Text>
          <Text style={styles.successBody}>
            Share these temporary credentials with {name.split(' ')[0] || 'them'} — they&apos;ll be asked to set a
            new password on first login.
          </Text>
          <View style={styles.credBox}>
            <Text style={styles.credLabel}>Email</Text>
            <Text style={styles.credValue}>{email.trim().toLowerCase()}</Text>
            <Text style={styles.credLabel}>Temporary password</Text>
            <Text style={styles.credValue}>{result.tempPassword}</Text>
          </View>
          <Button title="Done" onPress={() => navigation.goBack()} fullWidth />
        </View>
      </Screen>
    )
  }

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Input label="Full name" value={name} onChangeText={setName} error={errors.name} />
        <Input
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleGrid}>
          {INVITE_ROLE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setRole(opt.value)}
              style={[styles.roleChip, role === opt.value && styles.roleChipActive]}
            >
              <Text style={[styles.roleChipText, role === opt.value && styles.roleChipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

        <Button
          title="Send invite"
          onPress={() => {
            const next: Record<string, string> = {}
            if (!name.trim()) next.name = 'Name is required'
            if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email'
            setErrors(next)
            if (Object.keys(next).length === 0) mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  label: { ...typography.captionStrong, color: colors.textSecondary },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceRaised },
  roleChipActive: { backgroundColor: colors.rail },
  roleChipText: { ...typography.caption, color: colors.textSecondary },
  roleChipTextActive: { color: '#fff', fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger },
  successCard: { gap: spacing.md, paddingTop: spacing.xl },
  successTitle: { ...typography.h2, color: colors.textPrimary },
  successBody: { ...typography.body, color: colors.textSecondary },
  credBox: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  credLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
  credValue: { ...typography.bodyStrong, color: colors.textPrimary },
})
