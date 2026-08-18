import { http } from './client'
import type { ProjectFile } from '../types/models'

export const filesApi = {
  list: (projectId: string) =>
    http.get<{ success: true; files: ProjectFile[] }>('/files', { params: { projectId } }).then((r) => r.data.files),

  upload: (projectId: string, file: { uri: string; name: string; mimeType?: string }, folder = 'concepts') => {
    const form = new FormData()
    form.append('projectId', projectId)
    form.append('folder', folder)
    // React Native's fetch/XHR FormData accepts this {uri,name,type} shape directly.
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    } as unknown as Blob)

    return http
      .post<{ success: true; file: ProjectFile }>('/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.file)
  },

  updateStatus: (id: string, status: ProjectFile['status']) =>
    http.patch<{ success: true; file: ProjectFile }>(`/files/${id}`, { status }).then((r) => r.data.file),
}
