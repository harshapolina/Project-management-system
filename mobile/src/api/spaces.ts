import { http } from './client'

export interface Space {
  _id: string
  name: string
  description?: string
  color: string
  projectCount?: number
  members?: { user: string; role: string }[]
  createdAt?: string
}

export const spacesApi = {
  list: () => http.get<{ success: true; spaces: Space[] }>('/spaces').then((r) => r.data.spaces),

  create: (payload: { name: string; description?: string; color?: string }) =>
    http.post<{ success: true; space: Space }>('/spaces', payload).then((r) => r.data.space),

  update: (id: string, payload: Partial<Pick<Space, 'name' | 'description' | 'color'>>) =>
    http.patch<{ success: true; space: Space }>(`/spaces/${id}`, payload).then((r) => r.data.space),

  remove: (id: string) => http.delete<{ success: true }>(`/spaces/${id}`).then((r) => r.data),
}
