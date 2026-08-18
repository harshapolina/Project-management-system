import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { HomeScreen } from '../screens/home/HomeScreen'
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen'
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen'
import { stackScreenOptions } from './options'
import type { HomeStackParamList } from './types'

const Stack = createNativeStackNavigator<HomeStackParamList>()

export function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ presentation: 'modal', title: 'New task' }}
      />
    </Stack.Navigator>
  )
}
