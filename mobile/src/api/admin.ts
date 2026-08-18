import { http } from './client'
import type { Role, User } from '../types/models'

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

  resetPassword: (id: string) =>
    http
      .post<{ success: true; user: DirectoryUser; tempPassword: string }>(`/admin/users/${id}/reset-password`, {})
      .then((r) => r.data),
}
