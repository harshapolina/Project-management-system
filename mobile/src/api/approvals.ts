import { http } from './client'
import type {
  ApprovalFlowType,
  ApprovalRule,
  ApprovalType,
  UserSummary,
} from '../types/models'

export interface ApprovalRuleDraft {
  entityType: string
  minAmount?: number
  maxAmount?: number | null
  approverRole: string
  approverUser?: string | null
}

interface FlowResponse {
  success: true
  flow: ApprovalFlowType[]
  members: UserSummary[]
  roles: string[]
}

export const approvalsApi = {
  /**
   * Everything the approvals screen renders in one call: each type with its
   * effective bands (already collapsed server-side), plus the workspace's
   * members and roles for the rule form.
   */
  flow: () => http.get<FlowResponse>('/approvals/flow').then((r) => r.data),

  createRule: (body: ApprovalRuleDraft) =>
    http
      .post<{ success: true; rule: ApprovalRule }>('/approvals/rules', body)
      .then((r) => r.data.rule),

  removeRule: (id: string) => http.delete(`/approvals/rules/${id}`).then(() => id),

  createType: (body: { label: string; description?: string }) =>
    http
      .post<{ success: true; type: ApprovalType }>('/approvals/types', body)
      .then((r) => r.data.type),

  /** Removes the type and any routing on it; returns how many rules went. */
  removeType: (id: string) =>
    http
      .delete<{ success: true; removedRules: number }>(`/approvals/types/${id}`)
      .then((r) => r.data.removedRules),
}
