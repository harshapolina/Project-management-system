import { http } from './client'

/**
 * Workspace outbound email — SMTP credentials, per-event alert routing, and
 * the compose endpoint the vendor/client email drafts send through.
 * Mirrors server/src/routes/workspaceSettings.js.
 */

export interface NotificationEvent {
  key: string
  label: string
  description: string
}

export interface EventPrefs {
  popup: boolean
  email: boolean
  /** Assignee / approver / mentioned person */
  notifyTarget: boolean
  /** Whoever triggered the action */
  notifyActor: boolean
  notifyAdmins: boolean
  /** Deadline reminders only */
  daysBefore: number
}

export interface MailSettings {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  fromName: string
  fromEmail: string
  /** The password itself is never returned. */
  hasPassword: boolean
  passwordSet: boolean
  events: Record<string, EventPrefs>
  updatedAt?: string
}

export interface MailSettingsPayload {
  enabled?: boolean
  host?: string
  port?: number
  secure?: boolean
  user?: string
  pass?: string
  clearPassword?: boolean
  fromName?: string
  fromEmail?: string
  events?: Record<string, Partial<EventPrefs>>
}

export const workspaceMailApi = {
  settings: () =>
    http
      .get<{
        success: true
        settings: MailSettings | null
        events: NotificationEvent[]
        canEdit: boolean
      }>('/settings/mail')
      .then((r) => r.data),

  update: (payload: MailSettingsPayload) =>
    http
      .put<{ success: true; settings: MailSettings }>('/settings/mail', payload)
      .then((r) => r.data.settings),

  test: (to?: string) =>
    http
      .post<{ success: true; sentTo: string }>('/settings/mail/test', to ? { to } : {})
      .then((r) => r.data),

  compose: (payload: { to: string; subject: string; body: string }) =>
    http
      .post<{ success: true; sentTo: string[]; from: string }>('/settings/mail/compose', payload)
      .then((r) => r.data),
}
