import { http } from './client'
import type { AppNotification } from '../types/ops'

export const notificationsApi = {
  list: () =>
    http
      .get<{ success: true; notifications: AppNotification[] }>('/notifications')
      .then((r) => r.data.notifications),

  markRead: (id: string) =>
    http
      .patch<{ success: true; notification: AppNotification }>(`/notifications/${id}/read`)
      .then((r) => r.data.notification),

  markAllRead: () => http.post<{ success: true }>('/notifications/read-all').then((r) => r.data),

  markLater: (id: string) =>
    http
      .patch<{ success: true; notification: AppNotification }>(`/notifications/${id}/later`)
      .then((r) => r.data.notification),

  clear: (id: string) =>
    http
      .patch<{ success: true; notification: AppNotification }>(`/notifications/${id}/clear`)
      .then((r) => r.data.notification),
}
