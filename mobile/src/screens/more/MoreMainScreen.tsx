import { Alert, ScrollView } from 'react-native'
import { Screen } from '../../components/Screen'
import { NavRow, NavSection } from '../../components/NavRow'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { useColors, useThemeMode } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreMain'>

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'MoreMain'>,
  BottomTabNavigationProp<RootTabParamList>
>

export function MoreMainScreen({ navigation }: Props) {
  useColors()
  const theme = useThemeMode()
  const setTheme = useUiStore((s) => s.setTheme)
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const logout = useAuthStore((s) => s.logout)
  const caps = capabilitiesForUser(user)
  const { tabListContent } = useResponsive()
  const tabNav = navigation as unknown as Nav

  const goTab = (tab: keyof RootTabParamList) => {
    tabNav.navigate(tab)
  }

  const doLogout = () => {
    Alert.alert('Log out', 'You’ll need to sign in again to see your work.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout(refreshToken)
          } finally {
            logout()
          }
        },
      },
    ])
  }

  return (
    <Screen padded={false} edges={['left', 'right']}>
      <AppNavBar />
      <PageHeader
        title="More"
        subtitle="Account, tools, and company"
        subtitleIcon="grid-outline"
      />
      <ScrollView contentContainerStyle={tabListContent} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <NavSection title="You">
          <NavRow
            icon="person-outline"
            label="Profile"
            hint="Account, password, appearance"
            tone={0}
            onPress={() => navigation.navigate('ProfileHub')}
          />
          {caps.myWork ? (
            <NavRow
              icon="checkbox-outline"
              label="My work"
              hint="Tasks assigned to you"
              tone={1}
              onPress={() => goTab('Home')}
            />
          ) : null}
          {caps.projects ? (
            <NavRow
              icon="folder-outline"
              label="Projects"
              hint="All live workspaces"
              tone={3}
              onPress={() => goTab('Projects')}
            />
          ) : null}
          {caps.impact ? (
            <NavRow
              icon="trophy-outline"
              label="Impact"
              hint="Points and badges"
              tone={2}
              onPress={() => navigation.navigate('Impact')}
            />
          ) : null}
          <NavRow
            icon="notifications-outline"
            label="Alerts"
            hint="Assignments and mentions"
            tone={4}
            onPress={() => navigation.navigate('Notifications')}
          />
          <NavRow
            icon="chatbox-ellipses-outline"
            label="Assigned comments"
            hint="Comments waiting on you"
            tone={2}
            onPress={() => navigation.navigate('AssignedComments')}
          />
          <NavRow
            icon="chatbubbles-outline"
            label="Messages"
            hint="Team inbox"
            tone={0}
            last
            onPress={() => goTab('Inbox')}
          />
        </NavSection>

        {/* Sales */}
        {caps.leads || caps.boq ? (
          <NavSection title="Sales">
            {caps.leads ? (
              <NavRow
                icon="briefcase-outline"
                label="New enquiries"
                hint="Assign and follow up"
                tone={0}
                last={!caps.boq}
                onPress={() => navigation.navigate('Leads')}
              />
            ) : null}
            {caps.boq ? (
              <NavRow
                icon="document-text-outline"
                label="BOQ / Quotes"
                hint="Estimates and versions"
                tone={4}
                last
                onPress={() => navigation.navigate('BoqList', undefined)}
              />
            ) : null}
          </NavSection>
        ) : null}

        {/* Operations */}
        {caps.procurement || caps.finance ? (
          <NavSection title="Operations">
            {caps.procurement ? (
              <>
                <NavRow
                  icon="business-outline"
                  label="Vendors"
                  hint="Supplier directory"
                  tone={1}
                  onPress={() => navigation.navigate('Vendors')}
                />
                <NavRow
                  icon="cart-outline"
                  label="Purchase orders"
                  hint="Material orders"
                  tone={2}
                  last={!caps.finance}
                  onPress={() => navigation.navigate('PurchaseOrders', undefined)}
                />
              </>
            ) : null}
            {caps.finance ? (
              <>
                <NavRow
                  icon="wallet-outline"
                  label="Revenue"
                  hint="Expenses and payments"
                  tone={5}
                  onPress={() => navigation.navigate('Finance')}
                />
                <NavRow
                  icon="receipt-outline"
                  label="Billing"
                  hint="Vendor invoices"
                  tone={2}
                  last
                  onPress={() => navigation.navigate('Billing')}
                />
              </>
            ) : null}
          </NavSection>
        ) : null}

        {/* Site */}
        {caps.siteFeed ? (
          <NavSection title="Site">
            <NavRow
              icon="camera-outline"
              label="Site updates"
              hint="Photos and daily logs"
              tone={2}
              onPress={() => navigation.navigate('SiteFeed', undefined)}
            />
            <NavRow
              icon="add-circle-outline"
              label="Post update"
              hint="Share progress from the field"
              tone={1}
              onPress={() => navigation.navigate('PostSiteUpdate', undefined)}
            />
            <NavRow
              icon="alert-circle-outline"
              label="Snags"
              hint="Issues to fix"
              tone={5}
              last
              onPress={() => navigation.navigate('Snags', undefined)}
            />
          </NavSection>
        ) : null}

        {/* Insights */}
        {caps.portfolio || caps.reports ? (
          <NavSection title="Insights">
            {caps.portfolio ? (
              <NavRow
                icon="grid-outline"
                label="Portfolio"
                hint="All live work"
                tone={0}
                last={!caps.reports}
                onPress={() => navigation.navigate('Portfolio')}
              />
            ) : null}
            {caps.reports ? (
              <NavRow
                icon="bar-chart-outline"
                label="Reports"
                hint="Progress snapshot"
                tone={3}
                last
                onPress={() => navigation.navigate('Reports')}
              />
            ) : null}
          </NavSection>
        ) : null}

        {/* Company */}
        {caps.companyAdmin || caps.inventory || caps.people || caps.managePeople || caps.manageTasks ? (
          <NavSection title="Company">
            {caps.companyAdmin ? (
              <>
                <NavRow
                  icon="stats-chart-outline"
                  label="Company dashboard"
                  hint="Team overview"
                  tone={0}
                  onPress={() => navigation.navigate('CompanyAdminDashboard')}
                />
                <NavRow
                  icon="shield-checkmark-outline"
                  label="Approvals"
                  hint="Who signs off on what"
                  tone={2}
                  last={!caps.people && !caps.managePeople && !caps.inventory && !caps.manageTasks}
                  onPress={() => navigation.navigate('Approvals')}
                />
              </>
            ) : null}
            {caps.people || caps.managePeople ? (
              <NavRow
                icon="people-outline"
                label="People"
                hint="Team and access"
                tone={1}
                last={!caps.managePeople && !caps.inventory && !caps.manageTasks}
                onPress={() => navigation.navigate('ProfileHub', { screen: 'People' })}
              />
            ) : null}
            {caps.managePeople ? (
              <NavRow
                icon="person-add-outline"
                label="Invite teammate"
                hint="Add someone to this workspace"
                tone={0}
                last={!caps.inventory && !caps.manageTasks}
                onPress={() => navigation.navigate('ProfileHub', { screen: 'InvitePerson' })}
              />
            ) : null}
            {caps.inventory ? (
              <>
                <NavRow
                  icon="cube-outline"
                  label="Inventory"
                  hint="Stock on hand"
                  tone={1}
                  onPress={() => navigation.navigate('Inventory')}
                />
                <NavRow
                  icon="time-outline"
                  label="Stock log"
                  hint="In and out movements"
                  tone={4}
                  last={!caps.manageTasks}
                  onPress={() => navigation.navigate('InventoryMovements')}
                />
              </>
            ) : null}
            {caps.manageTasks ? (
              <NavRow
                icon="options-outline"
                label="Custom fields"
                hint="Extra fields on tasks"
                tone={2}
                last
                onPress={() => navigation.navigate('CustomFields')}
              />
            ) : null}
          </NavSection>
        ) : null}

        {/* Platform */}
        {caps.platform ? (
          <NavSection title="Platform">
            <NavRow
              icon="server-outline"
              label="Workspaces"
              hint="Companies on Cubic"
              tone={3}
              onPress={() => navigation.navigate('PlatformAdmin')}
            />
            <NavRow
              icon="add-outline"
              label="New workspace"
              hint="Create a tenant"
              tone={0}
              last
              onPress={() => navigation.navigate('CreateTenant')}
            />
          </NavSection>
        ) : null}

        {/* Preferences */}
        <NavSection title="Preferences">
          <NavRow
            icon={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
            label="Appearance"
            hint={theme === 'dark' ? 'Dark mode on' : 'Light mode on'}
            tone={2}
            onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <NavRow
            icon="log-out-outline"
            label="Log out"
            hint="Sign out of this device"
            tone={5}
            last
            onPress={doLogout}
          />
        </NavSection>
      </ScrollView>
    </Screen>
  )
}
