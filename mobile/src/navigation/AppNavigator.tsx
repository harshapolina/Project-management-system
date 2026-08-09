import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { HomeNavigator } from './HomeNavigator'
import { ProjectNavigator } from './ProjectNavigator'
import { InboxNavigator } from './InboxNavigator'
import { ImpactScreen } from '../screens/impact/ImpactScreen'
import { ProfileNavigator } from './ProfileNavigator'
import { colors } from '../constants/theme'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../utils/roles'
import type { RootTabParamList } from './types'

const Tab = createBottomTabNavigator<RootTabParamList>()

const ICONS: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Projects: 'briefcase',
  Impact: 'trophy',
  Inbox: 'mail',
  Profile: 'person',
}

export function AppNavigator() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textOnRailMuted,
        tabBarStyle: { backgroundColor: colors.rail, borderTopWidth: 0 },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name as keyof RootTabParamList] : `${ICONS[route.name as keyof RootTabParamList]}-outline` as any} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      {caps.projects ? <Tab.Screen name="Projects" component={ProjectNavigator} /> : null}
      {caps.impact ? <Tab.Screen name="Impact" component={ImpactScreen} options={{ title: 'Impact' }} /> : null}
      <Tab.Screen name="Inbox" component={InboxNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  )
}
