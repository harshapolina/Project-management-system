import { http } from './client'
import type { CompanyAdminDashboard } from '../types/ops'

export const companyAdminApi = {
  dashboard: (range: '30d' | '90d' | '12m' | 'all' = '30d') =>
    http
      .get<{ success: true; data: CompanyAdminDashboard }>('/company-admin/dashboard', { params: { range } })
      .then((r) => r.data.data),
}
