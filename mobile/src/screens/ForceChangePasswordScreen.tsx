import { useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '../components/AuthLayout'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { isApiError } from '../api/client'

/** Gate shown when the server flags mustChangePassword. */
export function ForceChangePasswordScreen() {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

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
    <AuthLayout
      title="Set a new password"
      subtitle="Your account was created with a temporary password. Choose a new one to continue."
      footer={<Button title="Continue" onPress={onSubmit} loading={mutation.isPending} fullWidth />}
    >
      <Input label="New password" secureTextEntry value={next} onChangeText={setNext} error={errors.next} />
      <Input
        label="Confirm new password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
      />
      {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
    </AuthLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
  })
}
