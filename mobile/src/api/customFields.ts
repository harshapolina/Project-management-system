import { http } from './client'
import type { CustomFieldDefinition, CustomFieldType } from '../types/models'

export interface CustomFieldDraft {
  name: string
  type: CustomFieldType
  /** Only meaningful for `select`; the server ignores it otherwise. */
  options?: string[]
}

export const customFieldsApi = {
  /** Active definitions only — what task forms should offer. */
  active: () =>
    http
      .get<{ success: true; fields: CustomFieldDefinition[] }>('/custom-fields')
      .then((r) => r.data.fields),

  /** Every definition including deactivated ones — what the settings screen manages. */
  all: () =>
    http
      .get<{ success: true; fields: CustomFieldDefinition[] }>('/custom-fields/all')
      .then((r) => r.data.fields),

  create: (body: CustomFieldDraft) =>
    http
      .post<{ success: true; field: CustomFieldDefinition }>('/custom-fields', body)
      .then((r) => r.data.field),

  update: (id: string, body: Partial<CustomFieldDraft> & { isActive?: boolean }) =>
    http
      .patch<{ success: true; field: CustomFieldDefinition }>(`/custom-fields/${id}`, body)
      .then((r) => r.data.field),

  /** Soft delete — the server flips `isActive` to false and keeps the record. */
  deactivate: (id: string) =>
    http
      .delete<{ success: true; field: CustomFieldDefinition }>(`/custom-fields/${id}`)
      .then((r) => r.data.field),
}
