import { http } from './client'
import type { ActivityEntry } from '../types/models'

export const activityApi = {
  list: (params?: { projectId?: string }) =>
    http
      .get<{ success: true; activity: ActivityEntry[] }>('/activity', { params })
      .then((r) => r.data.activity),
}
