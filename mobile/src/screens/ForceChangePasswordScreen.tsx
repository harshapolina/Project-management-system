import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { Screen } from '../components/Screen'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { colors, spacing, typography } from '../constants/theme'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { isApiError } from '../api/client'

/** Gate shown when the server flags mustChangePassword (e.g. after an admin
 * invite with a temp password) — mirrors the web app sending these users
 * straight to /settings before anything else is reachable. */
export function ForceChangePasswordScreen() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ password: next }),
    onSuccess: () => {
      if (user) setUser({ ...user, mustChangePassword: false })
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not update password' }),
  })

  const onSubmit = () => {
    const next2: Record<string, string> = {}
    if (next.length < 6) next2.next = 'New password must be at least 6 characters'
    if (next !== confirm) next2.confirm = 'Passwords do not match'
    setErrors(next2)
    if (Object.keys(next2).length === 0) mutation.mutate()
  }

  return (
    <Screen keyboardAvoiding padded={false} background={colors.canvas}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.subheading}>
          Your account was created with a temporary password. Choose a new one to continue.
        </Text>
        <Input label="New password" secureTextEntry value={next} onChangeText={setNext} error={errors.next} />
        <Input
          label="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
        />
        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
        <Button title="Continue" onPress={onSubmit} loading={mutation.isPending} fullWidth />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  heading: { ...typography.h2, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.danger },
})
