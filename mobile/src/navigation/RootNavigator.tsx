import { useMemo } from 'react'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { ForceChangePasswordScreen } from '../screens/ForceChangePasswordScreen'
import { LoadingState } from '../components/States'
import { useColors, useThemeMode } from '../theme/useColors'
import { useUiStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useSessionRestore } from '../hooks/useSession'

export function RootNavigator() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const authHydrated = useAuthStore((s) => s.hasHydrated)
  const uiHydrated = useUiStore((s) => s.hasHydrated)
  const { isRestoring } = useSessionRestore()
  const colors = useColors()
  const mode = useThemeMode()

  const navTheme = useMemo(
    () => ({
      ...(mode === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.canvas,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accent,
      },
    }),
    [colors, mode],
  )

  if (!authHydrated || !uiHydrated || isRestoring) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <LoadingState variant="boot" label="Loading Cubic…" />
      </View>
    )
  }

  const isAuthed = !!user && !!accessToken

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {!isAuthed ? (
        <AuthNavigator />
      ) : user.mustChangePassword ? (
        <ForceChangePasswordScreen />
      ) : !user.onboardingCompleted ? (
        <OnboardingScreen />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  )
}
