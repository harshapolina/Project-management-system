import { useMemo } from 'react'
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
import { CreateInventoryItemScreen } from '../screens/inventory/CreateInventoryItemScreen'
import { InventoryMovementsScreen } from '../screens/inventory/InventoryMovementsScreen'
import { CompanyAdminDashboardScreen } from '../screens/admin/CompanyAdminDashboardScreen'
import { PlatformAdminScreen } from '../screens/admin/PlatformAdminScreen'
import { CreateTenantScreen } from '../screens/admin/CreateTenantScreen'
import { ImpactScreen } from '../screens/impact/ImpactScreen'
import { ProfileNavigator } from './ProfileNavigator'
import { BillingScreen } from '../screens/billing/BillingScreen'
import { CreateInvoiceScreen } from '../screens/billing/CreateInvoiceScreen'
import { NotificationsScreen } from '../screens/inbox/NotificationsScreen'
import { formSheetOptions, stackScreenOptions } from './options'
import { useColors } from '../theme/useColors'
import type { MoreStackParamList } from './types'

const Stack = createNativeStackNavigator<MoreStackParamList>()

export function MoreNavigator() {
  const colors = useColors()
  const options = useMemo(() => stackScreenOptions(colors), [colors])
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="MoreMain" component={MoreMainScreen} options={{ headerShown: false }} />

      <Stack.Screen name="Leads" component={LeadsScreen} options={{ headerShown: false, title: 'New enquiries' }} />
      <Stack.Screen name="CreateLead" component={CreateLeadScreen} options={formSheetOptions(colors, 'New enquiry')} />

      <Stack.Screen name="BoqList" component={BoqListScreen} options={{ headerShown: false, title: 'BOQ / Quotes' }} />
      <Stack.Screen name="BoqDetail" component={BoqDetailScreen} options={{ headerShown: false, title: 'Quotation' }} />
      <Stack.Screen name="CreateBoq" component={CreateBoqScreen} options={formSheetOptions(colors, 'New quotation')} />

      <Stack.Screen name="Vendors" component={VendorsScreen} options={{ headerShown: false, title: 'Vendors' }} />
      <Stack.Screen name="CreateVendor" component={CreateVendorScreen} options={formSheetOptions(colors, 'New vendor')} />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ headerShown: false, title: 'Purchase Orders' }} />
      <Stack.Screen
        name="CreatePurchaseOrder"
        component={CreatePurchaseOrderScreen}
        options={formSheetOptions(colors, 'New purchase order')}
      />

      <Stack.Screen name="Finance" component={FinanceScreen} options={{ headerShown: false, title: 'Finance' }} />
      <Stack.Screen name="CreateExpense" component={CreateExpenseScreen} options={formSheetOptions(colors, 'New expense')} />

      <Stack.Screen name="SiteFeed" component={SiteFeedScreen} options={{ headerShown: false, title: 'Site Feed' }} />
      <Stack.Screen
        name="PostSiteUpdate"
        component={PostSiteUpdateScreen}
        options={formSheetOptions(colors, 'Post update')}
      />
      <Stack.Screen name="Snags" component={SnagsScreen} options={{ headerShown: false, title: 'Snags' }} />
      <Stack.Screen name="CreateSnag" component={CreateSnagScreen} options={formSheetOptions(colors, 'Log snag')} />

      <Stack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: false, title: 'Reports' }} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ headerShown: false, title: 'Portfolio' }} />

      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ headerShown: false, title: 'Inventory' }} />
      <Stack.Screen
        name="CreateInventoryItem"
        component={CreateInventoryItemScreen}
        options={formSheetOptions(colors, 'New item')}
      />
      <Stack.Screen name="InventoryMovements" component={InventoryMovementsScreen} options={{ headerShown: false, title: 'Stock Movements' }} />

      <Stack.Screen
        name="CompanyAdminDashboard"
        component={CompanyAdminDashboardScreen}
        options={{ headerShown: false, title: 'Company Dashboard' }}
      />
      <Stack.Screen name="PlatformAdmin" component={PlatformAdminScreen} options={{ headerShown: false, title: 'Workspaces' }} />
      <Stack.Screen name="CreateTenant" component={CreateTenantScreen} options={formSheetOptions(colors, 'New workspace')} />
      <Stack.Screen name="Impact" component={ImpactScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileHub" component={ProfileNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ headerShown: false, title: 'Billing' }} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={formSheetOptions(colors, 'Add invoice')} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false, title: 'Alerts' }} />
    </Stack.Navigator>
  )
}
