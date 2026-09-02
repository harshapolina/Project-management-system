import { http } from './client'
import type { CustomRole, Role, User } from '../types/models'

export interface DirectoryUser {
  _id: string
  name: string
  email: string
  avatar?: string
  role: Role
  title?: string
  isActive?: boolean
  permissions?: Record<string, boolean>
}

export interface TeamMember {
  user: DirectoryUser & { effectivePermissions?: Record<string, boolean> }
  open: number
  overdue: number
  done: number
  timeSpent: number
}

export interface TeamSummary {
  totalMembers: number
  activeMembers: number
  members: TeamMember[]
}

export const adminApi = {
  users: () => http.get<{ success: true; users: DirectoryUser[] }>('/users').then((r) => r.data.users),

  teamSummary: () =>
    http.get<{ success: true; data: TeamSummary }>('/admin/team-summary').then((r) => r.data.data),

  invite: (payload: { email: string; name: string; role: Role }) =>
    http
      .post<{ success: true; user: User; inviteToken: string; tempPassword: string }>('/auth/invite', payload)
      .then((r) => r.data),

  updatePermissions: (id: string, payload: { permissions?: Record<string, boolean>; isActive?: boolean }) =>
    http
      .patch<{ success: true; user: DirectoryUser }>(`/admin/users/${id}/permissions`, payload)
      .then((r) => r.data.user),

  customRoles: () =>
    http
      .get<{ success: true; customRoles: CustomRole[] }>('/admin/custom-roles')
      .then((r) => r.data.customRoles),

  createCustomRole: (payload: {
    label: string
    basedOn: string
    permissions?: Record<string, boolean>
  }) =>
    http
      .post<{ success: true; role: CustomRole; customRoles: CustomRole[] }>('/admin/custom-roles', payload)
      .then((r) => r.data),

  resetPassword: (id: string) =>
    http
      .post<{ success: true; user: DirectoryUser; tempPassword: string }>(`/admin/users/${id}/reset-password`, {})
      .then((r) => r.data),
}
