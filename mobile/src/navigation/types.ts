export type AuthStackParamList = {
  Login: undefined
  ForgotPassword: undefined
}

export type ProjectStackParamList = {
  ProjectsList: undefined
  ProjectOverview: { projectId: string; projectName?: string }
  ProjectTasks: { projectId: string; projectName?: string }
  ProjectFiles: { projectId: string; projectName?: string }
  ProjectTeam: { projectId: string; projectName?: string }
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
  InvitePerson: undefined
}

export type RootTabParamList = {
  Home: undefined
  Projects: undefined
  Impact: undefined
  Inbox: undefined
  Profile: undefined
}
