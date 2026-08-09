import { http } from './client'
import type { ImpactData } from '../types/models'

export const impactApi = {
  me: () => http.get<{ success: true } & ImpactData>('/impact/me').then((r) => r.data),
}
