import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useMutation } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import { TENANT_SLUG } from '../../constants/env'
import type { AuthStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const [workspace, setWorkspace] = useState(TENANT_SLUG)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const setAuth = useAuthStore((s) => s.setAuth)

  const mutation = useMutation({
    mutationFn: () => authApi.login({ email: email.trim().toLowerCase(), password }),
    onSuccess: (data) => {
      setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, tenant: data.tenant })
    },
    onError: (err) => {
      setErrors({ form: isApiError(err) ? err.message : 'Login failed' })
    },
  })

  const onSubmit = () => {
    const next: Record<string, string> = {}
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(workspace.trim())) next.workspace = 'Enter a valid workspace slug'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email'
    if (!password) next.password = 'Password is required'
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Screen keyboardAvoiding padded={false} background={colors.canvas}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>C</Text>
          </View>
          <Text style={styles.brandName}>Cubic</Text>
          <Text style={styles.brandSub}>Project management for studios that ship.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to your workspace</Text>

          {errors.form ? (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              label="Workspace"
              placeholder="your-company"
              autoCapitalize="none"
              autoCorrect={false}
              value={workspace}
              onChangeText={setWorkspace}
              error={errors.workspace}
              returnKeyType="next"
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              returnKeyType="next"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Button title="Sign in" onPress={onSubmit} loading={mutation.isPending} fullWidth />

          <Button
            title="Forgot password?"
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
        </View>

        <Text style={styles.demoHint}>
          Demo: employee@cubic.demo · demo1234 · workspace &quot;cubic&quot;
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  brand: { alignItems: 'center', gap: 6 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.rail,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoLetter: { color: '#fff', fontSize: 24, fontWeight: '700' },
  brandName: { ...typography.h1, color: colors.textPrimary },
  brandSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
  },
  heading: { ...typography.h2, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, marginTop: -8 },
  form: { gap: spacing.md },
  formError: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  formErrorText: { ...typography.caption, color: colors.danger },
  demoHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
})
