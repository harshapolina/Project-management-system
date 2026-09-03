import { http } from './client'
import type { GoogleCalendarEvent, GoogleCalendarStatus } from '../types/ops'

export const calendarApi = {
  status: () =>
    http.get<{ success: true } & GoogleCalendarStatus>('/calendar/google/status').then((r) => r.data),

  setClientId: (clientId: string) =>
    http.put<{ success: true; clientId: string }>('/calendar/google/client-id', { clientId }).then((r) => r.data),

  disconnect: () => http.delete<{ success: true }>('/calendar/google').then((r) => r.data),

  events: (params?: { timeMin?: string; timeMax?: string; maxResults?: number }) =>
    http
      .get<{ success: true; events: GoogleCalendarEvent[] }>('/calendar/google/events', { params })
      .then((r) => r.data.events),
}
