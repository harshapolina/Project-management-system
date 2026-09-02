import { http } from './client'
import type { MailThread, MailUser, Message } from '../types/models'

export const mailApi = {
  directory: () => http.get<{ success: true; users: MailUser[] }>('/mail/directory').then((r) => r.data.users),

  threads: () => http.get<{ success: true; threads: MailThread[] }>('/mail/threads').then((r) => r.data.threads),

  conversation: (userId: string) =>
    http
      .get<{ success: true; other: MailUser; messages: Message[] }>(`/mail/with/${userId}`)
      .then((r) => r.data),

  send: (payload: { to: string; body: string; subject?: string }) =>
    http.post<{ success: true; message: Message }>('/mail', payload).then((r) => r.data.message),
}
