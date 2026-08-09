import { http } from './client'
import type { PurchaseOrder, Vendor } from '../types/ops'

export const vendorsApi = {
  list: () => http.get<{ success: true; vendors: Vendor[] }>('/vendors').then((r) => r.data.vendors),

  create: (payload: Partial<Vendor>) =>
    http.post<{ success: true; vendor: Vendor }>('/vendors', payload).then((r) => r.data.vendor),

  update: (id: string, payload: Partial<Vendor>) =>
    http.patch<{ success: true; vendor: Vendor }>(`/vendors/${id}`, payload).then((r) => r.data.vendor),

  remove: (id: string) => http.delete<{ success: true }>(`/vendors/${id}`).then((r) => r.data),
}

export interface CreatePOPayload {
  projectId: string
  vendor?: string
  items?: { description: string; qty: number; rate: number; amount: number }[]
  value?: number
}

export const purchaseOrdersApi = {
  list: (params?: { projectId?: string }) =>
    http
      .get<{ success: true; purchaseOrders: PurchaseOrder[] }>('/purchase-orders', { params })
      .then((r) => r.data.purchaseOrders),

  create: (payload: CreatePOPayload) =>
    http.post<{ success: true; purchaseOrder: PurchaseOrder }>('/purchase-orders', payload).then((r) => r.data.purchaseOrder),

  update: (id: string, payload: Partial<PurchaseOrder>) =>
    http
      .patch<{ success: true; purchaseOrder: PurchaseOrder }>(`/purchase-orders/${id}`, payload)
      .then((r) => r.data.purchaseOrder),
}
