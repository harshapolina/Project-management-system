import { http } from './client'
import type { PurchaseOrder, Rfq, RfqItem } from '../types/ops'

export interface CreateRfqPayload {
  projectId: string
  quotationId?: string
  items: RfqItem[]
  vendorIds: string[]
  closingDate?: string
  notes?: string
}

export interface QuoteRfqPayload {
  vendorId: string
  rates?: number[]
  gstPercent?: number
  freight?: number
  loading?: number
  installation?: number
  otherCharges?: number
  validUntil?: string
  remarks?: string
  declined?: boolean
}

export interface AwardRfqPayload {
  vendorId: string
  reason?: string
  deliveryDate?: string
  deliveryLocation?: string
  paymentTerms?: string
  poNumber?: string
}

export const rfqsApi = {
  list: (params?: { projectId?: string; status?: string }) =>
    http.get<{ success: true; rfqs: Rfq[] }>('/rfqs', { params }).then((r) => r.data.rfqs),

  get: (id: string) => http.get<{ success: true; rfq: Rfq }>(`/rfqs/${id}`).then((r) => r.data.rfq),

  create: (payload: CreateRfqPayload) =>
    http.post<{ success: true; rfq: Rfq }>('/rfqs', payload).then((r) => r.data.rfq),

  update: (id: string, payload: Partial<Pick<Rfq, 'notes' | 'closingDate' | 'status' | 'items'>>) =>
    http.patch<{ success: true; rfq: Rfq }>(`/rfqs/${id}`, payload).then((r) => r.data.rfq),

  addVendors: (id: string, vendorIds: string[]) =>
    http.post<{ success: true; rfq: Rfq }>(`/rfqs/${id}/vendors`, { vendorIds }).then((r) => r.data.rfq),

  send: (id: string, payload?: { vendorId?: string; via?: 'whatsapp' | 'email' | 'manual' }) =>
    http.post<{ success: true; sent: number; rfq: Rfq }>(`/rfqs/${id}/send`, payload).then((r) => r.data),

  quote: (id: string, payload: QuoteRfqPayload) =>
    http.post<{ success: true; rfq: Rfq }>(`/rfqs/${id}/quote`, payload).then((r) => r.data.rfq),

  award: (id: string, payload: AwardRfqPayload) =>
    http
      .post<{ success: true; rfq: Rfq; purchaseOrder: PurchaseOrder }>(`/rfqs/${id}/award`, payload)
      .then((r) => r.data),

  remove: (id: string) => http.delete<{ success: true }>(`/rfqs/${id}`).then((r) => r.data),
}
