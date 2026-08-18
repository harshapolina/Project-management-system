import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { Screen } from '../components/Screen'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { colors, radius, spacing, typography } from '../constants/theme'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { isApiError } from '../api/client'

export function OnboardingScreen() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.updateMe({ title: title || undefined, onboardingCompleted: true }),
    onSuccess: (data) => setUser(data.user),
    onError: (err) => setError(isApiError(err) ? err.message : 'Something went wrong'),
  })

  return (
    <Screen keyboardAvoiding padded={false} background={colors.canvas}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.progress}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.heading}>Welcome, {user?.name?.split(' ')[0] || 'there'}</Text>
          <Text style={styles.subheading}>Let&apos;s set up your profile so Cubic feels like home.</Text>

          <Input
            label="Your title (optional)"
            placeholder="e.g. Senior Project Manager"
            value={title}
            onChangeText={setTitle}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Enter Cubic" onPress={() => mutation.mutate()} loading={mutation.isPending} fullWidth />
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
  },
  progress: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', width: '70%', backgroundColor: colors.accent },
  heading: { ...typography.h2, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, marginTop: -8 },
  error: { ...typography.caption, color: colors.danger },
})
