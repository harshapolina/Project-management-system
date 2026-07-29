import { AppError } from '../middleware/errorHandler.js'

export const PERMISSION_KEYS = [
  'projects.create',
  'projects.manage',
  'tasks.create',
  'tasks.manage',
  'boq',
  'procurement',
  'site',
  'files.manage',
  'finance',
  'leads',
  'portfolio',
  'people',
  'impact',
]

const ALL_ENABLED = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]))

const ROLE_DEFAULTS = {
  admin: ALL_ENABLED,
  owner: ALL_ENABLED,
  hr: {
    'projects.create': true,
    'projects.manage': true,
    'tasks.create': true,
    'tasks.manage': true,
    people: true,
    impact: true,
  },
  project_manager: { impact: true },
  designer: { impact: true },
  site_supervisor: { impact: true },
}

function overridesFor(user) {
  if (!user?.permissions) return {}
  if (user.permissions instanceof Map) return Object.fromEntries(user.permissions)
  if (typeof user.permissions.toObject === 'function') {
    return user.permissions.toObject()
  }
  return user.permissions
}

export function defaultPermissionsForRole(role) {
  return { ...(ROLE_DEFAULTS[role] || {}) }
}

export function resolvePermissions(user) {
  if (!user) return {}
  if (user.isPlatformAdmin) return { ...ALL_ENABLED }
  return {
    ...defaultPermissionsForRole(user.role),
    ...overridesFor(user),
  }
}

export function hasPermission(user, key) {
  return !!resolvePermissions(user)[key]
}

export function canManageEmployeeAccess(user) {
  return !!(
    user?.isPlatformAdmin || ['admin', 'owner'].includes(user?.role)
  )
}

export function requirePermission(key) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401))
    if (!hasPermission(req.user, key)) {
      return next(new AppError('Insufficient permissions', 403))
    }
    next()
  }
}

export function sanitizePermissionOverrides(value) {
  const input = value && typeof value === 'object' ? value : {}
  return Object.fromEntries(
    PERMISSION_KEYS.filter((key) => typeof input[key] === 'boolean').map((key) => [
      key,
      input[key],
    ]),
  )
}
