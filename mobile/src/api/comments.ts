import { http } from './client'
import type { AssignedComment } from '../types/models'

export type CommentScope = 'to_me' | 'by_me'

export interface AssignedCommentQuery {
  scope?: CommentScope
  /** `true` shows only resolved, `all` shows both; omit for open only. */
  resolved?: 'true' | 'all'
  q?: string
  days?: number
}

export const commentsApi = {
  assigned: (params: AssignedCommentQuery = {}) =>
    http
      .get<{ success: true; comments: AssignedComment[] }>('/comments/assigned', { params })
      .then((r) => r.data.comments),

  setResolved: (id: string, resolved: boolean) =>
    http
      .patch<{ success: true; comment: AssignedComment }>(`/comments/${id}`, { resolved })
      .then((r) => r.data.comment),
}
