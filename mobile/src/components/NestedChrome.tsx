import type { ReactNode } from 'react'
import { Fragment, useCallback } from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Fab } from './Fab'
import { PageHeader } from './PageHeader'
import { Screen } from './Screen'
import { KeyboardAwareView } from './KeyboardAwareView'
import { LoadingState } from './States'
import { PageEnter } from '../motion/PageEnter'
import { PageScrollView, mergePageScrollProps } from './PageScrollView'
import { useResponsive } from '../theme/useResponsive'
import { smartGoBack } from '../navigation/openProject'
import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import type { SkeletonVariant } from './Skeleton'
import type { Glyph } from '../icons'

/** Apply to ScrollView / FlatList inside chrome shells when not using `scroll` prop. */
export const flexFill = { flex: 1, minHeight: 0 } as const

/** Flex wrapper for kanban boards, split layouts, or custom scroll regions inside NestedChrome. */
export function ChromeFill({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[flexFill, style]}>{children}</View>
}

type NestedChromeProps = {
  title: ReactNode
  subtitle?: string
  subtitleIcon?: Glyph
  onBack?: () => void
  /** When false, never show back (tab roots). When true, always show. Default: auto from stack depth. */
  showBack?: boolean
  right?: ReactNode
  children: ReactNode
  edges?: ('top' | 'right' | 'bottom' | 'left')[]
  keyboardAvoiding?: boolean
  background?: string
  /** Wrap children in ScrollView with standard list padding */
  scroll?: boolean
  contentContainerStyle?: StyleProp<ViewStyle>
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled'
  compactHeader?: boolean
  /** Replace the body with a skeleton until data is ready. */
  loading?: boolean
  loadingVariant?: SkeletonVariant
}

const FIXED_CHROME = new Set(['SegmentedControl', 'ViewPills', 'ProcurementTabs', 'SearchField'])

function componentName(type: unknown): string {
  if (typeof type === 'string') return type
  if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string }
    return fn.displayName || fn.name || ''
  }
  return ''
}

function flattenChildren(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  Children.forEach(children, (child) => {
    if (child == null || child === false) return
    if (isValidElement(child) && child.type === Fragment) {
      out.push(...flattenChildren((child.props as { children?: ReactNode }).children))
    } else {
      out.push(child)
    }
  })
  return out
}

function isScrollableElement(child: React.ReactElement): boolean {
  const type = child.type as { displayName?: string; name?: string }
  return (
    child.type === ScrollView ||
    child.type === FlatList ||
    type?.displayName === 'ScrollView' ||
    type?.displayName === 'FlatList' ||
    type?.name === 'ScrollView' ||
    type?.name === 'FlatList'
  )
}

function viewHasFlex(style: StyleProp<ViewStyle> | undefined): boolean {
  if (!style) return false
  const flat = StyleSheet.flatten(style)
  return flat?.flex === 1 || flat?.flexGrow === 1
}

function shouldFlexFill(child: React.ReactElement, layout: React.ReactElement[]): boolean {
  const prevStyle = (child.props as { style?: StyleProp<ViewStyle> }).style
  if (viewHasFlex(prevStyle)) return true
  if (isScrollableElement(child)) return true
  const name = componentName(child.type)
  if (name === 'LoadingState' || name === 'ErrorState' || name === 'KanbanBoard' || name === 'ChromeFill' || name === 'KeyboardAwareView') {
    return true
  }
  if (child.type === View) {
    if (layout.length === 1) return true
    if (viewHasFlex((child.props as { style?: StyleProp<ViewStyle> }).style)) return true
  }
  const flexCandidates = layout.filter((c) => {
    if (!isValidElement(c)) return false
    const n = componentName(c.type)
    return isScrollableElement(c) || n === 'KanbanBoard' || n === 'LoadingState' || n === 'ErrorState'
  })
  return flexCandidates.length === 1 && flexCandidates[0] === child
}

function isFabElement(child: React.ReactElement): boolean {
  return child.type === Fab
}

/** Assign flex to scroll regions; keep tabs/headers at natural height; pass FABs through. */
function layoutChromeBody(children: ReactNode): ReactNode {
  const flat = flattenChildren(children)
  const layout: React.ReactElement[] = []
  const overlays: React.ReactElement[] = []

  for (const child of flat) {
    if (!isValidElement(child)) continue
    if (isFabElement(child)) overlays.push(child)
    else layout.push(child)
  }

  const laid = layout.map((child) => {
    const prev = child.props as Record<string, unknown> & { style?: StyleProp<ViewStyle> }
    if (shouldFlexFill(child, layout)) {
      const filled = {
        ...prev,
        style: [flexFill, prev.style],
      }
      if (isScrollableElement(child) && !prev.horizontal) {
        return cloneElement(child, mergePageScrollProps(filled) as Record<string, unknown>)
      }
      return cloneElement(child, filled as Record<string, unknown>)
    }
    const name = componentName(child.type)
    if (FIXED_CHROME.has(name)) {
      return cloneElement(child, {
        style: [{ flexShrink: 0 }, prev.style],
      } as Record<string, unknown>)
    }
    return child
  })

  // This array lands in an expression slot, so React needs a key on every
  // element or it warns once per chrome child. Order is the caller's JSX
  // order, so the index is stable.
  return [...laid, ...overlays].map((child, i) =>
    isValidElement(child) && child.key == null
      ? cloneElement(child, { key: `chrome-${i}` })
      : child,
  )
}

function useAutoBack(showBack: boolean | undefined, onBack?: () => void) {
  const navigation = useNavigation()
  const route = useRoute()
  const defaultBack = useCallback(() => {
    smartGoBack(navigation as NavigationProp<ParamListBase>, route)
  }, [navigation, route])

  const canPop = navigation.canGoBack() || navigation.getParent()?.canGoBack()

  if (showBack === false) return undefined
  if (onBack) return onBack
  if (showBack === true || canPop) return defaultBack
  return undefined
}

/**
 * Shared nested-screen chrome: PageHeader with optional back. The global
 * AppNavBar is deliberately absent — it belongs to Home alone, where it blends
 * with the hero; everywhere else the screen's own header is the top chrome.
 * Tab roots pass showBack={false}; pushed screens get back automatically.
 */
export function NestedChrome({
  title,
  subtitle,
  subtitleIcon,
  onBack,
  showBack,
  right,
  children,
  // Includes 'top': AppNavBar used to absorb the status-bar inset for these
  // screens, so with it gone the safe area has to come from the shell itself.
  edges = ['top', 'left', 'right'],
  keyboardAvoiding,
  background,
  scroll,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  compactHeader,
  loading = false,
  loadingVariant = 'list',
}: NestedChromeProps) {
  const { listContent } = useResponsive()
  const resolvedOnBack = useAutoBack(showBack, onBack)

  let body: ReactNode
  if (loading) {
    body = <LoadingState variant={loadingVariant} />
  } else if (scroll) {
    body = (
      <PageScrollView
        style={flexFill}
        contentContainerStyle={[listContent, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </PageScrollView>
    )
  } else {
    body = layoutChromeBody(children)
  }

  return (
    <Screen padded={false} edges={edges} background={background}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        subtitleIcon={subtitleIcon}
        onBack={resolvedOnBack}
        right={right}
        compact={compactHeader}
      />
      {keyboardAvoiding ? (
        <KeyboardAwareView style={styles.body}>
          <PageEnter key={loading ? 'loading' : 'ready'}>{body}</PageEnter>
        </KeyboardAwareView>
      ) : (
        <View style={styles.body}>
          <PageEnter key={loading ? 'loading' : 'ready'}>{body}</PageEnter>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  body: { flex: 1, minHeight: 0, flexDirection: 'column' },
})
