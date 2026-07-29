/** Roles that can open the People / Admin portal */
export const ADMIN_PORTAL_ROLES = ['admin', 'owner', 'hr']

/** Roles with the company-wide ops dashboard */
export const COMPANY_ADMIN_ROLES = ['admin', 'owner']

/** Roles that see company ops pages (leads, finance, materials, reports, portfolio) */
export const OPS_PORTAL_ROLES = ['admin', 'owner', 'hr']

const EMPLOYEE_ROLES = [
  'project_manager',
  'designer',
  'site_supervisor',
  'client',
  'vendor',
]

export const ACCESS_TOGGLES = [
  { key: 'projects.create', label: 'Create projects', group: 'Projects' },
  { key: 'projects.manage', label: 'Manage projects & team tab', group: 'Projects' },
  { key: 'tasks.create', label: 'Create tasks', group: 'Tasks' },
  { key: 'tasks.manage', label: 'Manage all task fields', group: 'Tasks' },
  { key: 'boq', label: 'BOQ / Quotes workspace', group: 'Modules' },
  { key: 'procurement', label: 'Materials page + project Materials tab', group: 'Modules' },
  { key: 'site', label: 'Site updates page + project Site tab', group: 'Modules' },
  { key: 'files.manage', label: 'Upload drawings & files', group: 'Modules' },
  { key: 'finance', label: 'Money / finance page', group: 'Modules' },
  { key: 'leads', label: 'New enquiries page', group: 'Modules' },
  { key: 'portfolio', label: 'Dashboard + Reports pages', group: 'Modules' },
  { key: 'impact', label: 'Impact Points leaderboard', group: 'Modules' },
  { key: 'people', label: 'People directory', group: 'Company' },
]

const ALL_PERMISSION_KEYS = ACCESS_TOGGLES.map((item) => item.key)

export function defaultPermissionsForRole(role) {
  if (role === 'admin' || role === 'owner') {
    return Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, true]))
  }
  if (role === 'hr') {
    return {
      'projects.create': true,
      'projects.manage': true,
      'tasks.create': true,
      'tasks.manage': true,
      people: true,
      impact: true,
    }
  }
  if (['project_manager', 'designer', 'site_supervisor'].includes(role)) {
    return { impact: true }
  }
  return {}
}

export function permissionsForUser(user) {
  if (!user) return {}
  if (user.isPlatformAdmin) {
    return Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, true]))
  }
  return {
    ...defaultPermissionsForRole(user.role),
    ...(user.permissions || {}),
  }
}

export function isAdminRole(user) {
  if (!user) return false
  return ADMIN_PORTAL_ROLES.includes(user.role)
}

export function isCompanyAdmin(user) {
  if (!user) return false
  return COMPANY_ADMIN_ROLES.includes(user.role)
}

export function isOpsRole(user) {
  if (!user) return false
  return OPS_PORTAL_ROLES.includes(user.role)
}

export function isEmployeeRole(user) {
  if (!user) return false
  return EMPLOYEE_ROLES.includes(user.role)
}

export function canInviteUsers(user) {
  if (!user) return false
  if (user.isPlatformAdmin) return true
  return ['admin', 'owner', 'hr'].includes(user.role)
}

export function canCreateProjects(user) {
  if (!user) return false
  return !!permissionsForUser(user)['projects.create']
}

/**
 * Capability map used by nav, route gates, and project tabs.
 */
export function capabilitiesForUser(user) {
  if (!user) {
    return {
      companyAdmin: false,
      people: false,
      portfolio: false,
      leads: false,
      finance: false,
      procurement: false,
      reports: false,
      siteFeed: false,
      impact: false,
      projects: false,
      myWork: false,
      inbox: false,
      settings: false,
      mobile: false,
      platform: false,
      createProject: false,
      projectTabs: {
        overview: false,
        tasks: false,
        procurement: false,
        site: false,
        files: false,
        team: false,
      },
    }
  }

  const role = user.role
  const companyAdmin = COMPANY_ADMIN_ROLES.includes(role)
  const permissions = permissionsForUser(user)
  const employee = EMPLOYEE_ROLES.includes(role)
  const isClientOrVendor = role === 'client' || role === 'vendor'

  return {
    companyAdmin: companyAdmin || !!user.isPlatformAdmin,
    people: !!permissions.people,
    managePeople:
      !!user.isPlatformAdmin || ['admin', 'owner'].includes(user.role),
    portfolio: !!permissions.portfolio,
    leads: !!permissions.leads,
    finance: !!permissions.finance,
    procurement: !!permissions.procurement,
    reports: !!permissions.portfolio,
    siteFeed: !!permissions.site,
    impact: !!permissions.impact,
    projects: true,
    myWork: !isClientOrVendor,
    inbox: true,
    settings: true,
    mobile: !!permissions.site,
    platform: !!user.isPlatformAdmin,
    createProject: !!permissions['projects.create'],
    manageProjects: !!permissions['projects.manage'],
    createTask: !!permissions['tasks.create'],
    manageTasks: !!permissions['tasks.manage'],
    manageFiles: !!permissions['files.manage'],
    boq: !!permissions.boq,
    projectTabs: {
      overview: true,
      tasks: true,
      procurement: !!permissions.procurement,
      site: !!permissions.site,
      files: true,
      team: !!permissions['projects.manage'],
    },
    employee,
  }
}

/**
 * Post-login / GuestOnly home path by role.
 * @param {object} user
 * @param {'staff'|'admin'} [portal] — login portal mode
 */
export function homePathForUser(user, portal = 'staff') {
  if (!user) return '/login'
  if (user.mustChangePassword) return '/settings'
  if (!user.onboardingCompleted) return '/onboarding'

  if (portal === 'admin') {
    if (user.isPlatformAdmin && !isAdminRole(user)) return '/platform'
    if (isCompanyAdmin(user)) return '/company-admin'
    if (user.role === 'hr' || isAdminRole(user)) return '/admin'
    return null
  }

  if (user.role === 'site_supervisor') return '/mobile'
  if (user.isPlatformAdmin && !isAdminRole(user)) return '/platform'
  if (isCompanyAdmin(user)) return '/company-admin'
  if (user.role === 'hr') return '/admin'
  return '/'
}

export const INVITE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'hr', label: 'HR' },
  { value: 'project_manager', label: 'Project manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'site_supervisor', label: 'Site supervisor' },
  { value: 'client', label: 'Client' },
  { value: 'vendor', label: 'Vendor' },
]

export const ROLE_LABELS = Object.fromEntries(
  INVITE_ROLE_OPTIONS.map((o) => [o.value, o.label]),
)
