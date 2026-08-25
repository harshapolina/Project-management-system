import { http } from './client'
import type { ProjectFile } from '../types/models'
import { compressImageAsset } from '../lib/compressImage'

export const filesApi = {
  list: (projectId: string) =>
    http.get<{ success: true; files: ProjectFile[] }>('/files', { params: { projectId } }).then((r) => r.data.files),

  upload: async (
    projectId: string,
    file: { uri: string; name: string; mimeType?: string },
    folder = 'concepts',
  ) => {
    // Shrink photos on the device — a site connection uploads the small file.
    // Non-images and anything that fails to compress pass through untouched.
    const asset = await compressImageAsset(file)

    const form = new FormData()
    form.append('projectId', projectId)
    form.append('folder', folder)
    // React Native's fetch/XHR FormData accepts this {uri,name,type} shape directly.
    form.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
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
