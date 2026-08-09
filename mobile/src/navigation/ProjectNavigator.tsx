import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProjectsListScreen } from '../screens/projects/ProjectsListScreen'
import { CreateProjectScreen } from '../screens/projects/CreateProjectScreen'
import { ProjectOverviewScreen } from '../screens/projects/ProjectOverviewScreen'
import { ProjectTasksScreen } from '../screens/projects/ProjectTasksScreen'
import { ProjectFilesScreen } from '../screens/projects/ProjectFilesScreen'
import { ProjectTeamScreen } from '../screens/projects/ProjectTeamScreen'
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen'
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen'
import { colors } from '../constants/theme'
import type { ProjectStackParamList } from './types'

const Stack = createNativeStackNavigator<ProjectStackParamList>()

export function ProjectNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ProjectsList" component={ProjectsListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{ presentation: 'modal', title: 'New project' }}
      />
      <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen} options={{ title: 'Project' }} />
      <Stack.Screen name="ProjectTasks" component={ProjectTasksScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="ProjectFiles" component={ProjectFilesScreen} options={{ title: 'Files' }} />
      <Stack.Screen name="ProjectTeam" component={ProjectTeamScreen} options={{ title: 'Team' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ presentation: 'modal', title: 'New task' }}
      />
    </Stack.Navigator>
  )
}
