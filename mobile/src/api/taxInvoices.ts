import { http } from './client'
import type { TaxInvoice, TaxInvoiceStatus } from '../types/taxInvoice'

export type TaxInvoiceDraft = Partial<Omit<TaxInvoice, '_id' | 'createdAt' | 'updatedAt' | 'projectId'>> & {
  projectId?: string
}

export const taxInvoicesApi = {
  list: (params?: { projectId?: string; status?: TaxInvoiceStatus | 'all'; q?: string }) =>
    http
      .get<{ success: true; invoices: TaxInvoice[] }>('/tax-invoices', { params })
      .then((r) => r.data.invoices),

  get: (id: string) =>
    http.get<{ success: true; invoice: TaxInvoice }>(`/tax-invoices/${id}`).then((r) => r.data.invoice),

  create: (payload: TaxInvoiceDraft & { invoiceNumber: string }) =>
    http.post<{ success: true; invoice: TaxInvoice }>('/tax-invoices', payload).then((r) => r.data.invoice),

  fromQuotation: (quotationId: string) =>
    http
      .post<{ success: true; invoice: TaxInvoice }>(`/tax-invoices/from-quotation/${quotationId}`, {})
      .then((r) => r.data.invoice),

  update: (id: string, payload: TaxInvoiceDraft) =>
    http.patch<{ success: true; invoice: TaxInvoice }>(`/tax-invoices/${id}`, payload).then((r) => r.data.invoice),

  remove: (id: string) => http.delete<{ success: true }>(`/tax-invoices/${id}`).then((r) => r.data),
}
