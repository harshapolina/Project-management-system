import { http } from './client'
import type { ReportsOverview } from '../types/ops'
import type { Project } from '../types/models'

export interface PortfolioData {
  counts: { total: number; ongoing: number; completed: number; delayed: number; onHold: number }
  health: { key: string; label: string; value: number; color: string }[]
  projects: Project[]
  delayAlerts: { id: string; name: string; location?: string; stage?: string; endDate?: string }[]
  upcomingDeadlines: {
    _id: string
    title: string
    dueDate: string
    projectId: { _id: string; name: string }
    assignee?: { _id: string; name: string; avatar?: string }
  }[]
  workload: { user: { _id: string; name: string; avatar?: string; role: string }; openTasks: number; load: number }[]
}

export const reportsApi = {
  overview: () => http.get<{ success: true; data: ReportsOverview }>('/reports/overview').then((r) => r.data.data),

  portfolio: () =>
    http.get<{ success: true; data: PortfolioData }>('/projects/portfolio').then((r) => r.data.data),
}
