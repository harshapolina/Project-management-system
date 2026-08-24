import { createDrawerNavigator } from '@react-navigation/drawer'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { HomeNavigator } from './HomeNavigator'
import { ProjectNavigator } from './ProjectNavigator'
import { InboxNavigator } from './InboxNavigator'
import { MoreNavigator } from './MoreNavigator'
import { GlassyTabBar } from '../components/GlassyTabBar'
import { AppDrawerContent } from '../components/AppDrawerContent'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../utils/roles'
import { useColors } from '../theme/useColors'
import { useLiveSync } from '../hooks/useLiveSync'
import type { RootDrawerParamList, RootTabParamList } from './types'

const Tab = createBottomTabNavigator<RootTabParamList>()
const Drawer = createDrawerNavigator<RootDrawerParamList>()

function MainTabs() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  useLiveSync()

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

export function AppNavigator() {
  const colors = useColors()

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(15, 15, 15, 0.45)',
        drawerStyle: {
          width: 304,
          backgroundColor: colors.canvas,
        },
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
  )
}
