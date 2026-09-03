import { http } from './client'
import type {
  ImpactAchievement,
  ImpactBadge,
  ImpactData,
  ImpactLeaderboardRow,
  ImpactOverview,
  ImpactPeriod,
  ImpactRule,
  ImpactScore,
  ImpactTimelineEntry,
} from '../types/models'

export interface AdjustPointsPayload {
  userId: string
  /** Award through a configured rule… */
  ruleKey?: string
  /** …or a raw non-zero amount. Negative deducts. */
  points?: number
  label?: string
  note?: string
  projectId?: string
}

export const impactApi = {
  me: () => http.get<{ success: true } & ImpactData>('/impact/me').then((r) => r.data),

  overview: () =>
    http.get<{ success: true } & ImpactOverview>('/impact/overview').then((r) => r.data),

  leaderboard: (params?: { period?: ImpactPeriod; role?: string; q?: string }) =>
    http
      .get<{ success: true; period: ImpactPeriod; leaderboard: ImpactLeaderboardRow[] }>(
        '/impact/leaderboard',
        { params },
      )
      .then((r) => r.data.leaderboard),

  user: (userId: string) =>
    http
      .get<{
        success: true
        user: { _id: string; name: string; avatar?: string; role: string; title?: string }
        score: ImpactScore
        badges: ImpactBadge[]
        breakdown: { category: string; points: number; count: number }[]
        trend: { date: string; points: number }[]
        timeline: ImpactTimelineEntry[]
      }>(`/impact/users/${userId}`)
      .then((r) => r.data),

  rules: () =>
    http
      .get<{
        success: true
        rules: ImpactRule[]
        canManage: boolean
        achievements: ImpactAchievement[]
      }>('/impact/rules')
      .then((r) => r.data),

  updateRule: (
    id: string,
    payload: Partial<Pick<ImpactRule, 'points' | 'weight' | 'enabled' | 'auto' | 'label' | 'description'>>,
  ) => http.patch<{ success: true; rule: ImpactRule }>(`/impact/rules/${id}`, payload).then((r) => r.data.rule),

  adjust: (payload: AdjustPointsPayload) =>
    http
      .post<{ success: true; entry: ImpactTimelineEntry; score: ImpactScore }>('/impact/adjust', payload)
      .then((r) => r.data),
}
