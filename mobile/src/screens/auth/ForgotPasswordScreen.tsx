import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '../../components/AuthLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { authApi } from '../../api/auth'
import { isApiError } from '../../api/client'
import type { AuthStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim().toLowerCase()),
    onSuccess: (data) => setSent(data.message),
    onError: (err) => setError(isApiError(err) ? err.message : 'Something went wrong'),
  })

  const onSubmit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We’ll email instructions to this address."
      footer={
        <Button title="Back to sign in" variant="ghost" size="sm" onPress={() => navigation.goBack()} />
      }
    >
      {sent ? (
        <View style={styles.success}>
          <Text style={styles.successText}>{sent}</Text>
        </View>
      ) : (
        <>
          <Input
            label="Email"
            placeholder="you@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={error}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <Button title="Send link" onPress={onSubmit} loading={mutation.isPending} fullWidth />
        </>
      )}
    </AuthLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    success: { backgroundColor: c.successSoft, borderRadius: radius.md, padding: spacing.md },
    successText: { ...typography.body, color: c.success },
  })
}
