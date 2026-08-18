import { http } from './client'
import type { InventoryItem, InventoryMovement } from '../types/ops'

export interface InventorySummary {
  totals: { items: number; lowStock: number; units: number; value: number }
  lowStock: InventoryItem[]
}

export const inventoryApi = {
  summary: () => http.get<InventorySummary>('/inventory/summary').then((r) => r.data),

  items: (q?: string) => http.get<{ items: InventoryItem[] }>('/inventory/items', { params: { q } }).then((r) => r.data.items),

  createItem: (payload: Partial<InventoryItem>) =>
    http.post<{ item: InventoryItem }>('/inventory/items', payload).then((r) => r.data.item),

  move: (id: string, payload: { type: 'in' | 'out' | 'adjust'; quantity: number; note?: string }) =>
    http
      .post<{ item: InventoryItem; movement: InventoryMovement }>(`/inventory/items/${id}/move`, payload)
      .then((r) => r.data),

  movements: (params?: { itemId?: string; limit?: number }) =>
    http.get<{ movements: InventoryMovement[] }>('/inventory/movements', { params }).then((r) => r.data.movements),
}
