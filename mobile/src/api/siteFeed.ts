import { http } from './client'
import type { SiteUpdate, Snag } from '../types/ops'

export interface CreateSiteUpdatePayload {
  projectId: string
  note: string
  stage?: string
  progress?: number
  photos?: { url: string }[]
}

export const siteFeedApi = {
  updates: (params?: { projectId?: string }) =>
    http.get<{ success: true; updates: SiteUpdate[] }>('/site-updates', { params }).then((r) => r.data.updates),

  postUpdate: (payload: CreateSiteUpdatePayload) =>
    http.post<{ success: true; update: SiteUpdate }>('/site-updates', payload).then((r) => r.data.update),

  snags: (params?: { projectId?: string }) =>
    http.get<{ success: true; snags: Snag[] }>('/snags', { params }).then((r) => r.data.snags),

  createSnag: (payload: { projectId: string; title: string; assignee?: string }) =>
    http.post<{ success: true; snag: Snag }>('/snags', payload).then((r) => r.data.snag),

  updateSnag: (id: string, payload: { status?: Snag['status']; convertToTask?: boolean }) =>
    http.patch<{ success: true; snag: Snag }>(`/snags/${id}`, payload).then((r) => r.data.snag),
}
