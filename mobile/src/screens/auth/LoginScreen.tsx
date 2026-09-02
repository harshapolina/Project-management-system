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
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import { TENANT_SLUG } from '../../constants/env'
import type { AuthStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [workspace, setWorkspace] = useState(TENANT_SLUG)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const setAuth = useAuthStore((s) => s.setAuth)

  const mutation = useMutation({
    mutationFn: () => authApi.login({ email: email.trim().toLowerCase(), password }),
    onSuccess: (data) => {
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tenant: data.tenant,
      })
    },
    onError: (err) => {
      setErrors({ form: isApiError(err) ? err.message : 'Couldn’t sign in. Check your details and try again.' })
    },
  })

  const onSubmit = () => {
    const next: Record<string, string> = {}
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(workspace.trim())) next.workspace = 'Enter your company workspace'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid work email'
    if (!password) next.password = 'Enter your password'
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your workspace credentials to continue."
      brand={
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>C</Text>
          </View>
          <Text style={styles.brandName}>Cubic</Text>
        </View>
      }
      footer={
        <>
          <Button title="Continue" onPress={onSubmit} loading={mutation.isPending} fullWidth />
          <Button
            title="Forgot password"
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
          <Button
            title="Invite only — learn more"
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate('Register')}
          />
        </>
      }
    >
      {errors.form ? (
        <View style={styles.formError}>
          <Text style={styles.formErrorText}>{errors.form}</Text>
        </View>
      ) : null}
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
        placeholder="you@company.com"
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
        placeholder="Your password"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
    </AuthLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    brand: { alignItems: 'center', gap: 8 },
    logoMark: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoLetter: { color: c.textOnAccent, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    brandName: { ...typography.h1, color: c.textPrimary },
    formError: {
      backgroundColor: c.dangerSoft,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    formErrorText: { ...typography.caption, color: c.danger },
  })
}
