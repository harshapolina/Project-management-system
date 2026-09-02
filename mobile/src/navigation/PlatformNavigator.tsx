import { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { PlatformOverviewScreen } from '../screens/platform/PlatformOverviewScreen'
import { PlatformCompaniesScreen } from '../screens/platform/PlatformCompaniesScreen'
import { PlatformSubscriptionsScreen } from '../screens/platform/PlatformSubscriptionsScreen'
import { PlatformUsersScreen } from '../screens/platform/PlatformUsersScreen'
import { PlatformFeaturesScreen } from '../screens/platform/PlatformFeaturesScreen'
import { PlatformSettingsScreen } from '../screens/platform/PlatformSettingsScreen'
import { TenantDetailScreen } from '../screens/platform/TenantDetailScreen'
import { CreateTenantScreen } from '../screens/admin/CreateTenantScreen'
import { formSheetOptions, stackScreenOptions } from './options'
import { useColors } from '../theme/useColors'
import type { PlatformStackParamList } from './types'

const Stack = createNativeStackNavigator<PlatformStackParamList>()

export function PlatformNavigator() {
  const colors = useColors()
  const options = useMemo(() => stackScreenOptions(colors), [colors])
  return (
    <Stack.Navigator screenOptions={options} initialRouteName="PlatformOverview">
      <Stack.Screen name="PlatformOverview" component={PlatformOverviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlatformCompanies" component={PlatformCompaniesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PlatformSubscriptions"
        component={PlatformSubscriptionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="PlatformUsers" component={PlatformUsersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlatformFeatures" component={PlatformFeaturesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlatformSettings" component={PlatformSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTenant" component={CreateTenantScreen} options={formSheetOptions(colors, 'New workspace')} />
    </Stack.Navigator>
  )
}
