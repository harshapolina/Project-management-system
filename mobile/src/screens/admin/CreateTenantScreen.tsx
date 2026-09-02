import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<PlatformStackParamList, 'CreateTenant'>

export function CreateTenantScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ tempPassword: string; loginHint: string } | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      platformApi.createTenant({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-overview'] })
      setResult({ tempPassword: data.tempPassword, loginHint: data.loginHint })
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not create workspace' }),
  })

  if (result) {
    return (
      <FormLayout
        title="Workspace created"
        subtitle="Share credentials securely"
        subtitleIcon="checkmark-circle-outline"

        footer={<Button title="Done" onPress={() => navigation.goBack()} fullWidth />}
      >
        <View style={styles.credBox}>
          <Text style={styles.credLabel}>Admin email</Text>
          <Text style={styles.credValue}>{adminEmail.trim().toLowerCase()}</Text>
          <Text style={styles.credLabel}>Temporary password</Text>
          <Text style={styles.credValue}>{result.tempPassword}</Text>
          <Text style={styles.credLabel}>Login</Text>
          <Text style={styles.credValue}>{result.loginHint}</Text>
        </View>
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="New workspace"
      subtitle="Platform admin"
      subtitleIcon="business-outline"

      footer={
        <Button
          title="Create workspace"
          onPress={() => {
            const next: Record<string, string> = {}
            if (!name.trim()) next.name = 'Required'
            if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug.trim())) next.slug = 'Lowercase letters, numbers, hyphens only'
            if (!adminName.trim()) next.adminName = 'Required'
            if (!/^\S+@\S+\.\S+$/.test(adminEmail.trim())) next.adminEmail = 'Enter a valid email'
            setErrors(next)
            if (Object.keys(next).length === 0) mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      }
    >
      <Input label="Workspace name" placeholder="e.g. Studio Forge" value={name} onChangeText={setName} error={errors.name} />
      <Input
        label="Workspace slug"
        placeholder="studio-forge"
        autoCapitalize="none"
        value={slug}
        onChangeText={setSlug}
        error={errors.slug}
      />
      <Input label="Admin name" value={adminName} onChangeText={setAdminName} error={errors.adminName} />
      <Input
        label="Admin email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={adminEmail}
        onChangeText={setAdminEmail}
        error={errors.adminEmail}
      />
      {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
    credBox: { gap: 4 },
    credLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
    credValue: { ...typography.bodyStrong, color: c.textPrimary },
  })
}
