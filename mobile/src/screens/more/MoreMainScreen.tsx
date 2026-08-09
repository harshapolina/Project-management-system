import { ScrollView, StyleSheet, Text } from 'react-native'
import { Screen } from '../../components/Screen'
import { NavRow, NavSection } from '../../components/NavRow'
import { colors, spacing, typography } from '../../constants/theme'
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

  if (!anySales && !anyOps && !anySite && !anyInsights && !anyCompany && !anyPlatform) {
    return (
      <Screen>
        <Text style={styles.emptyText}>Nothing here yet for your role.</Text>
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>More</Text>

        {anySales ? (
          <NavSection title="Sales">
            {caps.leads ? (
              <NavRow icon="people-outline" label="Leads" onPress={() => navigation.navigate('Leads')} />
            ) : null}
            {caps.boq ? (
              <NavRow icon="document-text-outline" label="BOQ / Quotes" onPress={() => navigation.navigate('BoqList', undefined)} />
            ) : null}
          </NavSection>
        ) : null}

        {anyOps ? (
          <NavSection title="Operations">
            {caps.procurement ? (
              <>
                <NavRow icon="business-outline" label="Vendors" onPress={() => navigation.navigate('Vendors')} />
                <NavRow icon="cart-outline" label="Purchase Orders" onPress={() => navigation.navigate('PurchaseOrders', undefined)} />
              </>
            ) : null}
            {caps.finance ? <NavRow icon="cash-outline" label="Finance" onPress={() => navigation.navigate('Finance')} /> : null}
          </NavSection>
        ) : null}

        {anySite ? (
          <NavSection title="Site">
            <NavRow icon="camera-outline" label="Site Feed" onPress={() => navigation.navigate('SiteFeed', undefined)} />
            <NavRow icon="alert-circle-outline" label="Snags" onPress={() => navigation.navigate('Snags', undefined)} />
          </NavSection>
        ) : null}

        {anyInsights ? (
          <NavSection title="Insights">
            <NavRow icon="bar-chart-outline" label="Reports" onPress={() => navigation.navigate('Reports')} />
            <NavRow icon="grid-outline" label="Portfolio" onPress={() => navigation.navigate('Portfolio')} />
          </NavSection>
        ) : null}

        {anyCompany ? (
          <NavSection title="Company">
            <NavRow icon="stats-chart-outline" label="Company Dashboard" onPress={() => navigation.navigate('CompanyAdminDashboard')} />
            <NavRow icon="cube-outline" label="Inventory" onPress={() => navigation.navigate('Inventory')} />
            <NavRow icon="time-outline" label="Stock Movements" onPress={() => navigation.navigate('InventoryMovements')} />
          </NavSection>
        ) : null}

        {anyPlatform ? (
          <NavSection title="Platform">
            <NavRow icon="server-outline" label="Workspaces" onPress={() => navigation.navigate('PlatformAdmin')} />
          </NavSection>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  heading: { ...typography.h2, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
})
