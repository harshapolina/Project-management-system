import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { syncSocketAuth, disconnectSocket } from '../lib/socket'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import type { Message, Notification } from '../types/models'

/**
 * Real-time sync: notifications, mail, permissions — mirrors the web AppShell socket wiring.
 */
export function useLiveSync() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setTenant = useAuthStore((s) => s.setTenant)
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      disconnectSocket()
      return undefined
    }

    const socket = syncSocketAuth()
    if (!socket) return undefined

    const invalidateNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['home'] })
    }

    const onNotification = (payload: Partial<Notification> & { title?: string; body?: string; type?: string }) => {
      invalidateNotifications()
      if (payload?.title) {
        pushToast({
          title: payload.title,
          body: payload.body,
          type: payload.type,
        })
      }
    }

    const onMail = (payload: { message?: Message; from?: { name?: string } }) => {
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
      invalidateNotifications()
      const fromName = payload?.from?.name || payload?.message?.from?.name || 'Someone'
      pushToast({
        title: `${fromName} sent a message`,
        body: payload?.message?.body?.slice(0, 120),
        type: 'mail',
      })
    }

    const onPermissions = (payload: { permissions?: Record<string, boolean> }) => {
      const current = useAuthStore.getState().user
      if (current) {
        setUser({
          ...current,
          permissions: payload?.permissions || {},
        })
      }
      authApi
        .me()
        .then((result) => {
          if (result?.user) setUser(result.user)
          if (result?.tenant) setTenant(result.tenant)
        })
        .catch(() => {})
    }

    if (!socket.connected) socket.connect()
    socket.on('notification:new', onNotification)
    socket.on('mail:new', onMail)
    socket.on('permissions:updated', onPermissions)

    return () => {
      socket.off('notification:new', onNotification)
      socket.off('mail:new', onMail)
      socket.off('permissions:updated', onPermissions)
    }
  }, [user?.id, pushToast, queryClient, setTenant, setUser])
}
