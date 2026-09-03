/** Client-side tenant feature gates (mirrors server/client tenantFeatures). */

export const TENANT_FEATURE_KEYS = [
  { key: 'projects', label: 'Projects & tasks' },
  { key: 'boq', label: 'BOQ / Quotes' },
  { key: 'procurement', label: 'Materials / procurement' },
  { key: 'site', label: 'Site updates' },
  { key: 'finance', label: 'Finance / revenue' },
  { key: 'leads', label: 'New enquiries / CRM' },
  { key: 'portfolio', label: 'Dashboard & reports' },
  { key: 'people', label: 'People & invites' },
  { key: 'impact', label: 'Impact points' },
  { key: 'inventory', label: 'Inventory' },
] as const

export type TenantFeatureKey = (typeof TENANT_FEATURE_KEYS)[number]['key']

export const SUBSCRIPTION_PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
] as const

export const PLAN_FEATURE_PRESETS: Record<'starter' | 'pro' | 'enterprise', Record<TenantFeatureKey, boolean>> = {
  starter: {
    projects: true,
    boq: false,
    procurement: false,
    site: true,
    finance: false,
    leads: false,
    portfolio: true,
    people: true,
    impact: false,
    inventory: false,
  },
  pro: {
    projects: true,
    boq: true,
    procurement: true,
    site: true,
    finance: true,
    leads: true,
    portfolio: true,
    people: true,
    impact: true,
    inventory: false,
  },
  enterprise: {
    projects: true,
    boq: true,
    procurement: true,
    site: true,
    finance: true,
    leads: true,
    portfolio: true,
    people: true,
    impact: true,
    inventory: true,
  },
}

export const PLAN_SEAT_DEFAULTS = {
  starter: 10,
  pro: 30,
  enterprise: 100,
} as const

export function defaultTenantFeatures(): Record<TenantFeatureKey, boolean> {
  return Object.fromEntries(TENANT_FEATURE_KEYS.map((f) => [f.key, true])) as Record<TenantFeatureKey, boolean>
}

export function normalizeTenantFeatures(raw?: Record<string, boolean> | null): Record<TenantFeatureKey, boolean> {
  const base = defaultTenantFeatures()
  if (!raw || typeof raw !== 'object') return base
  for (const { key } of TENANT_FEATURE_KEYS) {
    if (typeof raw[key] === 'boolean') base[key] = raw[key]
  }
  return base
}
