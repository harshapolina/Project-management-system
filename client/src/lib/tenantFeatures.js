/** Client-side tenant feature gates (mirrors server/src/lib/tenantFeatures.js). */

export const TENANT_FEATURE_KEYS = [
  { key: 'projects', label: 'Projects & tasks', group: 'Core' },
  { key: 'boq', label: 'BOQ / Quotes', group: 'Modules' },
  { key: 'procurement', label: 'Materials / procurement', group: 'Modules' },
  { key: 'site', label: 'Site updates', group: 'Modules' },
  { key: 'finance', label: 'Finance / money', group: 'Modules' },
  { key: 'leads', label: 'New enquiries / CRM', group: 'Modules' },
  { key: 'portfolio', label: 'Dashboard & reports', group: 'Modules' },
  { key: 'people', label: 'People & invites', group: 'Company' },
  { key: 'impact', label: 'Impact points', group: 'Modules' },
  { key: 'inventory', label: 'Inventory', group: 'Modules' },
]

export const SUBSCRIPTION_PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function defaultTenantFeatures() {
  return Object.fromEntries(TENANT_FEATURE_KEYS.map((f) => [f.key, true]))
}

export function normalizeTenantFeatures(raw) {
  const base = defaultTenantFeatures()
  if (!raw || typeof raw !== 'object') return base
  for (const { key } of TENANT_FEATURE_KEYS) {
    if (typeof raw[key] === 'boolean') base[key] = raw[key]
  }
  return base
}

export function tenantHasFeature(tenant, key) {
  if (!tenant?.features) return true
  return normalizeTenantFeatures(tenant.features)[key] !== false
}

export function applyTenantFeatureLimitsToCapabilities(caps, tenant) {
  if (!tenant) return caps
  const features = normalizeTenantFeatures(tenant.features)
  const next = { ...caps }
  if (features.projects === false) {
    next.projects = false
    next.myWork = false
    next.createProject = false
    next.manageProjects = false
    next.createTask = false
    next.manageTasks = false
    next.manageFiles = false
    next.projectTabs = {
      overview: false,
      tasks: false,
      procurement: false,
      site: false,
      files: false,
      team: false,
    }
  }
  if (features.boq === false) next.boq = false
  if (features.procurement === false) {
    next.procurement = false
    next.projectTabs = { ...next.projectTabs, procurement: false }
  }
  if (features.site === false) {
    next.siteFeed = false
    next.mobile = false
    next.projectTabs = { ...next.projectTabs, site: false }
  }
  if (features.finance === false) next.finance = false
  if (features.leads === false) next.leads = false
  if (features.portfolio === false) {
    next.portfolio = false
    next.reports = false
  }
  if (features.people === false) next.people = false
  if (features.impact === false) next.impact = false
  if (features.inventory === false) next.inventory = false
  return next
}
