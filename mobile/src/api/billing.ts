import { http } from './client'
import type { BillingSummary, PurchaseOrder, Vendor, VendorInvoice } from '../types/ops'

export const billingApi = {
  summary: () =>
    http.get<{ success: true; summary: BillingSummary }>('/billing/summary').then((r) => r.data.summary),

  invoices: (params?: { status?: string; vendorId?: string; q?: string }) =>
    http
      .get<{ success: true; invoices: VendorInvoice[] }>('/billing/invoices', { params })
      .then((r) => r.data.invoices),

  options: () =>
    http
      .get<{ success: true; vendors: Vendor[]; purchaseOrders: PurchaseOrder[] }>('/billing/options')
      .then((r) => r.data),

  create: (payload: {
    invoiceNumber: string
    vendorId: string
    purchaseOrderId?: string
    amount: number
    invoiceDate?: string
    dueDate?: string
    notes?: string
    status?: string
    file?: { uri: string; name: string; mimeType?: string } | null
  }) => {
    const form = new FormData()
    form.append('invoiceNumber', payload.invoiceNumber)
    form.append('vendorId', payload.vendorId)
    if (payload.purchaseOrderId) form.append('purchaseOrderId', payload.purchaseOrderId)
    form.append('amount', String(payload.amount))
    if (payload.invoiceDate) form.append('invoiceDate', payload.invoiceDate)
    if (payload.dueDate) form.append('dueDate', payload.dueDate)
    if (payload.notes) form.append('notes', payload.notes)
    form.append('status', payload.status || 'unpaid')
    if (payload.file) {
      form.append('file', {
        uri: payload.file.uri,
        name: payload.file.name,
        type: payload.file.mimeType || 'application/octet-stream',
      } as unknown as Blob)
    }
    return http
      .post<{ success: true; invoice: VendorInvoice }>('/billing/invoices', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.invoice)
  },

  update: (id: string, body: { status?: string }) =>
    http
      .patch<{ success: true; invoice: VendorInvoice }>(`/billing/invoices/${id}`, body)
      .then((r) => r.data.invoice),

  remove: (id: string) => http.delete<{ success: true }>(`/billing/invoices/${id}`).then((r) => r.data),
}
