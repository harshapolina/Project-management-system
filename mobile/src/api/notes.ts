import { http } from './client'
import type { MeetingNote } from '../types/ops'

export const notesApi = {
  add: (projectId: string, text: string) =>
    http
      .post<{ success: true; meetingNotes: MeetingNote[] }>(`/projects/${projectId}/notes`, { text })
      .then((r) => r.data.meetingNotes),

  update: (projectId: string, noteId: string, text: string) =>
    http
      .patch<{ success: true; meetingNotes: MeetingNote[] }>(`/projects/${projectId}/notes/${noteId}`, { text })
      .then((r) => r.data.meetingNotes),

  remove: (projectId: string, noteId: string) =>
    http
      .delete<{ success: true; meetingNotes: MeetingNote[] }>(`/projects/${projectId}/notes/${noteId}`)
      .then((r) => r.data.meetingNotes),
}
