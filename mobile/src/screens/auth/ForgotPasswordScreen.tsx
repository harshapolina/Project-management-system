import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useMutation } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, radius, shadows, spacing, typography } from '../../constants/theme'
import { authApi } from '../../api/auth'
import { isApiError } from '../../api/client'
import type { AuthStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen({ navigation }: Props) {
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
    <Screen keyboardAvoiding padded={false} background={colors.canvas}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Reset password</Text>
          <Text style={styles.subheading}>We’ll email instructions to this address.</Text>

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

          <Button title="Back to sign in" variant="ghost" size="sm" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    ...shadows.card,
  },
  heading: { ...typography.h2, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, marginTop: -8 },
  success: { backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.md },
  successText: { ...typography.body, color: colors.success },
})
