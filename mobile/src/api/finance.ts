import { http } from './client'
import type { Expense, FinanceSummary, Payment } from '../types/ops'

export interface CreateExpensePayload {
  projectId: string
  amount: number
  category?: string
  note?: string
}

export const financeApi = {
  expenses: (params?: { projectId?: string }) =>
    http.get<{ success: true; expenses: Expense[] }>('/expenses', { params }).then((r) => r.data.expenses),

  createExpense: (payload: CreateExpensePayload) =>
    http.post<{ success: true; expense: Expense }>('/expenses', payload).then((r) => r.data.expense),

  reviewExpense: (id: string, status: 'approved' | 'rejected') =>
    http.patch<{ success: true; expense: Expense }>(`/expenses/${id}`, { status }).then((r) => r.data.expense),

  payments: (params?: { projectId?: string }) =>
    http.get<{ success: true; payments: Payment[] }>('/payments', { params }).then((r) => r.data.payments),

  summary: () => http.get<{ success: true; data: FinanceSummary }>('/finance/summary').then((r) => r.data.data),
}
