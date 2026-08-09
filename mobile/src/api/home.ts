import { http } from './client'
import type { HomeData, Task } from '../types/models'

export const homeApi = {
  get: () => http.get<{ success: true; data: HomeData }>('/home').then((r) => r.data.data),

  toggleTask: (id: string) =>
    http.patch<{ success: true; task: Task; from: string; to: string }>(`/tasks/${id}/toggle`).then((r) => r.data),
}
