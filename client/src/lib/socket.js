import { io } from 'socket.io-client'
import { apiOrigin, useAuthStore } from './api'

let socket = null

/** Prefer the real API host so websockets are not dropped by the Vite proxy. */
function socketUrl() {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/api\/?$/, '')
  }
  if (import.meta.env.DEV) return 'http://localhost:5000'
  return apiOrigin() || undefined
}

function currentToken() {
  return useAuthStore.getState().accessToken || null
}

/**
 * Singleton Socket.IO client — JWT auth on every connect.
 * Server auto-joins `user:{id}`; never emit join:user with a client-chosen id.
 */
export function getSocket() {
  const token = currentToken()
  if (!token) return null

  if (!socket) {
    socket = io(socketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionAttempts: Infinity,
      auth: { token },
    })

    socket.on('connect_error', (err) => {
      // Token expired — try once with the latest store token
      const next = currentToken()
      if (next && next !== socket.auth?.token) {
        socket.auth = { token: next }
        socket.connect()
      } else if (import.meta.env.DEV) {
        console.warn('[socket]', err?.message || err)
      }
    })
  } else {
    // Keep auth in sync after token refresh
    socket.auth = { token }
    if (!socket.connected) socket.connect()
  }

  return socket
}

/** Call after login / token refresh so the next connect uses a fresh JWT. */
export function syncSocketAuth() {
  const token = currentToken()
  if (!token) {
    disconnectSocket()
    return null
  }
  if (!socket) return getSocket()
  socket.auth = { token }
  if (!socket.connected) socket.connect()
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
