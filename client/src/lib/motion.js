import { useReducedMotion } from 'framer-motion'

/** Apple-like cubic-bezier (ease-out-quint-ish). */
export const EASE_APPLE = [0.22, 1, 0.36, 1]

export const DURATION = {
  tap: 0.12,
  ui: 0.18,
  page: 0.28,
  modal: 0.24,
  dropdown: 0.2,
}

export const TRANSITION = {
  tap: { duration: DURATION.tap, ease: EASE_APPLE },
  ui: { duration: DURATION.ui, ease: EASE_APPLE },
  page: { duration: DURATION.page, ease: EASE_APPLE },
  modal: { duration: DURATION.modal, ease: EASE_APPLE },
  dropdown: { duration: DURATION.dropdown, ease: EASE_APPLE },
}

/** Forward: slight right → rest. Back: slight left → rest. */
export const pageVariants = {
  initial: (dir = 1) => ({ opacity: 0, x: dir > 0 ? 10 : -10 }),
  animate: { opacity: 1, x: 0 },
}

export const reducedPageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

export const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
}

export const reducedFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

export const chatContent = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
}

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const modalPanel = {
  initial: { opacity: 0, y: 4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.98 },
}

export const dropdownPanel = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
}

export function useMotion() {
  const reduced = Boolean(useReducedMotion())
  return {
    reduced,
    page: reduced ? reducedPageVariants : pageVariants,
    fadeUp: reduced ? reducedFade : fadeUp,
    chat: reduced ? reducedFade : chatContent,
    modalPanel: reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : modalPanel,
    dropdown: reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : dropdownPanel,
    pageTransition: reduced ? { duration: 0.15 } : TRANSITION.page,
    uiTransition: reduced ? { duration: 0.12 } : TRANSITION.ui,
    modalTransition: reduced ? { duration: 0.15 } : TRANSITION.modal,
    dropdownTransition: reduced ? { duration: 0.12 } : TRANSITION.dropdown,
  }
}

/**
 * Top-level route key so nested project tabs don't replay a page transition.
 */
export function routeTransitionKey(pathname) {
  const parts = (pathname || '/').split('/').filter(Boolean)
  if (!parts.length) return 'home'
  if (parts[0] === 'projects' && parts[1]) return `project:${parts[1]}`
  if (parts[0] === 'boq' && parts[1]) return `boq:${parts[1]}`
  if (parts[0] === 'platform') return parts.slice(0, 2).join('/') || 'platform'
  return parts[0]
}
