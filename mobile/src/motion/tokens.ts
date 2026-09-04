import { Easing, Platform } from 'react-native'

export const EASE_APPLE = Easing.bezier(0.22, 1, 0.36, 1)

export const MOTION = {
  tap: 120,
  ui: 180,
  page: 280,
  modal: 240,
  tab: 220,
  stagger: 25,
} as const

export const PRESS_SCALE = 0.97

export const nativeDriver = Platform.OS !== 'web'
