import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileMainScreen } from '../screens/profile/ProfileMainScreen'
import { EditProfileScreen } from '../screens/profile/EditProfileScreen'
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen'
import { PeopleScreen } from '../screens/profile/PeopleScreen'
import { PersonAccessScreen } from '../screens/profile/PersonAccessScreen'
import { InvitePersonScreen } from '../screens/profile/InvitePersonScreen'
import { stackScreenOptions } from './options'
import type { ProfileStackParamList } from './types'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileMainScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
      <Stack.Screen name="People" component={PeopleScreen} options={{ title: 'People' }} />
      <Stack.Screen name="PersonAccess" component={PersonAccessScreen} options={{ title: 'Access' }} />
      <Stack.Screen
        name="InvitePerson"
        component={InvitePersonScreen}
        options={{ presentation: 'modal', title: 'Invite teammate' }}
      />
    </Stack.Navigator>
  )
}
