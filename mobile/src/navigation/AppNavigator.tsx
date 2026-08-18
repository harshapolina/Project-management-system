import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { HomeNavigator } from './HomeNavigator'
import { ProjectNavigator } from './ProjectNavigator'
import { InboxNavigator } from './InboxNavigator'
import { MoreNavigator } from './MoreNavigator'
import { GlassyTabBar } from '../components/GlassyTabBar'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../utils/roles'
import type { RootTabParamList } from './types'

const Tab = createBottomTabNavigator<RootTabParamList>()

export function AppNavigator() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  return (
    <Tab.Navigator
      tabBar={(props) => <GlassyTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      {caps.projects ? <Tab.Screen name="Projects" component={ProjectNavigator} /> : null}
      <Tab.Screen name="Inbox" component={InboxNavigator} />
      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  )
}
