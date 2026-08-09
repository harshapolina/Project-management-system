import { http } from './client'
import type { Project, ProjectStats } from '../types/models'

export interface CreateProjectPayload {
  name: string
  clientName: string
  clientPhone?: string
  type?: 'residential' | 'commercial' | 'blank'
  location?: string
  startDate?: string
  endDate?: string
  budget?: number
  description?: string
}

export const projectsApi = {
  list: (params?: { status?: string; type?: string; stage?: string; q?: string }) =>
    http.get<{ success: true; projects: Project[] }>('/projects', { params }).then((r) => r.data.projects),

  get: (id: string) =>
    http
      .get<{ success: true; project: Project; stats: ProjectStats }>(`/projects/${id}`)
      .then((r) => r.data),

  create: (payload: CreateProjectPayload) =>
    http.post<{ success: true; project: Project }>('/projects', payload).then((r) => r.data.project),

  update: (id: string, payload: Partial<Project>) =>
    http.patch<{ success: true; project: Project }>(`/projects/${id}`, payload).then((r) => r.data.project),

  addMember: (id: string, userId: string, role?: string) =>
    http
      .post<{ success: true; project: Project }>(`/projects/${id}/members`, { userId, role })
      .then((r) => r.data.project),

  removeMember: (id: string, userId: string) =>
    http
      .delete<{ success: true; project: Project }>(`/projects/${id}/members/${userId}`)
      .then((r) => r.data.project),

  remove: (id: string) => http.delete<{ success: true }>(`/projects/${id}`).then((r) => r.data),
}
