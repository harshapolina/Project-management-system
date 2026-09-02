import { useEffect, useRef } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useAuthStore } from '../store/authStore'
import { homePathForUser } from '../utils/roles'
import { landingTabParams } from '../navigation/openProject'
import type { RootDrawerParamList } from '../navigation/types'

/**
 * On first mount after login, send the user to the role-specific home target
 * once (mirrors web homePathForUser routing).
 *
 * Called from MainTabs (drawer screen), so navigation must go through MainTabs
 * rather than targeting tab names on the drawer navigator directly.
 */
export function useRoleLanding(portal: 'staff' | 'admin' = 'staff') {
  const navigation = useNavigation<NavigationProp<RootDrawerParamList>>()
  const user = useAuthStore((s) => s.user)
  const navigated = useRef(false)

  useEffect(() => {
    if (navigated.current || !user) return
    const target = homePathForUser(user, portal)
    if (!target) return
    navigated.current = true
    navigation.navigate('MainTabs', {
      screen: target.tab,
      params: landingTabParams(target),
    } as never)
  }, [user, portal, navigation])
}
