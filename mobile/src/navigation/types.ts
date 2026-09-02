import type { NavigatorScreenParams } from '@react-navigation/native'
import type { MyWorkView } from '../components/ViewPills'
import type { ProcurementTab } from '../components/ProcurementTabs'

export type AuthStackParamList = {
  Login: undefined
  ForgotPassword: undefined
  Register: undefined
}

export type SharedOpsParamList = {
  SiteFeed: { projectId?: string; projectName?: string } | undefined
  PostSiteUpdate: { projectId?: string; projectName?: string } | undefined
  PurchaseOrders: { projectId?: string; projectName?: string } | undefined
  CreatePurchaseOrder: { projectId?: string; projectName?: string } | undefined
  PurchaseOrderDetail: { poId: string }
  RfqPanel: { projectId: string; projectName?: string }
  RfqDetail: { rfqId: string }
  CreateRfq: { projectId: string; projectName?: string; quotationId?: string }
}

export type ProjectStackParamList = SharedOpsParamList & {
  ProjectsList: undefined
  ProjectOverview: { projectId: string; projectName?: string }
  ProjectTasks: { projectId: string; projectName?: string }
  ProjectFiles: { projectId: string; projectName?: string }
  ProjectTeam: { projectId: string; projectName?: string }
  ProjectNotes: { projectId: string; projectName?: string }
  EditProject: { projectId: string; projectName?: string }
  TaskDetail: { taskId: string }
  CreateProject: undefined
  CreateTask: { projectId?: string; isPersonal?: boolean }
  BoqDetail: { quotationId: string }
}

export type HomeStackParamList = {
  HomeMain: { view?: MyWorkView } | undefined
  TaskDetail: { taskId: string }
  CreateTask: { projectId?: string; isPersonal?: boolean }
  SiteSupervisor: undefined
}

export type InboxStackParamList = {
  InboxHub: { tab?: 'primary' | 'mail' | 'later' | 'cleared' } | undefined
  Threads: undefined
  Conversation: { userId: string; userName: string }
  NewMessage: undefined
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  EditProfile: undefined
  ChangePassword: undefined
  People: undefined
  PersonAccess: { userId: string }
  InvitePerson: undefined
}

export type PlatformStackParamList = {
  PlatformOverview: undefined
  PlatformCompanies: undefined
  PlatformSubscriptions: undefined
  PlatformUsers: undefined
  PlatformFeatures: undefined
  PlatformSettings: undefined
  TenantDetail: { tenantId: string }
  CreateTenant: undefined
}

export type MoreStackParamList = SharedOpsParamList & {
  MoreMain: undefined
  Leads: undefined
  LeadDetail: { leadId: string }
  CreateLead: undefined
  BoqList: { projectId?: string; projectName?: string } | undefined
  BoqDetail: { quotationId: string }
  BoqMeasurement: { quotationId: string }
  CreateBoq: { projectId?: string; projectName?: string } | undefined
  MaterialsHub: { tab?: ProcurementTab } | undefined
  Vendors: undefined
  VendorDetail: { vendorId: string }
  EditVendor: { vendorId: string }
  CreateVendor: undefined
  Finance: undefined
  CreateExpense: { projectId?: string; projectName?: string } | undefined
  Snags: { projectId?: string; projectName?: string } | undefined
  CreateSnag: { projectId?: string; projectName?: string } | undefined
  Reports: undefined
  Portfolio: undefined
  Inventory: undefined
  CreateInventoryItem: undefined
  InventoryMovements: undefined
  CompanyAdminDashboard: undefined
  PlatformAdmin: NavigatorScreenParams<PlatformStackParamList> | undefined
  Impact: undefined
  ProfileHub: NavigatorScreenParams<ProfileStackParamList> | undefined
  Billing: undefined
  InvoiceDetail: { invoiceId: string }
  CreateInvoice: undefined
  Notifications: undefined
  AssignedComments: undefined
  CustomFields: undefined
  Approvals: undefined
  CreateApprovalRule: { entityType: string; typeLabel: string; hasAmount: boolean }
  CreateApprovalType: undefined
  Docs: undefined
  SiteSupervisor: undefined
  TaskDetail: { taskId: string }
}

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined
  Projects: NavigatorScreenParams<ProjectStackParamList> | undefined
  Inbox: NavigatorScreenParams<InboxStackParamList> | undefined
  More: NavigatorScreenParams<MoreStackParamList> | undefined
}

export type RootDrawerParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined
}

export type MobileHomeTarget =
  | { tab: 'Home'; screen: keyof HomeStackParamList; params?: object }
  | { tab: 'More'; screen: keyof MoreStackParamList; params?: object }
  | { tab: 'Projects'; screen: keyof ProjectStackParamList; params?: object }
