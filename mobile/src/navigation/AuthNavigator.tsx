import { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen'
import { stackScreenOptions } from './options'
import { useColors } from '../theme/useColors'
import type { AuthStackParamList } from './types'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  const colors = useColors()
  const options = useMemo(() => stackScreenOptions(colors), [colors])

  return (
    <Stack.Navigator screenOptions={{ ...options, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  )
}
