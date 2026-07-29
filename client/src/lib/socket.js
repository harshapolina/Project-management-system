import { io } from 'socket.io-client'
import { apiOrigin } from './api'

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

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionAttempts: Infinity,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
