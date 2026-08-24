import { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileMainScreen } from '../screens/profile/ProfileMainScreen'
import { EditProfileScreen } from '../screens/profile/EditProfileScreen'
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen'
import { PeopleScreen } from '../screens/profile/PeopleScreen'
import { PersonAccessScreen } from '../screens/profile/PersonAccessScreen'
import { InvitePersonScreen } from '../screens/profile/InvitePersonScreen'
import { formSheetOptions, stackScreenOptions } from './options'
import { useColors } from '../theme/useColors'
import type { ProfileStackParamList } from './types'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  const colors = useColors()
  const options = useMemo(() => stackScreenOptions(colors), [colors])
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="ProfileMain" component={ProfileMainScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false, title: 'Edit profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false, title: 'Change password' }} />
      <Stack.Screen name="People" component={PeopleScreen} options={{ headerShown: false, title: 'People' }} />
      <Stack.Screen name="PersonAccess" component={PersonAccessScreen} options={{ headerShown: false, title: 'Access' }} />
      <Stack.Screen
        name="InvitePerson"
        component={InvitePersonScreen}
        options={formSheetOptions(colors, 'Invite teammate')}
      />
    </Stack.Navigator>
  )
}
