import { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileMainScreen } from '../screens/profile/ProfileMainScreen'
import { EditProfileScreen } from '../screens/profile/EditProfileScreen'
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen'
import { PeopleScreen } from '../screens/profile/PeopleScreen'
import { PersonAccessScreen } from '../screens/profile/PersonAccessScreen'
import { InvitePersonScreen } from '../screens/profile/InvitePersonScreen'
import { MailSettingsScreen } from '../screens/settings/MailSettingsScreen'
import { CreateCustomRoleScreen } from '../screens/profile/CreateCustomRoleScreen'
import { GoogleCalendarScreen } from '../screens/profile/GoogleCalendarScreen'
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
      <Stack.Screen
        name="GoogleCalendar"
        component={GoogleCalendarScreen}
        options={{ headerShown: false, title: 'Google Calendar' }}
      />
      <Stack.Screen
        name="CreateCustomRole"
        component={CreateCustomRoleScreen}
        options={formSheetOptions(colors, 'New custom role')}
      />
      <Stack.Screen
        name="MailSettings"
        component={MailSettingsScreen}
        options={{ headerShown: false, title: 'Email & alerts' }}
      />
    </Stack.Navigator>
  )
}
