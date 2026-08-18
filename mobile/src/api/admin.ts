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
}

export const adminApi = {
  users: () => http.get<{ success: true; users: DirectoryUser[] }>('/users').then((r) => r.data.users),

  invite: (payload: { email: string; name: string; role: Role }) =>
    http
      .post<{ success: true; user: User; inviteToken: string; tempPassword: string }>('/auth/invite', payload)
      .then((r) => r.data),
}
