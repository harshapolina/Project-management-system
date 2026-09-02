import { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProjectsListScreen } from '../screens/projects/ProjectsListScreen'
import { CreateProjectScreen } from '../screens/projects/CreateProjectScreen'
import { CreateSpaceScreen } from '../screens/projects/CreateSpaceScreen'
import { ProjectOverviewScreen } from '../screens/projects/ProjectOverviewScreen'
import { EditProjectScreen } from '../screens/projects/EditProjectScreen'
import { ProjectTasksScreen } from '../screens/projects/ProjectTasksScreen'
import { ProjectFilesScreen } from '../screens/projects/ProjectFilesScreen'
import { ProjectTeamScreen } from '../screens/projects/ProjectTeamScreen'
import { ProjectNotesScreen } from '../screens/projects/ProjectNotesScreen'
import { ProjectActivityScreen } from '../screens/projects/ProjectActivityScreen'
import { SiteFeedScreen } from '../screens/sitefeed/SiteFeedScreen'
import { PostSiteUpdateScreen } from '../screens/sitefeed/PostSiteUpdateScreen'
import { RfqPanelScreen } from '../screens/procurement/RfqPanelScreen'
import { RfqDetailScreen } from '../screens/procurement/RfqDetailScreen'
import { CreateRfqScreen } from '../screens/procurement/CreateRfqScreen'
import { PurchaseOrderDetailScreen } from '../screens/procurement/PurchaseOrderDetailScreen'
import { PurchaseOrdersScreen } from '../screens/procurement/PurchaseOrdersScreen'
import { CreatePurchaseOrderScreen } from '../screens/procurement/CreatePurchaseOrderScreen'
import { BoqDetailScreen } from '../screens/boq/BoqDetailScreen'
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen'
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen'
import { formSheetOptions, stackScreenOptions } from './options'
import { useColors } from '../theme/useColors'
import type { ProjectStackParamList } from './types'

const Stack = createNativeStackNavigator<ProjectStackParamList>()

export function ProjectNavigator() {
  const colors = useColors()
  const options = useMemo(() => stackScreenOptions(colors), [colors])
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="ProjectsList" component={ProjectsListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={formSheetOptions(colors, 'New project')}
      />
      <Stack.Screen
        name="CreateSpace"
        component={CreateSpaceScreen}
        options={formSheetOptions(colors, 'New space')}
      />
      <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen} options={{ headerShown: false, title: 'Project' }} />
      <Stack.Screen name="EditProject" component={EditProjectScreen} options={formSheetOptions(colors, 'Edit project')} />
      <Stack.Screen name="ProjectTasks" component={ProjectTasksScreen} options={{ headerShown: false, title: 'Tasks' }} />
      <Stack.Screen name="ProjectFiles" component={ProjectFilesScreen} options={{ headerShown: false, title: 'Files' }} />
      <Stack.Screen name="ProjectTeam" component={ProjectTeamScreen} options={{ headerShown: false, title: 'Team' }} />
      <Stack.Screen name="ProjectNotes" component={ProjectNotesScreen} options={{ headerShown: false, title: 'Notes' }} />
      <Stack.Screen name="ProjectActivity" component={ProjectActivityScreen} options={{ headerShown: false, title: 'Activity' }} />
      {/* Same route names + components the top-level "More" hub registers
          (see SharedOpsParamList) — the project's id is pre-filled via
          route params here instead of picked via ProjectPicker there. */}
      <Stack.Screen name="SiteFeed" component={SiteFeedScreen} options={{ headerShown: false, title: 'Site Feed' }} />
      <Stack.Screen
        name="PostSiteUpdate"
        component={PostSiteUpdateScreen}
        options={formSheetOptions(colors, 'Post update')}
      />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ headerShown: false, title: 'Purchase Orders' }} />
      <Stack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} options={{ headerShown: false, title: 'PO' }} />
      <Stack.Screen name="RfqPanel" component={RfqPanelScreen} options={{ headerShown: false, title: 'Materials' }} />
      <Stack.Screen name="RfqDetail" component={RfqDetailScreen} options={{ headerShown: false, title: 'RFQ' }} />
      <Stack.Screen name="CreateRfq" component={CreateRfqScreen} options={formSheetOptions(colors, 'Raise RFQ')} />
      <Stack.Screen name="BoqDetail" component={BoqDetailScreen} options={{ headerShown: false, title: 'Quotation' }} />
      <Stack.Screen
        name="CreatePurchaseOrder"
        component={CreatePurchaseOrderScreen}
        options={formSheetOptions(colors, 'New purchase order')}
      />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ headerShown: false, title: 'Task' }} />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={formSheetOptions(colors, 'New task')}
      />
    </Stack.Navigator>
  )
}
