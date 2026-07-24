import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || '/api'

/** Origin of the API host (no trailing slash), e.g. https://cubic-api.onrender.com */
export function apiOrigin() {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  if (!raw || raw.startsWith('/')) {
    if (typeof window !== 'undefined') return window.location.origin
    return ''
  }
  try {
    const u = new URL(raw)
    return u.origin
  } catch {
    return raw.replace(/\/api\/?$/, '')
  }
}

/**
 * Resolve asset URLs stored as /uploads/... so they hit the API host
 * (Render) when the SPA is on Vercel.
 */
export function assetUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  const origin = apiOrigin()
  return origin ? `${origin}${path}` : path
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      getAccessToken: () => get().accessToken,
    }),
    { name: 'cubic-auth' },
  ),
)

export async function api(path, options = {}) {
  const { accessToken, refreshToken, setAuth, logout } = useAuthStore.getState()
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers = {
    ...(options.headers || {}),
  }
  // Let the browser set multipart boundary for FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && refreshToken) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (refreshed.ok) {
      const data = await refreshed.json()
      setAuth({
        user: useAuthStore.getState().user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      headers.Authorization = `Bearer ${data.accessToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    } else {
      logout()
    }
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}
