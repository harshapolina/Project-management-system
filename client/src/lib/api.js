import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const RESERVED_SUBS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'static',
  'assets',
])

/**
 * Workspace slug for X-Tenant-Slug:
 * 1) ?tenant= / localStorage override
 * 2) subdomain (acme.editcomedia.com)
 * 3) VITE_TENANT_SLUG / "cubic"
 */
export function getTenantSlug() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('tenant')?.trim().toLowerCase()
    if (fromQuery) {
      localStorage.setItem('cubic-tenant-slug', fromQuery)
      return fromQuery
    }
    const stored = localStorage.getItem('cubic-tenant-slug')?.trim().toLowerCase()
    if (stored) return stored

    const host = window.location.hostname.toLowerCase()
    if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const parts = host.split('.')
      if (parts.length >= 3) {
        const sub = parts[0]
        if (!RESERVED_SUBS.has(sub)) return sub
      }
    }
  }
  return (import.meta.env.VITE_TENANT_SLUG || 'cubic').toLowerCase()
}

export function setTenantSlug(slug) {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
  if (s) localStorage.setItem('cubic-tenant-slug', s)
  else localStorage.removeItem('cubic-tenant-slug')
}

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
      tenant: null,
      setAuth: ({ user, accessToken, refreshToken, tenant }) =>
        set({
          user,
          accessToken,
          refreshToken,
          ...(tenant !== undefined ? { tenant } : {}),
        }),
      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenant: null,
        }),
      getAccessToken: () => get().accessToken,
    }),
    { name: 'cubic-auth' },
  ),
)

function tenantHeaders() {
  return { 'X-Tenant-Slug': getTenantSlug() }
}

export async function api(path, options = {}) {
  const { accessToken, refreshToken, setAuth, logout } = useAuthStore.getState()
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers = {
    ...tenantHeaders(),
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
      headers: {
        'Content-Type': 'application/json',
        ...tenantHeaders(),
      },
      body: JSON.stringify({ refreshToken }),
    })
    if (refreshed.ok) {
      const data = await refreshed.json()
      setAuth({
        user: useAuthStore.getState().user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tenant: useAuthStore.getState().tenant,
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
