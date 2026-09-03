import { http } from './client'
import type { Tenant } from '../types/ops'
import type { User } from '../types/models'

export interface CreateTenantPayload {
  name: string
  slug: string
  seatLimit?: number
  adminLimit?: number
  status?: 'trial' | 'active' | 'suspended'
  notes?: string
  adminName: string
  adminEmail: string
  adminPassword?: string
}

export interface PlatformOverview {
  companies: number
  totalUsers: number
  activeUsers: number
  totalProjects: number
  seatsUsed: number
  byStatus: Record<string, number>
  byPlan: Record<string, number>
  recentCompanies: Tenant[]
}

export interface PlatformUser extends User {
  workspace?: string
  companyName?: string
  isActive?: boolean
}

export interface UpdateTenantPayload {
  name?: string
  seatLimit?: number
  adminLimit?: number
  status?: 'trial' | 'active' | 'suspended' | 'cancelled'
  subscriptionPlan?: 'starter' | 'pro' | 'enterprise'
  features?: Record<string, boolean>
  notes?: string
  brandColor?: string
  notice?: {
    active?: boolean
    title?: string
    message?: string
    variant?: 'info' | 'warning' | 'urgent'
    dismissible?: boolean
    blocking?: boolean
  }
}

export const platformApi = {
  overview: () =>
    http.get<{ success: true; overview: PlatformOverview }>('/platform/overview').then((r) => r.data.overview),

  users: (q?: string) =>
    http
      .get<{ success: true; users: PlatformUser[] }>('/platform/users', { params: q ? { q } : undefined })
      .then((r) => r.data.users),

  tenants: () => http.get<{ success: true; tenants: Tenant[] }>('/platform/tenants').then((r) => r.data.tenants),

  getTenant: (id: string) =>
    http.get<{ success: true; tenant: Tenant }>(`/platform/tenants/${id}`).then((r) => r.data.tenant),

  createTenant: (payload: CreateTenantPayload) =>
    http
      .post<{ success: true; tenant: Tenant; admin: User; tempPassword: string; loginHint: string }>(
        '/platform/tenants',
        payload,
      )
      .then((r) => r.data),

  updateTenant: (id: string, payload: UpdateTenantPayload) =>
    http.patch<{ success: true; tenant: Tenant }>(`/platform/tenants/${id}`, payload).then((r) => r.data.tenant),

  cancelSubscription: (id: string) =>
    http
      .post<{ success: true; tenant: Tenant; message: string }>(`/platform/tenants/${id}/cancel-subscription`)
      .then((r) => r.data),

  reactivateSubscription: (id: string) =>
    http
      .post<{ success: true; tenant: Tenant; message: string }>(`/platform/tenants/${id}/reactivate-subscription`)
      .then((r) => r.data),

  uploadLogo: async (id: string, file: { uri: string; name: string; mimeType?: string }) => {
    const form = new FormData()
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'image/jpeg' } as unknown as Blob)
    return http
      .post<{ success: true; logoUrl: string; tenant: Tenant }>(`/platform/tenants/${id}/logo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  removeLogo: (id: string) =>
    http.delete<{ success: true; logoUrl: string; tenant: Tenant }>(`/platform/tenants/${id}/logo`).then((r) => r.data),

  tenantUsers: (id: string) =>
    http
      .get<{ success: true; users: User[]; seatLimit: number; adminLimit: number; adminsUsed: number }>(
        `/platform/tenants/${id}/users`,
      )
      .then((r) => r.data),

  inviteTenantUser: (
    id: string,
    payload: { name: string; email: string; role: string; password?: string },
  ) =>
    http
      .post<{ success: true; user: User; tempPassword: string }>(`/platform/tenants/${id}/users`, payload)
      .then((r) => r.data),

  updateTenantUser: (tenantId: string, userId: string, payload: Partial<User>) =>
    http
      .patch<{ success: true; user: User }>(`/platform/tenants/${tenantId}/users/${userId}`, payload)
      .then((r) => r.data.user),

  resetTenantUserPassword: (tenantId: string, userId: string) =>
    http
      .post<{ success: true; tempPassword: string }>(`/platform/tenants/${tenantId}/users/${userId}/reset-password`)
      .then((r) => r.data),
}
