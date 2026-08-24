import { useMemo, useState } from 'react'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { ForceChangePasswordScreen } from '../screens/ForceChangePasswordScreen'
import { SplashScreen, SPLASH_BG } from '../components/SplashScreen'
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
  const [splashDone, setSplashDone] = useState(false)

  const bootReady = authHydrated && uiHydrated && !isRestoring
  const showSplash = !splashDone

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

  const isAuthed = !!user && !!accessToken

  return (
    <View style={{ flex: 1, backgroundColor: showSplash ? SPLASH_BG : colors.canvas }}>
      {showSplash ? (
        <SplashScreen hold={!bootReady} onFinished={() => setSplashDone(true)} />
      ) : (
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
      )}
    </View>
  )
}
