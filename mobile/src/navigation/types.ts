import type { NavigatorScreenParams } from '@react-navigation/native'

export type AuthStackParamList = {
  Login: undefined
  ForgotPassword: undefined
}

/**
 * Screens mounted identically (same component, same route name) in both
 * ProjectStackParamList (reached from a project's workspace, projectId
 * pre-filled) and MoreStackParamList (reached from the top-level "More" hub,
 * projectId picked via ProjectPicker). Spread into both below so a screen's
 * internal `navigation.navigate('PurchaseOrders', …)` resolves correctly
 * regardless of which stack pushed it — a plain union of the two full param
 * lists wouldn't let TypeScript confirm these particular routes exist in
 * whichever stack is active.
 */
export type SharedOpsParamList = {
  SiteFeed: { projectId?: string; projectName?: string } | undefined
  PostSiteUpdate: { projectId?: string; projectName?: string } | undefined
  PurchaseOrders: { projectId?: string; projectName?: string } | undefined
  CreatePurchaseOrder: { projectId?: string; projectName?: string } | undefined
}

export type ProjectStackParamList = SharedOpsParamList & {
  ProjectsList: undefined
  ProjectOverview: { projectId: string; projectName?: string }
  ProjectTasks: { projectId: string; projectName?: string }
  ProjectFiles: { projectId: string; projectName?: string }
  ProjectTeam: { projectId: string; projectName?: string }
  ProjectNotes: { projectId: string; projectName?: string }
  TaskDetail: { taskId: string }
  CreateProject: undefined
  CreateTask: { projectId?: string; isPersonal?: boolean }
}

export type HomeStackParamList = {
  HomeMain: undefined
  TaskDetail: { taskId: string }
  CreateTask: { projectId?: string; isPersonal?: boolean }
}

export type InboxStackParamList = {
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

export type MoreStackParamList = SharedOpsParamList & {
  MoreMain: undefined
  Leads: undefined
  CreateLead: undefined
  BoqList: { projectId?: string; projectName?: string } | undefined
  BoqDetail: { quotationId: string }
  CreateBoq: { projectId?: string; projectName?: string } | undefined
  Vendors: undefined
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
  PlatformAdmin: undefined
  CreateTenant: undefined
  Impact: undefined
  ProfileHub: NavigatorScreenParams<ProfileStackParamList> | undefined
  Billing: undefined
  CreateInvoice: undefined
  Notifications: undefined
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
