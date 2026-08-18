import { useQuery } from '@tanstack/react-query'
import { api, useAuthStore } from '../lib/api'

export function usePlatformTenants() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['platform-tenants'],
    queryFn: () => api('/platform/tenants'),
    enabled: !!user?.isPlatformAdmin,
  })
}

export function usePlatformOverview() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['platform-overview'],
    queryFn: () => api('/platform/overview'),
    enabled: !!user?.isPlatformAdmin,
  })
}

export function computeTenantStats(tenants = []) {
  const active = tenants.filter((t) => t.status === 'active').length
  const trial = tenants.filter((t) => t.status === 'trial').length
  const suspended = tenants.filter((t) => t.status === 'suspended').length
  const cancelled = tenants.filter((t) => t.status === 'cancelled').length
  const seats = tenants.reduce((sum, t) => sum + (t.seatsUsed ?? 0), 0)
  const projects = tenants.reduce((sum, t) => sum + (t.projectCount ?? 0), 0)
  return { active, trial, suspended, cancelled, seats, projects }
}
