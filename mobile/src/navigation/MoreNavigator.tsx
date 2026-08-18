import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MoreMainScreen } from '../screens/more/MoreMainScreen'
import { LeadsScreen } from '../screens/leads/LeadsScreen'
import { CreateLeadScreen } from '../screens/leads/CreateLeadScreen'
import { BoqListScreen } from '../screens/boq/BoqListScreen'
import { BoqDetailScreen } from '../screens/boq/BoqDetailScreen'
import { CreateBoqScreen } from '../screens/boq/CreateBoqScreen'
import { VendorsScreen } from '../screens/procurement/VendorsScreen'
import { CreateVendorScreen } from '../screens/procurement/CreateVendorScreen'
import { PurchaseOrdersScreen } from '../screens/procurement/PurchaseOrdersScreen'
import { CreatePurchaseOrderScreen } from '../screens/procurement/CreatePurchaseOrderScreen'
import { FinanceScreen } from '../screens/finance/FinanceScreen'
import { CreateExpenseScreen } from '../screens/finance/CreateExpenseScreen'
import { SiteFeedScreen } from '../screens/sitefeed/SiteFeedScreen'
import { PostSiteUpdateScreen } from '../screens/sitefeed/PostSiteUpdateScreen'
import { SnagsScreen } from '../screens/sitefeed/SnagsScreen'
import { CreateSnagScreen } from '../screens/sitefeed/CreateSnagScreen'
import { ReportsScreen } from '../screens/reports/ReportsScreen'
import { PortfolioScreen } from '../screens/reports/PortfolioScreen'
import { InventoryScreen } from '../screens/inventory/InventoryScreen'
import { InventoryMovementsScreen } from '../screens/inventory/InventoryMovementsScreen'
import { CompanyAdminDashboardScreen } from '../screens/admin/CompanyAdminDashboardScreen'
import { PlatformAdminScreen } from '../screens/admin/PlatformAdminScreen'
import { CreateTenantScreen } from '../screens/admin/CreateTenantScreen'
import { colors } from '../constants/theme'
import type { MoreStackParamList } from './types'

const Stack = createNativeStackNavigator<MoreStackParamList>()

export function MoreNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="MoreMain" component={MoreMainScreen} options={{ title: 'More' }} />

      <Stack.Screen name="Leads" component={LeadsScreen} options={{ title: 'Leads' }} />
      <Stack.Screen name="CreateLead" component={CreateLeadScreen} options={{ presentation: 'modal', title: 'New lead' }} />

      <Stack.Screen name="BoqList" component={BoqListScreen} options={{ title: 'BOQ / Quotes' }} />
      <Stack.Screen name="BoqDetail" component={BoqDetailScreen} options={{ title: 'Quotation' }} />
      <Stack.Screen name="CreateBoq" component={CreateBoqScreen} options={{ presentation: 'modal', title: 'New quotation' }} />

      <Stack.Screen name="Vendors" component={VendorsScreen} options={{ title: 'Vendors' }} />
      <Stack.Screen name="CreateVendor" component={CreateVendorScreen} options={{ presentation: 'modal', title: 'New vendor' }} />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ title: 'Purchase Orders' }} />
      <Stack.Screen
        name="CreatePurchaseOrder"
        component={CreatePurchaseOrderScreen}
        options={{ presentation: 'modal', title: 'New purchase order' }}
      />

      <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: 'Finance' }} />
      <Stack.Screen name="CreateExpense" component={CreateExpenseScreen} options={{ presentation: 'modal', title: 'New expense' }} />

      <Stack.Screen name="SiteFeed" component={SiteFeedScreen} options={{ title: 'Site Feed' }} />
      <Stack.Screen
        name="PostSiteUpdate"
        component={PostSiteUpdateScreen}
        options={{ presentation: 'modal', title: 'Post update' }}
      />
      <Stack.Screen name="Snags" component={SnagsScreen} options={{ title: 'Snags' }} />
      <Stack.Screen name="CreateSnag" component={CreateSnagScreen} options={{ presentation: 'modal', title: 'Log snag' }} />

      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />

      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <Stack.Screen name="InventoryMovements" component={InventoryMovementsScreen} options={{ title: 'Stock Movements' }} />

      <Stack.Screen
        name="CompanyAdminDashboard"
        component={CompanyAdminDashboardScreen}
        options={{ title: 'Company Dashboard' }}
      />
      <Stack.Screen name="PlatformAdmin" component={PlatformAdminScreen} options={{ title: 'Workspaces' }} />
      <Stack.Screen name="CreateTenant" component={CreateTenantScreen} options={{ presentation: 'modal', title: 'New workspace' }} />
    </Stack.Navigator>
  )
}
