import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { compressFormDataUploads } from './compressImage'

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

/**
 * Public app origin for shareable login links.
 * Prefer VITE_PUBLIC_APP_URL so localhost platform creates still copy the live URL.
 */
export function publicAppOrigin() {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_APP_URL || '')
    .trim()
    .replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/** Company login link with workspace (+ optional admin portal). */
export function companyLoginUrl(workspace, portal = 'staff') {
  const origin = publicAppOrigin()
  const slug = String(workspace || getTenantSlug() || 'cubic')
    .trim()
    .toLowerCase()
  const params = new URLSearchParams()
  if (portal === 'admin') params.set('portal', 'admin')
  params.set('tenant', slug)
  return `${origin}/login?${params.toString()}`
}

/** Origin of the API host (no trailing slash), e.g. https://project-management-backend-nine-tau.vercel.app */
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
 * Resolve asset URLs so they hit the API host when the SPA is on another origin.
 * Supports MongoDB media links (/api/media/:id) and legacy /uploads/...
 */
export function assetUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  const origin = apiOrigin()
  // /api/media is already under the API — when VITE_API_URL is absolute, prefix origin
  if (path.startsWith('/api/media')) {
    if (origin && !API_URL.startsWith('/')) {
      return `${origin}${path}`
    }
    return path
  }
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
      logout: () => {
        try {
          // Dynamic to avoid circular import at module load
          import('./socket.js').then((m) => m.disconnectSocket()).catch(() => {})
        } catch {
          /* ignore */
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenant: null,
        })
      },
      getAccessToken: () => get().accessToken,
    }),
    { name: 'cubic-auth' },
  ),
)

function tenantHeaders() {
  return { 'X-Tenant-Slug': getTenantSlug() }
}

/**
 * Single-flight token refresh. When the access token expires, many queries
 * fail with 401 at the same time — they must all share ONE refresh call,
 * otherwise the second call sends an already-rotated token and the server
 * rejects it, which used to log the user out.
 */
let refreshInFlight = null

function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const { refreshToken, setAuth, logout } = useAuthStore.getState()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tenantHeaders(),
        },
        body: JSON.stringify({ refreshToken }),
      })
      if (res.ok) {
        const data = await res.json()
        setAuth({
          user: useAuthStore.getState().user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tenant: useAuthStore.getState().tenant,
        })
        try {
          const { syncSocketAuth } = await import('./socket.js')
          syncSocketAuth()
        } catch {
          /* ignore */
        }
        return data.accessToken
      }
      // Only end the session when the server explicitly rejects the token.
      // Transient failures (5xx, server restarting) should not log out.
      if (res.status === 401 || res.status === 403) logout()
      return null
    } catch {
      // Network hiccup — keep the session, the next request will retry.
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function api(path, options = {}) {
  const { accessToken, refreshToken } = useAuthStore.getState()
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

  // Shrink images once, here, so every upload in the app benefits without each
  // call site remembering to. Non-image parts are passed through untouched, and
  // a failed compression falls back to the original file.
  const body = isFormData ? await compressFormDataUploads(options.body) : options.body
  const requestInit = { ...options, body, headers }

  let res = await fetch(`${API_URL}${path}`, requestInit)

  if (res.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, requestInit)
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
