import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProjectsListScreen } from '../screens/projects/ProjectsListScreen'
import { CreateProjectScreen } from '../screens/projects/CreateProjectScreen'
import { ProjectOverviewScreen } from '../screens/projects/ProjectOverviewScreen'
import { ProjectTasksScreen } from '../screens/projects/ProjectTasksScreen'
import { ProjectFilesScreen } from '../screens/projects/ProjectFilesScreen'
import { ProjectTeamScreen } from '../screens/projects/ProjectTeamScreen'
import { ProjectNotesScreen } from '../screens/projects/ProjectNotesScreen'
import { SiteFeedScreen } from '../screens/sitefeed/SiteFeedScreen'
import { PostSiteUpdateScreen } from '../screens/sitefeed/PostSiteUpdateScreen'
import { PurchaseOrdersScreen } from '../screens/procurement/PurchaseOrdersScreen'
import { CreatePurchaseOrderScreen } from '../screens/procurement/CreatePurchaseOrderScreen'
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
      <Stack.Screen name="ProjectNotes" component={ProjectNotesScreen} options={{ title: 'Notes' }} />
      {/* Same route names + components the top-level "More" hub registers
          (see SharedOpsParamList) — the project's id is pre-filled via
          route params here instead of picked via ProjectPicker there. */}
      <Stack.Screen name="SiteFeed" component={SiteFeedScreen} options={{ title: 'Site Feed' }} />
      <Stack.Screen name="PostSiteUpdate" component={PostSiteUpdateScreen} options={{ presentation: 'modal', title: 'Post update' }} />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ title: 'Purchase Orders' }} />
      <Stack.Screen
        name="CreatePurchaseOrder"
        component={CreatePurchaseOrderScreen}
        options={{ presentation: 'modal', title: 'New purchase order' }}
      />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ presentation: 'modal', title: 'New task' }}
      />
    </Stack.Navigator>
  )
}
