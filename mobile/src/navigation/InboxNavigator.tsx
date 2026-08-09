import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ThreadsScreen } from '../screens/inbox/ThreadsScreen'
import { ConversationScreen } from '../screens/inbox/ConversationScreen'
import { NewMessageScreen } from '../screens/inbox/NewMessageScreen'
import { colors } from '../constants/theme'
import type { InboxStackParamList } from './types'

const Stack = createNativeStackNavigator<InboxStackParamList>()

export function InboxNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Threads" component={ThreadsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen
        name="NewMessage"
        component={NewMessageScreen}
        options={{ presentation: 'modal', title: 'New message' }}
      />
    </Stack.Navigator>
  )
}
