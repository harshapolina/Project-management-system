import { AppError } from '../middleware/errorHandler.js'
import { Project } from '../models/Project.js'
import { tenantFilter } from '../middleware/tenant.js'

/**
 * Tenant-wide project visibility for company ops roles.
 * Everyone else only sees projects they manage, belong to, or own as client.
 */
export function scopeProjects(user) {
  if (!user) {
    return { _id: null }
  }
  if (user.isPlatformAdmin) return {}
  if (['admin', 'owner', 'hr'].includes(user.role)) return {}
  return {
    $or: [
      { projectManager: user._id },
      { clientId: user._id },
      { 'members.user': user._id },
    ],
  }
}

export function canAccessAllProjects(user) {
  if (!user) return false
  if (user.isPlatformAdmin) return true
  return ['admin', 'owner', 'hr'].includes(user.role)
}

export function isOpsUser(user) {
  if (!user) return false
  if (user.isPlatformAdmin) return true
  return ['admin', 'owner', 'hr'].includes(user.role)
}

export async function assertProjectAccess(
  req,
  projectId,
  message = 'Project not found',
) {
  if (!projectId) throw new AppError('Project is required', 400)
  const project = await Project.findOne(
    tenantFilter(req, { _id: projectId, ...scopeProjects(req.user) }),
  ).select('_id name')
  if (!project) throw new AppError(message, 404)
  return project
}
