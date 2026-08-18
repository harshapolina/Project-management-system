import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { ForceChangePasswordScreen } from '../screens/ForceChangePasswordScreen'
import { LoadingState } from '../components/States'
import { colors } from '../constants/theme'
import { useAuthStore } from '../store/authStore'
import { useSessionRestore } from '../hooks/useSession'

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.canvas,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
}

export function RootNavigator() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const { isRestoring } = useSessionRestore()

  if (isRestoring) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <LoadingState label="Loading Cubic…" />
      </View>
    )
  }

  const isAuthed = !!user && !!accessToken

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
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
