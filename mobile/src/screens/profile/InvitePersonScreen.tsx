import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { INVITE_ROLE_OPTIONS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'InvitePerson'>

export function InvitePersonScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

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
      queryClient.invalidateQueries({ queryKey: ['admin-team-summary'] })
      setResult({ tempPassword: data.tempPassword })
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not send invite' }),
  })

  if (result) {
    return (
      <FormLayout
        title="Invite created"
        subtitle="Share credentials securely"
        subtitleIcon="checkmark-circle-outline"
        onBack={() => navigation.goBack()}
        footer={<Button title="Done" onPress={() => navigation.goBack()} fullWidth />}
      >
        <Text style={styles.successBody}>
          Share these temporary credentials with {name.split(' ')[0] || 'them'} — they&apos;ll be asked to set a new
          password on first login.
        </Text>
        <View style={styles.credBox}>
          <Text style={styles.credLabel}>Email</Text>
          <Text style={styles.credValue}>{email.trim().toLowerCase()}</Text>
          <Text style={styles.credLabel}>Temporary password</Text>
          <Text style={styles.credValue}>{result.tempPassword}</Text>
        </View>
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="Invite person"
      subtitle="Add someone to your workspace"
      subtitleIcon="person-add-outline"
      onBack={() => navigation.goBack()}
      footer={
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
      }
    >
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
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    label: { ...typography.captionStrong, color: c.textSecondary },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    roleChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    roleChipActive: { backgroundColor: c.accent, borderColor: c.accent },
    roleChipText: { ...typography.caption, color: c.textSecondary },
    roleChipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    error: { ...typography.caption, color: c.danger },
    successBody: { ...typography.body, color: c.textSecondary },
    credBox: { gap: 4, marginTop: spacing.sm },
    credLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
    credValue: { ...typography.bodyStrong, color: c.textPrimary },
  })
}
