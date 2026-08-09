import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { isApiError } from '../api/client'

/**
 * Validates the persisted session against the server once the store has
 * rehydrated from SecureStore. A token that was valid last time the app was
 * open may have expired or been revoked since — this catches that before
 * the user hits a 401 deep inside some screen.
 */
export function useSessionRestore() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setTenant = useAuthStore((s) => s.setTenant)
  const logout = useAuthStore((s) => s.logout)

  const query = useQuery({
    queryKey: ['session'],
    queryFn: () => authApi.me(),
    enabled: hasHydrated && !!accessToken,
    retry: false,
  })

  useEffect(() => {
    if (query.data?.user) {
      setUser(query.data.user)
      if (query.data.tenant) setTenant(query.data.tenant)
    }
  }, [query.data, setUser, setTenant])

  useEffect(() => {
    if (query.isError && isApiError(query.error) && query.error.status === 401) {
      logout()
    }
  }, [query.isError, query.error, logout])

  return {
    /** True while we don't yet know if the persisted token is still valid. */
    isRestoring: !hasHydrated || (!!accessToken && query.isLoading),
  }
}
