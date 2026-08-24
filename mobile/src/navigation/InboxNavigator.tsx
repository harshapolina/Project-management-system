import { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ThreadsScreen } from '../screens/inbox/ThreadsScreen'
import { ConversationScreen } from '../screens/inbox/ConversationScreen'
import { NewMessageScreen } from '../screens/inbox/NewMessageScreen'
import { formSheetOptions, stackScreenOptions } from './options'
import { useColors } from '../theme/useColors'
import type { InboxStackParamList } from './types'

const Stack = createNativeStackNavigator<InboxStackParamList>()

export function InboxNavigator() {
  const colors = useColors()
  const options = useMemo(() => stackScreenOptions(colors), [colors])
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="Threads" component={ThreadsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="NewMessage"
        component={NewMessageScreen}
        options={formSheetOptions(colors, 'New message')}
      />
    </Stack.Navigator>
  )
}
