import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, spacing, typography } from '../../constants/theme'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'ChangePassword'>

export function ChangePasswordScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        currentPassword: user?.mustChangePassword ? undefined : current,
        password: next,
      }),
    onSuccess: () => {
      if (user) setUser({ ...user, mustChangePassword: false })
      navigation.goBack()
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not update password' }),
  })

  const onSubmit = () => {
    const next2: Record<string, string> = {}
    if (!user?.mustChangePassword && !current) next2.current = 'Current password is required'
    if (next.length < 6) next2.next = 'New password must be at least 6 characters'
    if (next !== confirm) next2.confirm = 'Passwords do not match'
    setErrors(next2)
    if (Object.keys(next2).length === 0) mutation.mutate()
  }

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {user?.mustChangePassword ? (
          <Text style={styles.notice}>Your account requires a password change before continuing.</Text>
        ) : (
          <Input
            label="Current password"
            secureTextEntry
            value={current}
            onChangeText={setCurrent}
            error={errors.current}
          />
        )}
        <Input label="New password" secureTextEntry value={next} onChangeText={setNext} error={errors.next} />
        <Input
          label="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
        />
        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
        <Button title="Update password" onPress={onSubmit} loading={mutation.isPending} fullWidth />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  notice: { ...typography.caption, color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: 12 },
  error: { ...typography.caption, color: colors.danger },
})
