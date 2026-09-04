import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native'
import { EASE_APPLE, MOTION, nativeDriver } from './tokens'
import { useReducedMotion } from './useReducedMotion'

export function FadeIn({
  children,
  delay = 0,
  distance = 6,
  style,
}: {
  children: ReactNode
  delay?: number
  distance?: number
  style?: StyleProp<ViewStyle>
}) {
  const reduced = useReducedMotion()
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current
  const y = useRef(new Animated.Value(reduced ? 0 : distance)).current

  useEffect(() => {
    if (reduced) return
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.ui,
        delay,
        easing: EASE_APPLE,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(y, {
        toValue: 0,
        duration: MOTION.ui,
        delay,
        easing: EASE_APPLE,
        useNativeDriver: nativeDriver,
      }),
    ])
    anim.start()
    return () => anim.stop()
  }, [opacity, y, delay, reduced])

  if (reduced) return <View style={style}>{children}</View>

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: y }] }, style]}>
      {children}
    </Animated.View>
  )
}
