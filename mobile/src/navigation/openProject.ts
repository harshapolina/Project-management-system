import type { NavigationProp, ParamListBase, RouteProp } from '@react-navigation/native'
import type { MoreStackParamList, ProjectStackParamList, RootTabParamList } from './types'

type ProjectParams = { projectId: string; projectName?: string; returnTo?: 'home' }

/**
 * Open a screen inside the Projects tab with a clean stack.
 * When `fromHome` is set, Back returns to Home (not Projects list / overview).
 */
export function openProjectScreen(
  navigation: NavigationProp<RootTabParamList>,
  screen: keyof ProjectStackParamList,
  params?: ProjectParams & Record<string, unknown>,
  opts?: { fromHome?: boolean },
) {
  if (screen === 'ProjectsList' || !params?.projectId) {
    navigation.navigate('Projects', { screen: 'ProjectsList' })
    return
  }

  const projectParams: ProjectParams = {
    projectId: params.projectId,
    projectName: params.projectName,
    ...(opts?.fromHome ? { returnTo: 'home' as const } : null),
  }

  const leafParams = { ...params, ...projectParams }

  if (opts?.fromHome) {
    // Keep ProjectsList under the leaf so the Projects tab isn't stuck on a dead-end screen.
    // Back still jumps to Home via `returnTo`.
    navigation.navigate('Projects', {
      state: {
        routes: [
          { name: 'ProjectsList' as const },
          { name: screen, params: leafParams },
        ],
        index: 1,
      },
    })
    return
  }

  const routes =
    screen === 'ProjectOverview'
      ? [
          { name: 'ProjectsList' as const },
          { name: 'ProjectOverview' as const, params: projectParams },
        ]
      : [
          { name: 'ProjectsList' as const },
          { name: 'ProjectOverview' as const, params: projectParams },
          { name: screen, params: leafParams },
        ]

  navigation.navigate('Projects', {
    state: {
      routes,
      index: routes.length - 1,
    },
  })
}

/** Open a More-tab screen; with `fromHome`, Back returns to Home. */
export function openMoreScreen(
  navigation: NavigationProp<RootTabParamList>,
  screen: keyof MoreStackParamList,
  params?: Record<string, unknown>,
  opts?: { fromHome?: boolean },
) {
  const nextParams = opts?.fromHome ? { ...params, returnTo: 'home' as const } : params

  if (opts?.fromHome) {
    // Keep MoreMain under the leaf so the More tab still has its menu root.
    navigation.navigate('More', {
      state: {
        routes: [
          { name: 'MoreMain' as const },
          { name: screen, params: nextParams },
        ],
        index: 1,
      },
    } as never)
    return
  }

  navigation.navigate('More', { screen, params: nextParams } as never)
}

/** Back within stack, or to Home when opened from a Home shortcut. */
export function goBackOrHome(
  navigation: NavigationProp<ParamListBase>,
  route?: RouteProp<ParamListBase, string>,
) {
  const returnTo = (route?.params as { returnTo?: string } | undefined)?.returnTo
  if (returnTo === 'home') {
    const tab = navigation.getParent()
    // Pop this leaf so the tab root (list / More menu) is ready next time.
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
    if (tab) tab.navigate('Home' as never)
    else navigation.navigate('Home' as never)
    return
  }
  if (navigation.canGoBack()) {
    navigation.goBack()
    return
  }
  const tab = navigation.getParent()
  if (tab) tab.navigate('Home' as never)
}
