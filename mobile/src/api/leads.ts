import { http } from './client'
import type { Lead, Quotation } from '../types/ops'
import type { Project } from '../types/models'

export interface CreateLeadPayload {
  clientName: string
  contactName?: string
  email?: string
  phone?: string
  source?: string
  estimatedValue?: number
  notes?: string
  owner?: string
}

export const leadsApi = {
  list: () => http.get<{ success: true; leads: Lead[] }>('/leads').then((r) => r.data.leads),

  get: async (id: string) => {
    const leads = await http.get<{ success: true; leads: Lead[] }>('/leads').then((r) => r.data.leads)
    const lead = leads.find((l) => l._id === id)
    if (!lead) throw new Error('Enquiry not found')
    return lead
  },

  create: (payload: CreateLeadPayload) =>
    http.post<{ success: true; lead: Lead }>('/leads', payload).then((r) => r.data.lead),

  update: (id: string, payload: Omit<Partial<Lead>, 'owner' | 'stage'> & { owner?: string | null; stage?: Lead['stage'] }) =>
    http.patch<{ success: true; lead: Lead }>(`/leads/${id}`, payload).then((r) => r.data.lead),

  convert: (id: string) =>
    http
      .post<{ success: true; project: Project; quotation: Quotation }>(`/leads/${id}/convert`)
      .then((r) => r.data),

  remove: (id: string) => http.delete<{ success: true }>(`/leads/${id}`).then((r) => r.data),
}
