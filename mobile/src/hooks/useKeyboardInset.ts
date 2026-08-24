import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

const WEB_BUFFER = 12

/**
 * Bottom inset when the software keyboard is open.
 * RN Web uses visualViewport; native uses Keyboard events.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport
      const update = () => {
        const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        setInset(keyboard > 0 ? keyboard + WEB_BUFFER : 0)
      }
      viewport.addEventListener('resize', update)
      viewport.addEventListener('scroll', update)
      update()
      return () => {
        viewport.removeEventListener('resize', update)
        viewport.removeEventListener('scroll', update)
      }
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, (e) => setInset(e.endCoordinates.height))
    const hideSub = Keyboard.addListener(hideEvent, () => setInset(0))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return inset
}

/** Scroll a focused text field into view (RN Web + mobile browsers). */
export function scrollInputIntoView(target: unknown) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return
  requestAnimationFrame(() => {
    const el = target as HTMLElement | null
    el?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  })
}

export function isKeyboardOpen(inset: number) {
  return inset > 0
}
