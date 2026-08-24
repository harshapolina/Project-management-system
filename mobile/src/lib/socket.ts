import { io, type Socket } from 'socket.io-client'
import { API_ORIGIN } from '../constants/env'
import { useAuthStore } from '../store/authStore'

let socket: Socket | null = null

function currentToken() {
  return useAuthStore.getState().accessToken || null
}

/** Singleton Socket.IO client — JWT auth on every connect. */
export function getSocket() {
  const token = currentToken()
  if (!token) return null

  if (!socket) {
    socket = io(API_ORIGIN, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionAttempts: Infinity,
      auth: { token },
    })

    socket.on('connect_error', () => {
      const next = currentToken()
      const auth = socket?.auth as { token?: string } | undefined
      if (next && next !== auth?.token) {
        socket!.auth = { token: next }
        socket!.connect()
      }
    })
  } else {
    socket.auth = { token }
    if (!socket.connected) socket.connect()
  }

  return socket
}

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
