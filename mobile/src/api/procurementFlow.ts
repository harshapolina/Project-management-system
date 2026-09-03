import { http } from './client'
import type {
  BoqControl,
  DebitNote,
  DebitNoteStatus,
  Grn,
  GrnLine,
  MaterialIssue,
  MaterialIssueLine,
  MaterialRequest,
  MaterialRequestLine,
  MaterialRequestStatus,
  ProcurementDashboard,
  QcInspection,
  QcLine,
  VendorPayment,
  VendorPaymentStatus,
} from '../types/procurementFlow'
import type { PurchaseOrder } from '../types/ops'

export interface CreateGrnPayload {
  purchaseOrder: string
  grnNumber?: string
  invoiceNo?: string
  challanNo?: string
  receivedAt?: string
  warehouse?: string
  notes?: string
  photos?: { url: string; name?: string }[]
  items?: Partial<GrnLine>[]
}

export interface CreateQcPayload {
  grn: string
  siteRemarks?: string
  photos?: { url: string; name?: string }[]
  items?: Partial<QcLine>[]
}

export interface CreateMaterialRequestPayload {
  projectId: string
  requestNumber?: string
  requiredBy?: string | null
  notes?: string
  status?: MaterialRequestStatus
  items: MaterialRequestLine[]
}

export interface CreateMaterialIssuePayload {
  projectId: string
  materialRequest?: string | null
  issueNumber?: string
  receivedByName?: string
  notes?: string
  items: MaterialIssueLine[]
}

export interface CreateVendorPaymentPayload {
  vendor: string
  projectId?: string | null
  purchaseOrder?: string | null
  vendorInvoice?: string | null
  grn?: string | null
  paymentNumber?: string
  invoiceAmount?: number
  debitAmount?: number
  tdsAmount?: number
  otherDeductions?: number
  dueDate?: string | null
  creditDays?: number
  notes?: string
}

export interface UpdateVendorPaymentPayload {
  status?: VendorPaymentStatus
  matchStatus?: string
  matchNotes?: string
  debitAmount?: number
  tdsAmount?: number
  otherDeductions?: number
  dueDate?: string
  mode?: string
  bankAccount?: string
  utr?: string
  proofUrl?: string
  proofName?: string
  paidAmount?: number
  notes?: string
  followUp?: { channel: string; contact?: string; note?: string }
}

export const procurementFlowApi = {
  dashboard: () =>
    http
      .get<{ success: true; data: ProcurementDashboard }>('/procurement/dashboard')
      .then((r) => r.data.data),

  boqControl: (projectId: string) =>
    http
      .get<{ success: true; data: BoqControl }>('/procurement/boq-control', { params: { projectId } })
      .then((r) => r.data.data),

  /* GRN */
  grns: (params?: { projectId?: string; purchaseOrder?: string }) =>
    http.get<{ success: true; grns: Grn[] }>('/procurement/grns', { params }).then((r) => r.data.grns),

  createGrn: (payload: CreateGrnPayload) =>
    http.post<{ success: true; grn: Grn }>('/procurement/grns', payload).then((r) => r.data.grn),

  /* QC */
  inspections: (params?: { projectId?: string }) =>
    http
      .get<{ success: true; inspections: QcInspection[] }>('/procurement/qc', { params })
      .then((r) => r.data.inspections),

  createInspection: (payload: CreateQcPayload) =>
    http
      .post<{ success: true; inspection: QcInspection; debitNote: DebitNote | null }>(
        '/procurement/qc',
        payload,
      )
      .then((r) => r.data),

  /* Debit notes */
  debitNotes: (params?: { projectId?: string }) =>
    http
      .get<{ success: true; debitNotes: DebitNote[] }>('/procurement/debit-notes', { params })
      .then((r) => r.data.debitNotes),

  updateDebitNote: (
    id: string,
    payload: { status?: DebitNoteStatus; notes?: string; items?: DebitNote['items']; debitAmount?: number },
  ) =>
    http
      .patch<{ success: true; debitNote: DebitNote }>(`/procurement/debit-notes/${id}`, payload)
      .then((r) => r.data.debitNote),

  /* Material requests */
  materialRequests: (params?: { projectId?: string }) =>
    http
      .get<{ success: true; requests: MaterialRequest[] }>('/procurement/material-requests', { params })
      .then((r) => r.data.requests),

  createMaterialRequest: (payload: CreateMaterialRequestPayload) =>
    http
      .post<{ success: true; request: MaterialRequest }>('/procurement/material-requests', payload)
      .then((r) => r.data.request),

  updateMaterialRequest: (
    id: string,
    payload: {
      status?: MaterialRequestStatus
      items?: MaterialRequestLine[]
      notes?: string
      requiredBy?: string | null
    },
  ) =>
    http
      .patch<{ success: true; request: MaterialRequest }>(`/procurement/material-requests/${id}`, payload)
      .then((r) => r.data.request),

  /* Material issues */
  materialIssues: (params?: { projectId?: string }) =>
    http
      .get<{ success: true; issues: MaterialIssue[] }>('/procurement/material-issues', { params })
      .then((r) => r.data.issues),

  createMaterialIssue: (payload: CreateMaterialIssuePayload) =>
    http
      .post<{ success: true; issue: MaterialIssue }>('/procurement/material-issues', payload)
      .then((r) => r.data.issue),

  /* Vendor payments */
  payments: (params?: { projectId?: string; status?: string }) =>
    http
      .get<{ success: true; payments: VendorPayment[] }>('/procurement/payments', { params })
      .then((r) => r.data.payments),

  createPayment: (payload: CreateVendorPaymentPayload) =>
    http
      .post<{ success: true; payment: VendorPayment }>('/procurement/payments', payload)
      .then((r) => r.data.payment),

  updatePayment: (id: string, payload: UpdateVendorPaymentPayload) =>
    http
      .patch<{ success: true; payment: VendorPayment }>(`/procurement/payments/${id}`, payload)
      .then((r) => r.data.payment),

  /* PO dispatch */
  sendPo: (id: string, via: string) =>
    http
      .post<{ success: true; purchaseOrder: PurchaseOrder }>(`/purchase-orders/${id}/send`, { via })
      .then((r) => r.data.purchaseOrder),

  unsendPo: (id: string) =>
    http
      .post<{ success: true; purchaseOrder: PurchaseOrder }>(`/purchase-orders/${id}/unsend`, {})
      .then((r) => r.data.purchaseOrder),
}
