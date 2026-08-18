import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateTenant'>

export function CreateTenantScreen({ navigation }: Props) {
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
      setResult({ tempPassword: data.tempPassword, loginHint: data.loginHint })
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not create workspace' }),
  })

  if (result) {
    return (
      <Screen>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Workspace created</Text>
          <View style={styles.credBox}>
            <Text style={styles.credLabel}>Admin email</Text>
            <Text style={styles.credValue}>{adminEmail.trim().toLowerCase()}</Text>
            <Text style={styles.credLabel}>Temporary password</Text>
            <Text style={styles.credValue}>{result.tempPassword}</Text>
            <Text style={styles.credLabel}>Login</Text>
            <Text style={styles.credValue}>{result.loginHint}</Text>
          </View>
          <Button title="Done" onPress={() => navigation.goBack()} fullWidth />
        </View>
      </Screen>
    )
  }

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
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
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.danger },
  successCard: { gap: spacing.md, paddingTop: spacing.xl },
  successTitle: { ...typography.h2, color: colors.textPrimary },
  credBox: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  credLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
  credValue: { ...typography.bodyStrong, color: colors.textPrimary },
})
