import { ScrollView, StyleSheet } from 'react-native'
import { Screen } from '../../components/Screen'
import { NavRow, NavSection } from '../../components/NavRow'
import { PageHeader } from '../../components/PageHeader'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { spacing } from '../../constants/theme'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreMain'>

export function MoreMainScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const anySales = caps.leads || caps.boq
  const anyOps = caps.procurement || caps.finance
  const anySite = caps.siteFeed
  const anyInsights = caps.portfolio
  const anyCompany = caps.companyAdmin
  const anyPlatform = caps.platform

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <PageHeader title="More" subtitle="Account, tools, and company." />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <NavSection title="You">
          <NavRow
            icon="person-outline"
            label="Profile"
            hint="Account, password, people"
            tone={0}
            onPress={() => navigation.navigate('ProfileHub')}
          />
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
        </NavSection>
        {anySales ? (
          <NavSection title="Sales">
            {caps.leads ? (
              <NavRow
                icon="people-outline"
                label="New enquiries"
                hint="Assign and follow up"
                tone={0}
                onPress={() => navigation.navigate('Leads')}
              />
            ) : null}
            {caps.boq ? (
              <NavRow
                icon="document-text-outline"
                label="BOQ / Quotes"
                hint="Estimates and versions"
                tone={4}
                onPress={() => navigation.navigate('BoqList', undefined)}
              />
            ) : null}
          </NavSection>
        ) : null}

        {anyOps ? (
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
                  onPress={() => navigation.navigate('Billing')}
                />
              </>
            ) : null}
          </NavSection>
        ) : null}

        {anySite ? (
          <NavSection title="Site">
            <NavRow
              icon="camera-outline"
              label="Site updates"
              hint="Photos and daily logs"
              tone={2}
              onPress={() => navigation.navigate('SiteFeed', undefined)}
            />
            <NavRow
              icon="alert-circle-outline"
              label="Snags"
              hint="Issues to fix"
              tone={5}
              onPress={() => navigation.navigate('Snags', undefined)}
            />
          </NavSection>
        ) : null}

        {anyInsights ? (
          <NavSection title="Insights">
            {caps.reports ? (
              <NavRow
                icon="bar-chart-outline"
                label="Reports"
                hint="Progress snapshot"
                tone={3}
                onPress={() => navigation.navigate('Reports')}
              />
            ) : null}
            <NavRow
              icon="grid-outline"
              label="Portfolio"
              hint="All live work"
              tone={0}
              onPress={() => navigation.navigate('Portfolio')}
            />
          </NavSection>
        ) : null}

        {anyCompany || caps.inventory || caps.people ? (
          <NavSection title="Company">
            {caps.companyAdmin ? (
              <NavRow
                icon="stats-chart-outline"
                label="Company dashboard"
                hint="Team overview"
                tone={0}
                onPress={() => navigation.navigate('CompanyAdminDashboard')}
              />
            ) : null}
            {caps.people ? (
              <NavRow
                icon="people-outline"
                label="People"
                hint="Team and access"
                tone={1}
                onPress={() => navigation.navigate('ProfileHub', { screen: 'People' })}
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
                  onPress={() => navigation.navigate('InventoryMovements')}
                />
              </>
            ) : null}
          </NavSection>
        ) : null}

        {anyPlatform ? (
          <NavSection title="Platform">
            <NavRow
              icon="server-outline"
              label="Workspaces"
              hint="Companies on Cubic"
              tone={3}
              onPress={() => navigation.navigate('PlatformAdmin')}
            />
          </NavSection>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
})
