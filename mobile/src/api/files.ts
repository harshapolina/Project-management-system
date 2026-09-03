import { http } from './client'
import type { ProjectFile } from '../types/models'
import { compressImageAsset } from '../lib/compressImage'

export const filesApi = {
  list: (projectId: string, folder?: string) =>
    http
      .get<{ success: true; files: ProjectFile[] }>('/files', {
        params: { projectId, ...(folder ? { folder } : {}) },
      })
      .then((r) => r.data.files),

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

  /** Rename, move between folders, or toggle client visibility. */
  update: (
    id: string,
    payload: { name?: string; folder?: string; status?: ProjectFile['status']; clientVisible?: boolean },
  ) => http.patch<{ success: true; file: ProjectFile }>(`/files/${id}`, payload).then((r) => r.data.file),

  remove: (id: string) => http.delete<{ success: true }>(`/files/${id}`).then((r) => r.data),

  /**
   * Send a drawing for sign-off. With no `approverUser` the server resolves
   * the approver from the workspace's "Drawing / file" routing rule.
   */
  requestApproval: (
    id: string,
    payload: { note?: string; approverUser?: string; approvalType?: string } = {},
  ) =>
    http
      .post<{ success: true; file: ProjectFile }>(`/files/${id}/request-approval`, {
        approvalType: payload.approvalType || 'drawing',
        ...(payload.note ? { note: payload.note } : {}),
        ...(payload.approverUser ? { approverUser: payload.approverUser } : {}),
      })
      .then((r) => r.data.file),

  decide: (id: string, payload: { decision: 'approved' | 'rejected'; note?: string }) =>
    http
      .post<{ success: true; file: ProjectFile }>(`/files/${id}/decide`, payload)
      .then((r) => r.data.file),
}
