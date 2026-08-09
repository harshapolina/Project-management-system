import { http } from './client'
import type { Tenant } from '../types/ops'
import type { User } from '../types/models'

export interface CreateTenantPayload {
  name: string
  slug: string
  seatLimit?: number
  status?: 'trial' | 'active' | 'suspended'
  adminName: string
  adminEmail: string
}

export const platformApi = {
  tenants: () => http.get<{ success: true; tenants: Tenant[] }>('/platform/tenants').then((r) => r.data.tenants),

  createTenant: (payload: CreateTenantPayload) =>
    http
      .post<{ success: true; tenant: Tenant; admin: User; tempPassword: string; loginHint: string }>(
        '/platform/tenants',
        payload,
      )
      .then((r) => r.data),

  updateTenant: (id: string, payload: Partial<Pick<Tenant, 'name' | 'seatLimit' | 'status' | 'notes'>>) =>
    http.patch<{ success: true; tenant: Tenant }>(`/platform/tenants/${id}`, payload).then((r) => r.data.tenant),

  tenantUsers: (id: string) =>
    http
      .get<{ success: true; users: User[]; seatLimit: number }>(`/platform/tenants/${id}/users`)
      .then((r) => r.data),
}
