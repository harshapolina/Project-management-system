import { http } from './client'
import type { BoqItem, Quotation } from '../types/ops'

export interface CreateQuotationPayload {
  title: string
  projectId?: string
  leadId?: string
  versionLabel?: string
  items?: BoqItem[]
  gstPercent?: number
  discount?: number
}

export const boqApi = {
  list: (params?: { projectId?: string; leadId?: string }) =>
    http.get<{ success: true; quotations: Quotation[] }>('/quotations', { params }).then((r) => r.data.quotations),

  get: (id: string) =>
    http.get<{ success: true; quotation: Quotation }>(`/quotations/${id}`).then((r) => r.data.quotation),

  create: (payload: CreateQuotationPayload) =>
    http.post<{ success: true; quotation: Quotation }>('/quotations', payload).then((r) => r.data.quotation),

  update: (id: string, payload: Partial<Quotation>) =>
    http.patch<{ success: true; quotation: Quotation }>(`/quotations/${id}`, payload).then((r) => r.data.quotation),

  remove: (id: string) => http.delete<{ success: true }>(`/quotations/${id}`).then((r) => r.data),

  uploadImage: (file: { uri: string; name: string; mimeType?: string }) => {
    const form = new FormData()
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'image/jpeg' } as unknown as Blob)
    return http
      .post<{ success: true; url: string; name: string; mime: string }>('/quotations/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
